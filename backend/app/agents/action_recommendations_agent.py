"""Action recommendations agent for plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

from app.agents.llm_utils import write_log,  invoke_json
from app.agents.registry import register
from app.schemas.plan_generation import ActionRecommendationsOutput
from app.utils import parse_budget, parse_period

_PROMPT_DIR = Path(__file__).parent.parent / "prompt_templates"


def _render(name: str, **kw) -> str:
    env = Environment(loader=FileSystemLoader(str(_PROMPT_DIR)))
    return env.get_template(f"{name}.md.j2").render(**kw)


async def run_action_recommendations(state: dict[str, Any]) -> dict[str, Any]:
    """Generate prioritized action recommendations."""
    brand_input = state.get("brand_input") or {}
    strategy = state.get("strategy_generation") or {}
    fitness = state.get("fitness_analysis") or {}
    budget_kpi = state.get("budget_kpi") or {}
    execution = state.get("execution_planning") or {}

    brand_name = brand_input.get("brand_name")
    category = brand_input.get("category")
    city = brand_input.get("city")
    if not all([brand_name, category, city]):
        raise ValueError("Missing required brand inputs")

    # 读取驳回反馈，注入 prompt
    reject_reason = brand_input.get("_reject_reason") or ""
    reject_history = brand_input.get("_reject_history") or []
    reject_history_notes: list[str] = []
    for i, r in enumerate(reject_history, 1):
        reject_history_notes.append(f"第{i}次修改：{r}")
    # 构造带编号的修改历史，每行一条，模板中逐行显示
    reject_reason_all = "\n".join(reject_history_notes) if reject_history_notes else (f"第1次修改：{reject_reason}" if reject_reason else "")

    # 城市达人/盟域/赛事数据（兜底空 dict，模板中用 if 判断）
    city_data = state.get("plan_data_query") or {}

    write_log("action_recommendations", f"📊 正在为 {brand_name} 生成行动建议…")
    if reject_reason_all:
        write_log("action_recommendations", f"📝 用户修改历史：{'; '.join(reject_history_notes) if reject_history_notes else reject_reason}")
    prompt = _render(
        "action_recommendations",
        brand_name=brand_name,
        category=category,
        city=city,
        positioning=strategy.get("positioning", ""),
        marketing_goal=strategy.get("marketing_goal", ""),
        primary_sport=fitness.get("primary_sport", ""),
        budget=parse_budget(brand_input.get("budget")),
        period=parse_period(brand_input.get("period")),
        kpis=budget_kpi.get("kpis", {}),
        city_data=city_data,
        timeline=budget_kpi.get("timeline", []),
        leagues_plan=execution.get("leagues_plan", ""),
        events_plan=execution.get("events_plan", ""),
        influencer_plan=execution.get("influencer_plan", ""),
        content_plan=execution.get("content_plan", ""),
        store_plan=execution.get("store_plan", ""),
        reject_reason=reject_reason_all,
    )

    if reject_reason_all:
        logger.info("[action_recommendations] 用户驳回后完整提示词：\n%s", prompt)

    result = await invoke_json(
        prompt,
        f"请为 {brand_name} 生成行动建议。",
    )
    write_log("action_recommendations", "✓ 行动建议生成完成")
    return ActionRecommendationsOutput.model_validate(result).model_dump()


register("action_recommendations", run_action_recommendations)
