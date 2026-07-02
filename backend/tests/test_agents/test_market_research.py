"""Tests for market research agent in plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
"""

import pytest

from app.agents.market_research_agent import run_market_research
from app.config.settings import settings
from app.schemas.plan_generation import MarketResearchOutput


@pytest.fixture(autouse=True)
def use_mock_env(monkeypatch):
    monkeypatch.setattr(settings, "use_mock_data", True)


@pytest.mark.asyncio
async def test_run_market_research__mock():
    result = await run_market_research({"brand_name": "Nike", "category": "运动服装"})

    output = MarketResearchOutput.model_validate(result)
    assert output.market_summary
    assert len(output.trends) > 0
    assert len(output.opportunities) > 0


@pytest.mark.asyncio
async def test_run_market_research__missing_inputs():
    with pytest.raises(ValueError, match="Missing required inputs"):
        await run_market_research({"brand_name": "Nike"})


@pytest.mark.asyncio
async def test_run_market_research__from_brand_input():
    result = await run_market_research({
        "brand_input": {"brand_name": "Nike", "category": "运动服装"},
    })
    output = MarketResearchOutput.model_validate(result)
    assert output.market_summary


@pytest.mark.asyncio
async def test_run_market_research__non_mock(monkeypatch):
    """覆盖非 mock 分支和 _build_output 的 dict/list 分支。"""
    monkeypatch.setattr(settings, "use_mock_data", False)
    from unittest.mock import patch
    from app.agents import market_research_agent

    d3 = {"trend_signals": [{"title": "趋势1", "summary": "说明"}]}
    d6 = {"key_opportunities": ["机会1"]}

    with (
        patch.object(market_research_agent, "call_node_define", return_value={}),
        patch.object(market_research_agent, "call_node_size", return_value={}),
        patch.object(market_research_agent, "call_node_trends", return_value=d3),
        patch.object(market_research_agent, "call_node_users", return_value=[]),
        patch.object(market_research_agent, "call_node_competitors", return_value=[]),
        patch.object(market_research_agent, "call_node_assess", return_value=d6),
        patch.object(market_research_agent, "call_node_synthesize", return_value="报告"),
    ):
        result = await run_market_research({"brand_name": "Nike", "category": "运动服装"})
        output = MarketResearchOutput.model_validate(result)
        assert len(output.trends) == 1
        assert len(output.opportunities) == 1
