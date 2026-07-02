"""Data query agent node — enhanced with brand dimension routing.

Corresponding OpenSpec: docs/api/paths/intent.yaml
openspec/changes/enhance-data-query-with-brand-dimensions
Corresponding in_scope ID: data-query
"""

import logging
from typing import Any

from app.agents.registry import register
from app.schemas.data_query import DataQueryOutput
from app.services.data_provider import get_data_provider

logger = logging.getLogger(__name__)

_DIMENSION_NAMES = {
    "leagues": "盟域",
    "events": "赛事",
    "influencers": "达人",
    "stores": "经营社",
    "venues": "场馆",
    "personas": "人群画像",
}


def _build_city_summary(city_data: dict[str, Any]) -> dict[str, Any]:
    """Build a concise summary from raw city data (legacy fallback)."""
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


def _build_legacy_reply(city: str, summary: dict[str, Any]) -> str:
    """Build a human-readable reply from legacy summary."""
    return (
        f"已为你查询 **{city}** 的 AllyGo 平台数据：\n\n"
        f"• 盟域资源：{summary['leagues']['count']} 个盟\n"
        f"• 赛事活动：月均 {summary['events']['monthly']} 场\n"
        f"• 达人资源：{summary['influencers']['count']} 位\n"
        f"• 场馆资源：{summary['venues']['count']} 个\n"
        f"• 经营社：{summary['stores']['count']} 家\n\n"
        "需要我基于这些数据生成完整营销方案吗？"
    )


def _route_dimensions(
    brand_name: str,
    category: str,
    city: str,
) -> tuple[dict[str, Any] | None, dict[str, str]]:
    """根据品牌品类从 brand_dimension_map 路由到各维度，返回 (dimension_results, dimension_priorities)。

    Returns:
        (dimensions, priorities):
          dimensions: dict of dimension_name -> enriched result or None if no map found
          priorities: dict of dimension_name -> priority_level
    """
    provider = get_data_provider()
    mapping = provider.get_brand_dimension_map(brand_name, category)
    if not mapping:
        return None, {}

    focus = mapping["dimension_focus"]
    dimensions: dict[str, Any] = {}
    priorities: dict[str, str] = {}

    for dim_key, config in focus.items():
        # Map Chinese dimension name to English key used in data
        dim_en = _chinese_to_en_key(dim_key)
        if not dim_en:
            continue

        priority = config.get("priority", "low")
        priorities[dim_key] = priority
        tags = config.get("match_tags", [])
        tier_filter = config.get("tier_filter")

        if dim_en == "leagues":
            sport_type_tags = _seniority_to_sport_types(tags) if isinstance(tags, list) else None
            items = provider.get_filtered_leagues(
                city, sport_type=sport_type_tags or tags, limit=10
            )
            dimensions[dim_key] = {
                "items": items,
                "total": len(items),
                "priority": priority,
            }
        elif dim_en == "influencers":
            items = provider.get_filtered_influencers(
                city, tier_filter=tier_filter, limit=10
            )
            dimensions[dim_key] = {
                "items": items,
                "total": len(items),
                "priority": priority,
            }
        elif dim_en == "events":
            items = provider.get_filtered_events(city, tags=tags, limit=10)
            dimensions[dim_key] = {
                "items": items,
                "total": len(items),
                "priority": priority,
            }
        elif dim_en == "stores":
            items = provider.get_stores_by_city(city, tag_filter=tags) if tags else provider.get_stores_by_city(city)
            dimensions[dim_key] = {
                "items": items,
                "total": len(items),
                "priority": priority,
            }
        elif dim_en == "venues":
            dimensions[dim_key] = {
                "priority": priority,
            }
        elif dim_en == "personas":
            city_data = provider.get_city_data(city)
            personas = city_data.get("personas", {}) if city_data else {}
            dimensions[dim_key] = {
                "personas": personas,
                "priority": priority,
            }

    return dimensions, priorities


def _chinese_to_en_key(chinese: str) -> str | None:
    """Map Chinese dimension name to English key used internally."""
    mapping = {
        "盟域": "leagues",
        "赛事": "events",
        "达人": "influencers",
        "经营社": "stores",
        "场馆": "venues",
        "人群画像": "personas",
    }
    return mapping.get(chinese)


def _seniority_to_sport_types(tags: list[str]) -> list[str]:
    """Map common match_tags to sport_type values used in allygo data.

    ponytail: simple mapping table for MVP. Upgrade to config-driven mapping when
    sport_type values expand.
    """
    sport_map = {
        "跑步": "跑步",
        "篮球": "篮球",
        "瑜伽": "瑜伽",
        "骑行": "骑行",
        "健身": "健身",
        "羽毛球": "羽毛球",
        "乒乓球": "乒乓球",
        "滑雪": "滑雪",
        "网球": "网球",
        "足球": "足球",
    }
    return [sport_map[t] for t in tags if t in sport_map]


