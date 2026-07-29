"""Data query agent for plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

from typing import Any

from app.agents.registry import register
from app.schemas.plan_generation import (
    CityDataOutput,
    MultiCityDataOutput,
    CooperationCenterData,
    CooperationCenterItem,
    EventData,
    GroupBuyData,
    GroupBuyItem,
    InfluencerData,
    InfluencerTiers,
    LeaderboardData,
    LeagueData,
    SaleData,
    SaleItem,
    StoreData,
    TournamentData,
    TournamentItem,
    TrophyData,
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
    tournament_raw = data.get("tournament", {})
    trophy_raw = data.get("trophy", {})
    cooperation_raw = data.get("cooperation_center", {})
    leaderboard_raw = data.get("leaderboard", {})
    group_buy_raw = data.get("group_buy", {})
    sale_raw = data.get("sale", {})

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
        tournament=_build_tournament(tournament_raw),
        trophy=_build_trophy(trophy_raw),
        cooperation_center=_build_cooperation(cooperation_raw),
        leaderboard=_build_leaderboard(leaderboard_raw),
        group_buy=_build_group_buy(group_buy_raw),
        sale=_build_sale(sale_raw),
    )


def _build_tournament(raw: dict[str, Any]) -> TournamentData:
    return TournamentData(
        available_tournaments=[
            TournamentItem(
                name=i.get("name", ""),
                sport_type=i.get("sport_type", ""),
                scale=i.get("scale", ""),
                frequency=i.get("frequency", ""),
                available_cities=i.get("available_cities", []),
                trophy_customization=i.get("trophy_customization", False),
                sponsorship_options=i.get("sponsorship_options", []),
            )
            for i in raw.get("available_tournaments", [])
        ],
    )


def _build_trophy(raw: dict[str, Any]) -> TrophyData:
    return TrophyData(
        trophy_types=raw.get("trophy_types", []),
        avg_lead_time_days=raw.get("avg_lead_time_days", 15),
    )


def _build_cooperation(raw: dict[str, Any]) -> CooperationCenterData:
    return CooperationCenterData(
        recruitments=[
            CooperationCenterItem(
                title=r.get("title", ""),
                type=r.get("type", ""),
                target_count=r.get("target_count", 0),
                requirements=r.get("requirements", []),
            )
            for r in raw.get("recruitments", [])
        ],
    )


def _build_leaderboard(raw: dict[str, Any]) -> LeaderboardData:
    return LeaderboardData(
        available=raw.get("available", True),
        leaderboard_types=raw.get("leaderboard_types", []),
        reward_mechanism=raw.get("reward_mechanism", ""),
    )


def _build_group_buy(raw: dict[str, Any]) -> GroupBuyData:
    return GroupBuyData(
        available_types=[
            GroupBuyItem(
                type=p.get("type", ""),
                description=p.get("description", ""),
                min_participants=p.get("min_participants", 2),
                platform_close=p.get("platform_close", True),
            )
            for p in raw.get("available_types", [])
        ],
    )


def _build_sale(raw: dict[str, Any]) -> SaleData:
    return SaleData(
        available_types=[
            SaleItem(
                type=p.get("type", ""),
                description=p.get("description", ""),
                platform_close=p.get("platform_close", True),
            )
            for p in raw.get("available_types", [])
        ],
        platform_commission_rate=raw.get("platform_commission_rate", ""),
        settlement_cycle=raw.get("settlement_cycle", ""),
    )


async def run_plan_data_query(state: dict[str, Any]) -> dict[str, Any]:
    """Query city-level AllyGo data for plan generation (multi-city).

    多城联动：优先读 selected_cities 数组；为空时退化为主城 city 单城，
    保持向后兼容。各城按输入顺序聚合为 MultiCityDataOutput，主城在首位。
    """
    brand_input = state.get("brand_input") or {}
    cities = state.get("selected_cities") or brand_input.get("selected_cities") or []
    cities = [c for c in cities if c]
    if not cities:
        # ponytail: 单城回退——旧调用方仅传 city，保持等价行为
        city = state.get("city") or brand_input.get("city")
        if city:
            cities = [city]
    if not cities:
        raise ValueError("Missing required input: selected_cities or city")

    provider = get_data_provider()
    available = provider.list_cities()
    city_outputs: list[CityDataOutput] = []
    for c in cities:
        city_data = provider.get_city_data(c)
        if city_data is None:
            raise ValueError(
                f"No data for city {c}. Available: {', '.join(available)}"
            )
        city_outputs.append(_build_output(c, city_data))

    return MultiCityDataOutput(cities=city_outputs).model_dump()


register("plan_data_query", run_plan_data_query)
