"""Budget analysis service — SSE 流式预算评估 + 结果持久化。

Corresponding OpenSpec: docs/api/paths/budget-analysis.yaml
Corresponding in_scope ID: budget-analysis

allocations 用固定模板百分比（plan_budget_kpi 基线）× 用户预算；
KPI 按 base × (budget/200) 比例缩放；一句话建议由 LLM 基于数据生成。
"""
import asyncio
import json
import logging
import re
import uuid
from collections.abc import AsyncGenerator, Callable
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.llm_utils import build_chat_model
from app.agents.tools.event_stream import build_sse_frame, make_emit
from app.schemas.budget_analysis import BudgetAllocation, BudgetAssessmentResult

logger = logging.getLogger(__name__)

_BUDGET_DIR = Path(__file__).parent.parent.parent / "mock_data" / "budget_analysis"
_BUDGET_RESULTS_DIR = _BUDGET_DIR / "results"
_BUDGET_ID_RE = re.compile(r"^ba-[0-9a-f]{8}$")
_PROMPT_DIR = "app/prompt_templates"

# ponytail: 固定模板百分比（来自 plan_budget_kpi 基线）。
# 天花板：不分品类/不按城市调权；升级路径：按 category_fitness / allygo_city_data 调权。
_TEMPLATE_ALLOCATIONS = [
    ("达人合作", 30),
    ("内容制作", 15),
    ("活动执行", 25),
    ("平台投放", 20),
    ("运营资源", 10),
]
_TEMPLATE_BUDGET = 200  # 模板基线预算（万元），KPI 按此缩放
# ponytail: base KPI（来自 plan_budget_kpi 基线），按 budget 比例线性缩放。
_BASE_KPIS = {
    "曝光量": 500,  # 万
    "互动量": 20,  # 万
    "线索数": 1,  # 万
    "转化率": 4,  # %（中位）
}


def save_budget_result(result: BudgetAssessmentResult) -> str:
    """持久化预算评估结果，返回 budget_assessment_id（ba-<8位hex>）。落盘失败仅记日志。"""
    budget_id = f"ba-{uuid.uuid4().hex[:8]}"
    try:
        _BUDGET_RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        (_BUDGET_RESULTS_DIR / f"{budget_id}.json").write_text(
            result.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8"
        )
    except OSError:
        logger.exception("预算评估结果落盘失败 budget_assessment_id=%s", budget_id)
    return budget_id


def get_budget_result(budget_id: str) -> BudgetAssessmentResult | None:
    """按 ID 读取已持久化的预算评估结果；ID 格式非法或文件不存在返回 None。"""
    if not _BUDGET_ID_RE.match(budget_id):
        return None
    path = _BUDGET_RESULTS_DIR / f"{budget_id}.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return BudgetAssessmentResult.model_validate(data)


def compute_allocations(budget: int) -> list[BudgetAllocation]:
    """固定模板百分比 × 用户预算；最后一项取余确保总和精确等于 budget。"""
    items = []
    running = 0
    for i, (cat, pct) in enumerate(_TEMPLATE_ALLOCATIONS):
        if i < len(_TEMPLATE_ALLOCATIONS) - 1:
            amt = round(budget * pct / 100)
            running += amt
        else:
            amt = budget - running  # 末项取余，确保总和精确
        items.append(BudgetAllocation(category=cat, amount=amt, percentage=pct))
    return items


def compute_kpis(budget: int) -> dict[str, str]:
    """base KPI × (budget/模板预算) 比例缩放，格式化为中文可读串。"""
    ratio = budget / _TEMPLATE_BUDGET
    expo = round(_BASE_KPIS["曝光量"] * ratio)
    interact = round(_BASE_KPIS["互动量"] * ratio)
    leads = round(_BASE_KPIS["线索数"] * ratio, 1)
    conv = round(_BASE_KPIS["转化率"] * (ratio ** 0.5), 1)  # ponytail: 转化率按 sqrt 缩放（边际递减）
    return {
        "曝光量": f"{expo}万+",
        "互动量": f"{interact}万+",
        "线索数": f"{leads}万+" if leads >= 1 else f"{int(leads * 10000)}+",
        "转化率": f"{conv}%",
    }


