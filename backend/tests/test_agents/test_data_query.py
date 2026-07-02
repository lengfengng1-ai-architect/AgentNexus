"""Tests for data query agent — enhanced with brand dimension routing.

Corresponding OpenSpec: openspec/changes/enhance-data-query-with-brand-dimensions
Corresponding in_scope ID: data-query
"""

import pytest

from app.agents.data_query_agent import run_data_query
from app.schemas.data_query import DataQueryOutput
from app.services.data_provider import MockDataProvider, set_data_provider


@pytest.fixture(autouse=True)
def reset_provider():
    """Ensure tests use the default mock data provider."""
    set_data_provider(MockDataProvider())


# ── Legacy tests (backward compatibility) ──


@pytest.mark.asyncio
async def test_data_query__existing_city__returns_summary():
    result = await run_data_query({"city": "上海"})
    output = DataQueryOutput.model_validate(result)

    assert output.city == "上海"
    assert output.summary["leagues"]["count"] == 342
    assert "盟域资源" in output.reply


@pytest.mark.asyncio
async def test_data_query__missing_city__raises_value_error():
    with pytest.raises(ValueError, match="Missing required input: city"):
        await run_data_query({})


@pytest.mark.asyncio
async def test_data_query__unknown_city__returns_available_cities():
    result = await run_data_query({"city": "深圳"})
    output = DataQueryOutput.model_validate(result)

    assert output.city == "深圳"
    assert output.available_cities
    assert "上海" in output.available_cities
    assert "暂无" in output.reply


# ── Brand dimension routing tests ──


@pytest.mark.asyncio
async def test_data_query__with_brand_category__routes_dimensions():
    """Nike+跑鞋 should route with high priority for 盟域, 达人, 赛事."""
    result = await run_data_query({
        "city": "上海",
        "brand_name": "Nike",
        "category": "跑鞋",
    })
    output = DataQueryOutput.model_validate(result)

    assert output.city == "上海"
    assert "盟域" in output.dimension_priorities
    assert "达人" in output.dimension_priorities
    assert output.dimension_priorities.get("盟域") == "high"
    assert "leagues" in output.summary
    assert "influencers" in output.summary
    assert output.summary.get("influencers", {}).get("priority") == "high"
    assert "(重点)" in output.reply


@pytest.mark.asyncio
async def test_data_query__with_brand_dimensions__leagues_filtered_by_sport_type():
    """Nike+跑鞋 should only return running-related leagues."""
    result = await run_data_query({
        "city": "上海",
        "brand_name": "Nike",
        "category": "跑鞋",
    })
    output = DataQueryOutput.model_validate(result)

    leagues = output.summary.get("leagues", {})
    items = leagues.get("items", [])
    if items:
        sport_types = {l["sport_type"] for l in items}
        assert sport_types.issubset({"跑步", "健身"})


@pytest.mark.asyncio
async def test_data_query__with_brand_dimensions__influencers_tier_filtered():
    """Nike+跑鞋 should filter influencers to 至尊/大师 and 明星/精英."""
    result = await run_data_query({
        "city": "上海",
        "brand_name": "Nike",
        "category": "跑鞋",
    })
    output = DataQueryOutput.model_validate(result)

    influencers = output.summary.get("influencers", {})
    items = influencers.get("items", [])
    if items:
        tiers = {i["tier"] for i in items}
        assert tiers.issubset({"至尊/大师", "明星/精英"})


@pytest.mark.asyncio
async def test_data_query__with_sports_drink__routes_dimensions():
    """宝矿力+运动饮料 should have events and influencers high priority."""
    result = await run_data_query({
        "city": "北京",
        "brand_name": "宝矿力",
        "category": "运动饮料",
    })
    output = DataQueryOutput.model_validate(result)

    assert output.city == "北京"
    assert output.dimension_priorities.get("赛事") == "high"
    assert output.dimension_priorities.get("达人") == "high"
    assert output.dimension_priorities.get("盟域") == "medium"
    assert output.dimension_priorities.get("场馆") == "low"
    assert "(重点)" in output.reply


