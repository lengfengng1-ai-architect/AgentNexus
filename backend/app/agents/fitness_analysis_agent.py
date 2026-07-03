"""Fitness analysis agent for plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

import json
from pathlib import Path
from typing import Any

from app.agents.registry import register
from app.schemas.plan_generation import FitnessAnalysisOutput, SportFitnessScore
from app.services.data_provider import get_data_provider

_FITNESS_MAP_PATH = Path(__file__).parent.parent.parent / "mock_data" / "category_fitness.json"


def _load_fitness_map() -> dict[str, dict[str, Any]]:
    try:
        with _FITNESS_MAP_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("categories", {})
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


# ponytail: loaded once at module level; if the JSON is missing, falls back to empty map.
# Upgrade path: load lazily on first call to avoid stale cache during hot reload.
_CATEGORY_FITNESS_MAP: dict[str, dict[str, Any]] = _load_fitness_map()


def _find_category_key(category: str) -> str | None:
    lowered = category.lower()
    for key in _CATEGORY_FITNESS_MAP:
        if key in lowered:
            return key
    return None


def _build_scores(category: str, top_sports: list[str]) -> list[SportFitnessScore]:
    key = _find_category_key(category)
    config = _CATEGORY_FITNESS_MAP.get(key, {"primary": top_sports[0] if top_sports else "综合运动", "scores": {}})
    scores_map = dict(config["scores"])

    # Ensure city top sports are represented.
    for sport in top_sports[:5]:
        if sport not in scores_map:
            scores_map[sport] = 65

    scores = sorted(scores_map.items(), key=lambda x: x[1], reverse=True)
    return [
        SportFitnessScore(
            sport=sport,
            score=min(100, max(0, score)),
            reason=f"{category} 与 {sport} 场景人群需求高度契合，产品功能与使用场景匹配。",
        )
        for sport, score in scores[:5]
    ]


async def run_fitness_analysis(state: dict[str, Any]) -> dict[str, Any]:
    """Analyze brand-sport fitness based on category and city top sports."""
    category = state.get("category") or state.get("brand_input", {}).get("category")
    city = state.get("city") or state.get("brand_input", {}).get("city")
    if not category or not city:
        raise ValueError("Missing required inputs: category and city")

    city_data = get_data_provider().get_city_data(city)
    top_sports = city_data.get("top_sports", []) if city_data else []

    scores = _build_scores(category, top_sports)
    primary = scores[0].sport if scores else ""
    secondary = scores[1].sport if len(scores) > 1 else ""

    return FitnessAnalysisOutput(
        category=category,
        city=city,
        sport_fitness_scores=scores,
        primary_sport=primary,
        secondary_sport=secondary,
    ).model_dump()


register("fitness_analysis", run_fitness_analysis)
