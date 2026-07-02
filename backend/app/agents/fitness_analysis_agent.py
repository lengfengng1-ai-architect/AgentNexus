"""Fitness analysis agent for plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

import json
from pathlib import Path
from typing import Any

from app.agents.registry import register
from app.config.settings import settings
from app.schemas.plan_generation import FitnessAnalysisOutput, SportFitnessScore
from app.services.data_provider import get_data_provider

_MOCK_PATH = Path(__file__).parent.parent.parent / "mock_data" / "plan_fitness_analysis.json"


# Category keyword -> primary sports and reasoning.
CATEGORY_FITNESS_MAP: dict[str, dict[str, Any]] = {
    "跑鞋": {"primary": "跑步", "scores": {"跑步": 95, "健身": 75, "骑行": 60, "篮球": 40}},
    "运动服装": {"primary": "健身", "scores": {"健身": 90, "跑步": 85, "瑜伽": 80, "篮球": 70, "骑行": 65}},
    "瑜伽": {"primary": "瑜伽", "scores": {"瑜伽": 98, "健身": 75, "跑步": 50, "普拉提": 85}},
    "健身": {"primary": "健身", "scores": {"健身": 98, "跑步": 70, "瑜伽": 65, "力量训练": 90}},
    "户外": {"primary": "徒步", "scores": {"徒步": 95, "露营": 90, "骑行": 80, "登山": 85}},
    "篮球": {"primary": "篮球", "scores": {"篮球": 98, "健身": 60, "跑步": 50, "街头篮球": 90}},
    "骑行": {"primary": "骑行", "scores": {"骑行": 98, "公路车": 90, "健身": 55, "跑步": 50}},
    "游泳": {"primary": "游泳", "scores": {"游泳": 98, "健身": 60, "铁人三项": 85}},
}


def _load_mock() -> FitnessAnalysisOutput:
    with _MOCK_PATH.open("r", encoding="utf-8") as f:
        return FitnessAnalysisOutput.model_validate(json.load(f))


def _find_category_key(category: str) -> str | None:
    lowered = category.lower()
    for key in CATEGORY_FITNESS_MAP:
        if key in lowered:
            return key
    return None


def _build_scores(category: str, top_sports: list[str]) -> list[SportFitnessScore]:
    key = _find_category_key(category)
    config = CATEGORY_FITNESS_MAP.get(key, {"primary": top_sports[0] if top_sports else "综合运动", "scores": {}})
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

    if settings.use_mock_data:
        return _load_mock().model_dump()

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
