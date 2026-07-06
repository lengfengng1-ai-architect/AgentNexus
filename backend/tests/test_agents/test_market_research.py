"""Tests for market research agent in plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
"""

from unittest.mock import patch

import pytest

from app.agents.market_research_agent import run_market_research
from app.schemas.plan_generation import MarketResearchOutput


@pytest.mark.asyncio
async def test_run_market_research__missing_inputs():
    with pytest.raises(ValueError, match="Missing required inputs"):
        await run_market_research({"brand_name": "Nike"})


@pytest.mark.asyncio
async def test_run_market_research__non_mock():
    from app.agents import market_research_agent
    from unittest.mock import AsyncMock

    d3 = {"trend_signals": [{"title": "趋势1", "summary": "说明"}]}
    d6 = {"key_opportunities": ["机会1"]}

    mock_def = AsyncMock(return_value={})
    mock_sz = AsyncMock(return_value={})
    mock_tr = AsyncMock(return_value=d3)
    mock_us = AsyncMock(return_value=[])
    mock_cp = AsyncMock(return_value=[])
    mock_as = AsyncMock(return_value=d6)
    mock_sy = AsyncMock(return_value="报告")

    with (
        patch.object(market_research_agent, "call_node_define", mock_def),
        patch.object(market_research_agent, "call_node_size", mock_sz),
        patch.object(market_research_agent, "call_node_trends", mock_tr),
        patch.object(market_research_agent, "call_node_users", mock_us),
        patch.object(market_research_agent, "call_node_competitors", mock_cp),
        patch.object(market_research_agent, "call_node_assess", mock_as),
        patch.object(market_research_agent, "call_node_synthesize", mock_sy),
    ):
        result = await run_market_research({"brand_name": "Nike", "category": "运动服装"})
        output = MarketResearchOutput.model_validate(result)
        assert len(output.trends) == 1
        assert len(output.opportunities) == 1
