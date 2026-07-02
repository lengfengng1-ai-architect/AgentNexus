"""Tests for plan data query agent.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
"""

import os

import pytest

from app.agents.plan_data_query_agent import run_plan_data_query
from app.config.settings import settings
from app.schemas.plan_generation import CityDataOutput
from app.services.data_provider import MockDataProvider, set_data_provider


@pytest.fixture(autouse=True)
def use_mock_env(monkeypatch):
    monkeypatch.setattr(settings, "use_mock_data", True)


@pytest.mark.asyncio
async def test_run_plan_data_query__mock():
    result = await run_plan_data_query({"city": "上海"})

    output = CityDataOutput.model_validate(result)
    assert output.city == "上海"
    assert output.sport_index == 92
    assert output.leagues.count == 342
    assert output.influencers.tiers.influencer == 352


@pytest.mark.asyncio
async def test_run_plan_data_query__live_from_provider(monkeypatch):
    monkeypatch.setattr(settings, "use_mock_data", False)
    set_data_provider(MockDataProvider())

    result = await run_plan_data_query({"city": "北京"})

    output = CityDataOutput.model_validate(result)
    assert output.city == "北京"
    assert output.sport_index == 89


@pytest.mark.asyncio
async def test_run_plan_data_query__missing_city():
    with pytest.raises(ValueError, match="Missing required input: city"):
        await run_plan_data_query({})