def _build_prioritized_summary(dimensions: dict[str, Any], priorities: dict[str, str], city_data: dict[str, Any]) -> dict[str, Any]:
    """Build an enriched summary from dimension routing results."""
    summary: dict[str, Any] = {}

    for dim_key, dim_result in dimensions.items():
        priority = dim_result.get("priority", "low")
        dim_en = _chinese_to_en_key(dim_key)

        if dim_en == "leagues" and dim_result.get("items"):
            items = dim_result["items"]
            summary["leagues"] = {
                "count": len(items),
                "items": items,
                "priority": priority,
                "top_alliances": [l["alliance_name"] for l in items[:5]],
            }
        elif dim_en == "influencers" and dim_result.get("items"):
            items = dim_result["items"]
            summary["influencers"] = {
                "count": len(items),
                "items": items,
                "priority": priority,
                "top_tiers": sorted(set(i["tier"] for i in items)),
            }
        elif dim_en == "events" and dim_result.get("items"):
            items = dim_result["items"]
            summary["events"] = {
                "count": len(items),
                "items": items,
                "priority": priority,
            }
        elif dim_en == "stores" and dim_result.get("items"):
            items = dim_result["items"]
            summary["stores"] = {
                "count": len(items),
                "items": items,
                "priority": priority,
            }
        elif dim_en == "venues":
            summary["venues"] = {"priority": priority}
        elif dim_en == "personas" and dim_result.get("personas"):
            summary["personas"] = {
                **dim_result["personas"],
                "priority": priority,
            }

    return summary


def _build_smart_reply(city: str, priorities: dict[str, str], dimensions: dict[str, Any]) -> str:
    """Build a smart reply based on dimension priorities."""
    parts = [f"已为你查询 **{city}** 的 AllyGo 平台数据：\n"]

    high_dims = [k for k, v in priorities.items() if v == "high"]

    for dim_key, priority in sorted(priorities.items(), key=lambda x: {"high": 0, "medium": 1, "low": 2}[x[1]]):
        dim_en = _chinese_to_en_key(dim_key)
        dim_result = dimensions.get(dim_key, {})
        items = dim_result.get("items", [])
        if priority == "high":
            if dim_en == "leagues" and items:
                names = [l["alliance_name"] for l in items[:3]]
                parts.append(f"• {dim_key} (重点)：{len(items)} 个相关盟 — {'、'.join(names)} 等")
            elif dim_en == "influencers" and items:
                tiers = sorted(set(i["tier"] for i in items))
                parts.append(f"• {dim_key} (重点)：{len(items)} 位推荐达人 — 等级含 {'/'.join(tiers)}")
            elif dim_en == "events" and items:
                names = [e["event_name"] for e in items[:3]]
                parts.append(f"• {dim_key} (重点)：{len(items)} 个匹配赛事 — {'、'.join(names)} 等")
            elif dim_en == "stores" and items:
                types = sorted(set(s["store_type"] for s in items))
                parts.append(f"• {dim_key} (重点)：{len(items)} 个经营社商品/服务 — 含 {'/'.join(types)}")
            else:
                parts.append(f"• {dim_key} (重点)：数据已就绪")
        elif priority == "medium":
            total = dim_result.get("total", 0) or (len(items) if items else 0)
            parts.append(f"• {dim_key}：{total} 条相关数据")
        else:
            parts.append(f"• {dim_key}：基础数据可用")

    parts.append(f"\n需要基于这些数据生成营销方案吗？")
    return "\n".join(parts)


async def run_data_query(state: dict[str, Any]) -> dict[str, Any]:
    """Agent handler for data query with brand dimension routing.

    Expects state keys:
        - city: str (required)
        - brand_name: str | None (optional, for dimension routing)
        - category: str | None (optional, for dimension routing)
        - budget: int | None (optional, reserved for future use)
        - period: int | None (optional, reserved for future use)
        - audience_profile: dict | None (optional, reserved for future audience insight)
    """
    city = state.get("city")
    if not city:
        raise ValueError("Missing required input: city")

    brand_name = state.get("brand_name")
    category = state.get("category")

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

    # Try brand dimension routing if brand_name and category are provided
    if brand_name and category:
        logger.info("Attempting dimension routing for brand='%s', category='%s'", brand_name, category)
        dimensions, priorities = _route_dimensions(brand_name, category, city)

        if dimensions is not None:
            # Brand dimension map found — use enriched output
            summary = _build_prioritized_summary(dimensions, priorities, city_data)
            reply = _build_smart_reply(city, priorities, dimensions)
            logger.info("Dimension routing applied for brand='%s', category='%s'", brand_name, category)

            return DataQueryOutput(
                city=city,
                summary=summary,
                data={city: city_data},
                reply=reply,
                dimension_priorities=priorities,
            ).model_dump()

    # Fallback: legacy behavior without dimension routing
    logger.info("No brand dimension map found for brand='%s', category='%s', using legacy fallback", brand_name, category)
    summary = _build_city_summary(city_data)
    return DataQueryOutput(
        city=city,
        summary=summary,
        data={city: city_data},
        reply=_build_legacy_reply(city, summary),
    ).model_dump()


register("data_query", run_data_query)
