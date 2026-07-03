"""Strategy generation agent for plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

import json
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

from app.agents.llm_utils import invoke_json
from app.agents.registry import register
from app.schemas.plan_generation import StrategyOutput

_PROMPT_DIR = Path(__file__).parent.parent / "prompt_templates"


def _render(name: str, **kw) -> str:
    env = Environment(loader=FileSystemLoader(str(_PROMPT_DIR)))
    return env.get_template(f"{name}.md.j2").render(**kw)


def _fitness_scores_text(fitness: dict[str, Any]) -> str:
    scores = fitness.get("sport_fitness_scores", [])
    return "; ".join(
        f"{s.get('sport')} {s.get('score')}分"
        for s in scores
    )


async def run_strategy_generation(state: dict[str, Any]) -> dict[str, Any]:
    """Generate core strategy for the brand."""
    brand_input = state.get("brand_input") or {}
    market = state.get("market_research") or {}
    audience = state.get("audience_insight") or {}
    fitness = state.get("fitness_analysis") or {}

    brand_name = brand_input.get("brand_name")
    category = brand_input.get("category")
    city = brand_input.get("city")
    if not all([brand_name, category, city]):
        raise ValueError("Missing required brand inputs")

    result = invoke_json(
        _render(
            "strategy_generation",
            brand_name=brand_name,
            category=category,
            city=city,
            primary_sport=fitness.get("primary_sport", ""),
            secondary_sport=fitness.get("secondary_sport", ""),
            market_summary=market.get("market_summary", ""),
            persona_summary=audience.get("persona_summary", ""),
            fitness_scores=_fitness_scores_text(fitness),
        ),
        f"请为 {brand_name} 生成营销策略。",
    )
    return StrategyOutput.model_validate(result).model_dump()


register("strategy_generation", run_strategy_generation)