def compute_timeline(period_months: int) -> list[str]:
    """按周期月数生成时间线（复用三阶段叙事，按月均分）。"""
    if period_months <= 0:
        return []
    if period_months == 1:
        return ["第1月：启动达人签约与内容排期，同步启动活动执行与投放"]
    per = max(1, period_months // 3)
    stages = [
        ("筹备期", "完成达人签约、盟域合作洽谈和内容排期"),
        ("爆发期", "启动赛事活动和达人内容投放，积累用户反馈"),
        ("收割期", "放大高转化内容和活动，复盘优化并沉淀可复用打法"),
    ]
    timeline: list[str] = []
    cursor = 1
    for i, (name, desc) in enumerate(stages):
        months = per if i < len(stages) - 1 else max(1, period_months - cursor + 1)
        end = min(cursor + months - 1, period_months)
        rng = f"第{cursor}月" if cursor == end else f"第{cursor}-{end}月"
        timeline.append(f"{rng}（{name}）：{desc}")
        cursor = end + 1
        if cursor > period_months:
            break
    return timeline


async def generate_suggestion(result: BudgetAssessmentResult) -> str:
    """LLM 基于 allocations/KPI 数据生成一句话建议（不编造名称/数据）。"""
    env = Environment(loader=FileSystemLoader(_PROMPT_DIR))
    prompt = env.get_template("budget_suggestion.md.j2").render(
        category=result.category,
        city=result.city,
        total_budget=result.total_budget,
        period_months=result.period_months,
        allocations=[a.model_dump() for a in result.allocations],
        kpis=result.kpis,
    )
    try:
        llm = build_chat_model()
        msg = await llm.ainvoke([
            SystemMessage(content=prompt),
            HumanMessage(content="请生成一句话预算建议。"),
        ])
        text = (msg.content or "").strip().split("\n")[0].strip('"『』「」 ')
        return text or f"{result.allocations[0].category}占比最高（{result.allocations[0].percentage}%），建议优先投入。"
    except Exception:
        logger.exception("预算建议 LLM 生成失败，降级模板")
        top = max(result.allocations, key=lambda a: a.percentage)
        return f"{top.category}占比最高（{top.percentage}%），建议优先投入。"


async def analyze_stream(
    category: str, budget: int, period: int, city: str
) -> AsyncGenerator[str, None]:
    """流式 SSE 预算评估：进度 + result（携带 budget_assessment_id）。"""
    event_queue: asyncio.Queue = asyncio.Queue()
    emit: Callable[[str, dict], None] = make_emit(event_queue)

    async def _run() -> None:
        try:
            emit("progress", {"progress": 25, "stage": "计算预算分配"})
            allocations = compute_allocations(budget)

            emit("progress", {"progress": 50, "stage": "预估 KPI"})
            kpis = compute_kpis(budget)

            emit("progress", {"progress": 70, "stage": "生成时间线"})
            timeline = compute_timeline(period)

            emit("progress", {"progress": 85, "stage": "生成预算建议"})
            result = BudgetAssessmentResult(
                category=category,
                city=city,
                total_budget=budget,
                period_months=period,
                allocations=allocations,
                kpis=kpis,
                timeline=timeline,
                suggestion="",  # 先占位，下一步填充
            )
            result.suggestion = await generate_suggestion(result)

            budget_id = save_budget_result(result)
            emit("progress", {"progress": 100, "stage": "完成"})
            emit("result", {**result.model_dump(), "budget_assessment_id": budget_id})
        except Exception as exc:
            emit("error", {"detail": str(exc), "code": "budget_analysis_error"})
        finally:
            await event_queue.put(None)

    runner = asyncio.create_task(_run())
    try:
        while True:
            raw = await event_queue.get()
            if raw is None:
                break
            yield raw
    finally:
        if not runner.done():
            runner.cancel()
