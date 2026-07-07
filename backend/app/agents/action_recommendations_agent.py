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

    brand_name = brand_input.get("brand_name")
    category = brand_input.get("category")
    city = brand_input.get("city")
    if not all([brand_name, category, city]):
        raise ValueError("Missing required brand inputs")

    write_log("action_recommendations", f"📊 正在为 {brand_name} 生成行动建议…")
    result = await invoke_json(
        _render(
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
        ),
        f"请为 {brand_name} 生成行动建议。",
    )
    write_log("action_recommendations", "✓ 行动建议生成完成")
    return ActionRecommendationsOutput.model_validate(result).model_dump()


register("action_recommendations", run_action_recommendations)
