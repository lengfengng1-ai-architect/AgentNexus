"""Tests for plan data query agent.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
"""

import pytest

from app.agents.plan_data_query_agent import run_plan_data_query
from app.schemas.plan_generation import CityDataOutput
from app.services.data_provider import MockDataProvider, set_data_provider


@pytest.mark.asyncio
async def test_run_plan_data_query__live_from_provider():
    set_data_provider(MockDataProvider())

    result = await run_plan_data_query({"city": "北京"})

    output = CityDataOutput.model_validate(result)
    assert output.city == "北京"
    assert output.sport_index == 89


@pytest.mark.asyncio
async def test_run_plan_data_query__missing_city():
    with pytest.raises(ValueError, match="Missing required input: city"):
        await run_plan_data_query({})