@pytest.mark.asyncio
async def test_data_query__unknown_brand__falls_back_to_legacy():
    """Unknown brand+category should fall back to legacy summary."""
    result = await run_data_query({
        "city": "成都",
        "brand_name": "UnknownBrand",
        "category": "unknown_category",
    })
    output = DataQueryOutput.model_validate(result)

    assert output.city == "成都"
    assert output.dimension_priorities == {}
    assert output.summary["leagues"]["count"] == 286
    assert "盟域资源" in output.reply


@pytest.mark.asyncio
async def test_data_query__brand_only_no_category__falls_back_to_legacy():
    """Only brand_name without category should fall back (requires both)."""
    result = await run_data_query({
        "city": "上海",
        "brand_name": "Nike",
    })
    output = DataQueryOutput.model_validate(result)

    assert output.dimension_priorities == {}


@pytest.mark.asyncio
async def test_data_query__category_only_no_brand__falls_back_to_legacy():
    """Only category without brand_name should fall back (requires both)."""
    result = await run_data_query({
        "city": "上海",
        "category": "跑鞋",
    })
    output = DataQueryOutput.model_validate(result)

    assert output.dimension_priorities == {}


# ── DataProvider extended method tests ──


def test_mock_data_provider_get_filtered_leagues():
    provider = MockDataProvider()
    result = provider.get_filtered_leagues("上海", sport_type=["跑步"])
    assert len(result) == 3  # 沪跑团、徐汇跑团、静安跑友会
    assert all(l["sport_type"] == "跑步" for l in result)
    assert all(l["city"] == "上海" for l in result)


def test_mock_data_provider_get_filtered_leagues_with_min_members():
    provider = MockDataProvider()
    result = provider.get_filtered_leagues("上海", sport_type=["跑步"], min_members=1000)
    assert all(l["member_count"] >= 1000 for l in result)
    assert result[0]["alliance_name"] == "沪跑团"


def test_mock_data_provider_get_filtered_leagues_sorted():
    provider = MockDataProvider()
    result = provider.get_filtered_leagues("上海", sort_by="member_count", limit=3)
    assert len(result) == 3
    assert result[0]["member_count"] >= result[-1]["member_count"]


def test_mock_data_provider_get_filtered_influencers():
    provider = MockDataProvider()
    result = provider.get_filtered_influencers("上海", tier_filter=["至尊/大师", "明星/精英"])
    assert all(i["tier"] in ("至尊/大师", "明星/精英") for i in result)
    assert all(i["city"] == "上海" for i in result)


def test_mock_data_provider_get_filtered_influencers_by_sport_type():
    provider = MockDataProvider()
    result = provider.get_filtered_influencers("上海", sport_type=["跑步"])
    assert all(i["sport_type"] == "跑步" for i in result)
    assert all(i["city"] == "上海" for i in result)


def test_mock_data_provider_get_filtered_events():
    provider = MockDataProvider()
    result = provider.get_filtered_events("上海")
    assert len(result) > 0
    assert all(e["city"] == "上海" for e in result)


def test_mock_data_provider_get_filtered_events_with_tags():
    provider = MockDataProvider()
    result = provider.get_filtered_events("上海", tags=["马拉松"])
    assert all("马拉松" in e["event_name"] for e in result)


def test_mock_data_provider_get_stores_by_league():
    provider = MockDataProvider()
    result = provider.get_stores_by_league("沪跑团")
    assert len(result) >= 3
    assert all(s["league_name"] == "沪跑团" for s in result)


def test_mock_data_provider_get_stores_by_league_with_type():
    provider = MockDataProvider()
    result = provider.get_stores_by_league("沪跑团", store_type="盟商品")
    assert all(s["store_type"] == "盟商品" for s in result)


def test_mock_data_provider_get_stores_by_city():
    provider = MockDataProvider()
    result = provider.get_stores_by_city("上海")
    assert len(result) >= 9
    assert all(s["city"] == "上海" for s in result)


def test_mock_data_provider_get_brand_dimension_map():
    provider = MockDataProvider()
    mapping = provider.get_brand_dimension_map("Nike", "跑鞋")
    assert mapping is not None
    assert mapping["dimension_focus"]["盟域"]["priority"] == "high"
    assert mapping["dimension_focus"]["达人"]["tier_filter"] == ["至尊/大师", "明星/精英"]


def test_mock_data_provider_get_brand_dimension_map_not_found():
    provider = MockDataProvider()
    mapping = provider.get_brand_dimension_map("Unknown", "unknown")
    assert mapping is None
