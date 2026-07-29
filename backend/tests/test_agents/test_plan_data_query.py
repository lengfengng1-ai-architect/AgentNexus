"""Tests for plan data query agent.

Corresponding OpenSpec: openspec/changes/add-multi-city-linked-plan/specs/plan-generation-pipeline/spec.md
"""

import pytest

from app.agents.plan_data_query_agent import run_plan_data_query
from app.schemas.plan_generation import MultiCityDataOutput
from app.services.data_provider import MockDataProvider, set_data_provider


@pytest.mark.asyncio
async def test_run_plan_data_query__single_city_back_compat():
    """旧调用方仅传 city 时退化为单城，输出仍为 MultiCityDataOutput（长度 1）。"""
    set_data_provider(MockDataProvider())

    result = await run_plan_data_query({"city": "北京"})

    output = MultiCityDataOutput.model_validate(result)
    assert len(output.cities) == 1
    assert output.cities[0].city == "北京"
    assert output.cities[0].sport_index == 89


@pytest.mark.asyncio
async def test_run_plan_data_query__multi_city_preserves_order():
    """多城遍历，顺序与输入一致，主城在首位。"""
    set_data_provider(MockDataProvider())

    result = await run_plan_data_query({"selected_cities": ["北京", "上海"]})

    output = MultiCityDataOutput.model_validate(result)
    assert [c.city for c in output.cities] == ["北京", "上海"]


@pytest.mark.asyncio
async def test_run_plan_data_query__missing_city():
    with pytest.raises(ValueError, match="Missing required input: selected_cities or city"):
        await run_plan_data_query({})
