"""Budget and KPI agent for plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

import json
import logging
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

from app.agents.llm_utils import write_log,  invoke_json
from app.agents.registry import register
from app.schemas.plan_generation import BudgetKpiOutput
from app.utils import parse_budget, parse_period

logger = logging.getLogger(__name__)

_PROMPT_DIR = Path(__file__).parent.parent / "prompt_templates"


def _render(name: str, **kw) -> str:
    env = Environment(loader=FileSystemLoader(str(_PROMPT_DIR)))
    return env.get_template(f"{name}.md.j2").render(**kw)


_DEFAULT_WEIGHTS_PATH = (
    Path(__file__).parent.parent.parent / "mock_data" / "multi_city_budget_weight.json"
)


def _min_weight(cities_count: int) -> float:
    """单城权重下限：≤4 城 10%，5 城放宽至 8%（容纳多城必然的分散）。"""
    return 8.0 if cities_count >= 5 else 10.0


def _load_default_city_weights(cities: list[str]) -> list[dict[str, Any]]:
    """LLM 校验失败时，从 mock 模板按城市数取默认权重，映射到具体城市名。"""
    count = len(cities)
    with _DEFAULT_WEIGHTS_PATH.open("r", encoding="utf-8") as f:
        table = json.load(f).get("weights_by_count", {})
    key = str(count) if str(count) in table else str(min(count, 5))
    weights = table.get(key) or []
    return [
        {
            "city": cities[i],
            "weight": float(w),
            "rationale": "mock 默认权重（LLM 输出校验失败回退）",
        }
        for i, w in enumerate(weights[:count])
    ]


def _validate_city_weights(weights: list[dict[str, Any]], cities: list[str]) -> bool:
    """护栏：覆盖全部城市、和 = 100 ±0.5、每城 ∈ [下限, 70]。"""
    if not weights or len(weights) != len(cities):
        return False
    lo = _min_weight(len(cities))
    total = 0.0
    cities_set = set(cities)
    seen: set[str] = set()
    for w in weights:
        c = w.get("city")
        if not isinstance(c, str) or c not in cities_set or c in seen:
            return False
        seen.add(c)
        pct = w.get("weight")
        if not isinstance(pct, (int, float)):
            return False
        if pct < lo or pct > 70:
            return False
        total += pct
    return abs(total - 100) <= 0.5


async def run_budget_kpi(state: dict[str, Any]) -> dict[str, Any]:
    """Generate budget allocation and KPI forecast."""
    brand_input = state.get("brand_input") or {}
    execution = state.get("execution_planning") or {}

    brand_name = brand_input.get("brand_name")
    category = brand_input.get("category")
    city = brand_input.get("city")
    budget = parse_budget(brand_input.get("budget"))
    period = parse_period(brand_input.get("period"))
    reject_reason = brand_input.get("_reject_reason") or ""
    reject_history = brand_input.get("_reject_history") or []
    # 累积所有历史驳回记录，按次数编号，每次重跑都能看到全部历史
    reject_history_notes: list[str] = []
    for i, r in enumerate(reject_history, 1):
        reject_history_notes.append(f"第{i}次修改：{r}")
    reject_reason_all = "\n".join(reject_history_notes) if reject_history_notes else reject_reason
    if not all([brand_name, category, city]):
        raise ValueError("Missing required brand inputs")

    write_log("budget_kpi", f"📊 正在为 {brand_name} 测算预算分配和 KPI…")
    if reject_reason_all:
        write_log("budget_kpi", f"📝 用户修改历史：{'; '.join(reject_history_notes) if reject_history_notes else reject_reason}")
    cities = [c for c in (brand_input.get("selected_cities") or []) if c] or (
        [city] if city else []
    )
    prompt = _render(
        "budget_kpi",
        brand_name=brand_name,
        category=category,
        city=city,
        cities=cities,
        budget=budget,
        period=period,
        reject_reason=reject_reason_all,
        leagues_plan=execution.get("leagues_plan", ""),
        events_plan=execution.get("events_plan", ""),
        influencer_plan=execution.get("influencer_plan", ""),
        content_plan=execution.get("content_plan", ""),
        store_plan=execution.get("store_plan", ""),
    )

    if reject_reason_all:
        logger.info("[budget_kpi] 用户驳回后完整提示词：\n%s", prompt)

    result = await invoke_json(
        prompt,
        f"请为 {brand_name} 生成预算与 KPI。",
    )
    # 多城联动：校验 LLM 城市权重（和 = 100、单城护栏），失败回退 mock 默认模板
    if len(cities) > 1:
        llm_weights = result.get("city_weights") or []
        if _validate_city_weights(llm_weights, cities):
            write_log(
                "budget_kpi",
                "🏙️ 多城预算权重：" + "、".join(f"{w['city']}{w['weight']}%" for w in llm_weights),
            )
        else:
            result["city_weights"] = _load_default_city_weights(cities)
            write_log("budget_kpi", "🏙️ 城市权重校验失败，已回退默认权重")
            logger.warning("[budget_kpi] city weights validation failed, fell back to mock default")
    # ponytail: LLM 可能在 reject 场景忽略用户输入的预算/周期，
    # 强制覆盖为 parse 后的用户输入值，确保与用户意图一致。
    result["total_budget"] = budget
    result["period_months"] = period
    # 防御：LLM 可能输出浮点数 amount（如 2.5），转为整数
    # 注意：这里只覆盖 allocations 内的 amount，total_budget/period_months 已强制覆盖
    for alloc in result.get("allocations") or []:
        if isinstance(alloc, dict) and "amount" in alloc:
            alloc["amount"] = int(alloc["amount"])
    # ponytail: LLM 给出的分配金额之和可能与 total_budget 不一致，
    # 等比缩放所有 allocations[].amount 使其和等于 total_budget。
    allocs = result.get("allocations", [])
    total_alloc = sum(a.get("amount", 0) for a in allocs)
    if total_alloc > 0 and total_alloc != budget:
        ratio = budget / total_alloc
        for a in allocs:
            adjusted = round(a["amount"] * ratio)
            a["amount"] = max(adjusted, 1)  # 每项至少 1 万
        # 剩余补到占比最大的项
        leftover = budget - sum(a["amount"] for a in allocs)
        if leftover != 0 and allocs:
            allocs.sort(key=lambda x: x["amount"], reverse=True)
            allocs[0]["amount"] += leftover
        # 更新 percentage
        for a in allocs:
            a["percentage"] = round(a["amount"] / budget * 100, 1)
    write_log("budget_kpi", "✓ 预算 KPI 测算完成")
    return BudgetKpiOutput.model_validate(result).model_dump()


register("budget_kpi", run_budget_kpi)
