"""Data query agent node.

Corresponding OpenSpec: docs/api/paths/intent.yaml
Corresponding in_scope ID: data-query
"""

import logging
from typing import Any

from app.agents.registry import register
from app.schemas.data_query import DataQueryOutput
from app.services.data_provider import get_data_provider

logger = logging.getLogger(__name__)


def _build_summary(city_data: dict[str, Any]) -> dict[str, Any]:
    """Build a concise summary from raw city data."""
    return {
        "leagues": {
            "count": city_data["leagues"]["count"],
            "avg_members": city_data["leagues"]["avg_members"],
            "top_leagues": city_data["leagues"]["top_leagues"][:3],
        },
        "events": {
            "monthly": city_data["events"]["monthly"],
            "avg_participants": city_data["events"]["avg_participants"],
            "categories": city_data["events"]["categories"][:3],
        },
        "influencers": {
            "count": city_data["influencers"]["count"],
            "avg_quote": city_data["influencers"]["avg_quote"],
        },
        "venues": {
            "count": city_data["venues"]["count"],
            "capacity": city_data["venues"]["capacity"],
        },
        "stores": {
            "count": city_data["stores"]["count"],
            "categories": city_data["stores"]["categories"],
        },
        "personas": {
            "age": city_data["personas"]["age"],
            "gender": city_data["personas"]["gender"],
            "traits": city_data["personas"]["traits"],
        },
    }


def _build_reply(city: str, summary: dict[str, Any]) -> str:
    """Build a human-readable reply from summary."""
    return (
        f"已为你查询 **{city}** 的 AllyGo 平台数据：\n\n"
        f"• 盟域资源：{summary['leagues']['count']} 个盟\n"
        f"• 赛事活动：月均 {summary['events']['monthly']} 场\n"
        f"• 达人资源：{summary['influencers']['count']} 位\n"
        f"• 场馆资源：{summary['venues']['count']} 个\n"
        f"• 经营社：{summary['stores']['count']} 家\n\n"
        "需要我基于这些数据生成完整营销方案吗？"
    )


async def run_data_query(state: dict[str, Any]) -> dict[str, Any]:
    """Agent handler for data query.

    Expects state keys:
        - city: str (required)
    """
    city = state.get("city")
    if not city:
        raise ValueError("Missing required input: city")

    provider = get_data_provider()
    city_data = provider.get_city_data(city)

    if city_data is None:
        available = provider.list_cities()
        logger.info("City '%s' not found in mock data, available: %s", city, available)
        return DataQueryOutput(
            city=city,
            reply=f"暂无 {city} 的 mock 数据，当前支持的城市：{', '.join(available)}",
            available_cities=available,
        ).model_dump()

    summary = _build_summary(city_data)
    return DataQueryOutput(
        city=city,
        summary=summary,
        data={city: city_data},
        reply=_build_reply(city, summary),
    ).model_dump()


register("data_query", run_data_query)
