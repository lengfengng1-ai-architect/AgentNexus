"""Data query agent for plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

from typing import Any

from app.agents.registry import register
from app.schemas.plan_generation import (
    CityDataOutput,
    EventData,
    InfluencerData,
    InfluencerTiers,
    LeagueData,
    StoreData,
    VenueData,
)
from app.services.data_provider import get_data_provider


def _build_output(city: str, data: dict[str, Any]) -> CityDataOutput:
    leagues = data.get("leagues", {})
    events = data.get("events", {})
    influencers = data.get("influencers", {})
    tiers = influencers.get("tiers", {})
    stores = data.get("stores", {})
    venues = data.get("venues", {})

    return CityDataOutput(
        city=city,
        population=data.get("population", ""),
        sport_index=data.get("sport_index", 0),
        consumption=data.get("consumption", ""),
        weekend_active=data.get("weekend_active", ""),
        leagues=LeagueData(
            count=leagues.get("count", 0),
            top_leagues=leagues.get("top_leagues", []),
            avg_members=leagues.get("avg_members", 0),
        ),
        events=EventData(
            monthly=events.get("monthly", 0),
            avg_participants=events.get("avg_participants", 0),
            categories=events.get("categories", []),
        ),
        influencers=InfluencerData(
            count=influencers.get("count", 0),
            tiers=InfluencerTiers(
                supreme=tiers.get("至尊/大师", 0),
                star=tiers.get("明星/精英", 0),
                elite=tiers.get("健将", 0),
                influencer=tiers.get("达人", 0),
            ),
            avg_quote=influencers.get("avg_quote", ""),
        ),
        stores=StoreData(
            count=stores.get("count", 0),
            categories=stores.get("categories", []),
        ),
        venues=VenueData(
            count=venues.get("count", 0),
            types=venues.get("types", []),
            capacity=venues.get("capacity", ""),
        ),
    )


async def run_plan_data_query(state: dict[str, Any]) -> dict[str, Any]:
    """Query city-level AllyGo data for plan generation."""
    city = state.get("city") or state.get("brand_input", {}).get("city")
    if not city:
        raise ValueError("Missing required input: city")

    city_data = get_data_provider().get_city_data(city)
    if city_data is None:
        available = get_data_provider().list_cities()
        raise ValueError(f"No data for city {city}. Available: {', '.join(available)}")

    return _build_output(city, city_data).model_dump()


register("plan_data_query", run_plan_data_query)
