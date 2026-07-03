"""Action recommendations agent for plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

from app.agents.llm_utils import invoke_json
from app.agents.registry import register
from app.schemas.plan_generation import ActionRecommendationsOutput

_PROMPT_DIR = Path(__file__).parent.parent / "prompt_templates"


def _render(name: str, **kw) -> str:
    env = Environment(loader=FileSystemLoader(str(_PROMPT_DIR)))
    return env.get_template(f"{name}.md.j2").render(**kw)


def _parse_budget(value: Any) -> int:
    if isinstance(value, int | float):
        return int(value)
    if isinstance(value, str):
        digits = "".join(c for c in value if c.isdigit() or c == ".")
        return int(float(digits)) if digits else 0
    return 0


def _parse_period(value: Any) -> int:
    if isinstance(value, int | float):
        return int(value)
    if isinstance(value, str):
        digits = "".join(c for c in value if c.isdigit())
        return int(digits) if digits else 3
    return 3


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

    result = invoke_json(
        _render(
            "action_recommendations",
            brand_name=brand_name,
            category=category,
            city=city,
            positioning=strategy.get("positioning", ""),
            marketing_goal=strategy.get("marketing_goal", ""),
            primary_sport=fitness.get("primary_sport", ""),
            budget=_parse_budget(brand_input.get("budget")),
            period=_parse_period(brand_input.get("period")),
            kpis=budget_kpi.get("kpis", {}),
        ),
        f"请为 {brand_name} 生成行动建议。",
    )
    return ActionRecommendationsOutput.model_validate(result).model_dump()


register("action_recommendations", run_action_recommendations)
