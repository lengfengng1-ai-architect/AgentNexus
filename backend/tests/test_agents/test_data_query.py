"""Tests for data query agent.

Corresponding OpenSpec: openspec/changes/add-intent-recognition-agent/specs/data-query-agent/spec.md
"""

import pytest

from app.agents.data_query_agent import run_data_query
from app.schemas.data_query import DataQueryOutput
from app.services.data_provider import MockDataProvider, set_data_provider


@pytest.fixture(autouse=True)
def reset_provider():
    """Ensure tests use the default mock data provider."""
    set_data_provider(MockDataProvider())


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
