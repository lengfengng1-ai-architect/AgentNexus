"""Tests for requirement collector agent.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
"""

import pytest

from app.agents.requirement_collector_agent import run_requirement_collector
from app.config.settings import settings


@pytest.fixture(autouse=True)
def use_mock_env(monkeypatch):
    monkeypatch.setattr(settings, "use_mock_data", True)


@pytest.mark.asyncio
async def test_run_requirement_collector__complete():
    brand_input = {
        "brand_name": "Nike",
        "category": "运动服装",
        "city": "上海",
        "budget": 200,
        "period": 3,
    }
    result = await run_requirement_collector({"brand_input": brand_input})

    assert result["is_complete"] is True
    assert result["missing_fields"] == []
    assert result["brand_input"]["brand_name"] == "Nike"


@pytest.mark.asyncio
async def test_run_requirement_collector__missing_fields():
    brand_input = {"brand_name": "Nike", "city": "上海"}
    result = await run_requirement_collector({"brand_input": brand_input})

    assert result["is_complete"] is False
    assert set(result["missing_fields"]) == {"category", "budget", "period"}


@pytest.mark.asyncio
async def test_run_requirement_collector__empty_strings_count_as_missing():
    brand_input = {
        "brand_name": "",
        "category": "运动服装",
        "city": "上海",
        "budget": 200,
        "period": 3,
    }
    result = await run_requirement_collector({"brand_input": brand_input})

    assert result["is_complete"] is False
    assert "brand_name" in result["missing_fields"]
