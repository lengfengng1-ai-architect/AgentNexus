"""Plan generator agent for plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

import json
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

from app.agents.llm_utils import invoke_json
from app.agents.registry import register
from app.schemas.plan_generation import PlanChapter, PlanGeneratorOutput

_PROMPT_DIR = Path(__file__).parent.parent / "prompt_templates"


def _render(name: str, **kw) -> str:
    env = Environment(loader=FileSystemLoader(str(_PROMPT_DIR)))
    return env.get_template(f"{name}.md.j2").render(**kw)


def _serialize(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


async def run_plan_generator(state: dict[str, Any]) -> dict[str, Any]:
    """Aggregate upstream outputs into a 9-chapter marketing plan."""
    brand_input = state.get("brand_input") or {}
    brand_name = brand_input.get("brand_name")
    category = brand_input.get("category")
    city = brand_input.get("city")
    if not all([brand_name, category, city]):
        raise ValueError("Missing required brand inputs")

    result = invoke_json(
        _render(
            "plan_generator",
            brand_name=brand_name,
            category=category,
            city=city,
            budget=brand_input.get("budget", ""),
            period=brand_input.get("period", ""),
            market_research=_serialize(state.get("market_research", {})),
            audience_insight=_serialize(state.get("audience_insight", {})),
            city_data=_serialize(state.get("plan_data_query", {})),
            fitness_analysis=_serialize(state.get("fitness_analysis", {})),
            strategy=_serialize(state.get("strategy_generation", {})),
            execution=_serialize(state.get("execution_planning", {})),
            budget_kpi=_serialize(state.get("budget_kpi", {})),
            action_recommendations=_serialize(state.get("action_recommendations", {})),
        ),
        f"请为 {brand_name} 整合生成完整营销方案。",
    )

    chapters = [
        PlanChapter.model_validate(ch) for ch in result.get("chapters", [])
    ]
    if len(chapters) != 9:
        raise ValueError(f"Plan generator must produce exactly 9 chapters, got {len(chapters)}")

    return PlanGeneratorOutput(chapters=chapters).model_dump()


register("plan_generator", run_plan_generator)
