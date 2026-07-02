"""Audience insight agent for plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

import json
from pathlib import Path
from typing import Any

from app.agents.registry import register
from app.config.settings import settings
from app.schemas.plan_generation import AudienceInsightOutput
from app.services.data_provider import get_data_provider

_MOCK_PATH = Path(__file__).parent.parent.parent / "mock_data" / "plan_audience_insight.json"


def _load_mock() -> AudienceInsightOutput:
    with _MOCK_PATH.open("r", encoding="utf-8") as f:
        return AudienceInsightOutput.model_validate(json.load(f))


def _build_output(city: str, city_data: dict[str, Any]) -> AudienceInsightOutput:
    personas = city_data.get("personas", {})
    return AudienceInsightOutput(
        city=city,
        sport_index=city_data.get("sport_index", 0),
        top_sports=city_data.get("top_sports", []),
        persona_summary=f"{city} 运动人群以 {personas.get('age', '')} 为主，{personas.get('gender', '')}，具备 {', '.join(personas.get('traits', []))} 等特征。",
        traits=personas.get("traits", []),
        peak_hours=personas.get("peak", ""),
    )


async def run_audience_insight(state: dict[str, Any]) -> dict[str, Any]:
    """Build audience insight from city data."""
    city = state.get("city") or state.get("brand_input", {}).get("city")
    if not city:
        raise ValueError("Missing required input: city")

    if settings.use_mock_data:
        return _load_mock().model_dump()

    city_data = get_data_provider().get_city_data(city)
    if city_data is None:
        raise ValueError(f"No data available for city: {city}")

    return _build_output(city, city_data).model_dump()


register("audience_insight", run_audience_insight)
