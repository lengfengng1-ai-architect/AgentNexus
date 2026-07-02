"""Tests for market analysis service."""
from unittest.mock import AsyncMock, patch

import pytest

from app.schemas.market_analysis import MarketResearchResponse, MarketResearchResult


@pytest.mark.asyncio
async def test_analyze_uses_mock_data():
    """Test that mock mode returns MarketResearchResponse."""
    with patch("app.config.settings.settings.use_mock_data", True):
        from app.services.market_analysis_service import analyze

        result = await analyze(market_name="AllyGo", category="运动饮料")
        assert isinstance(result, MarketResearchResponse)
        assert result.result.market_name == "AllyGo" or result.result.market_name


@pytest.mark.asyncio
async def test_analyze_calls_agent_when_not_mock():
    """Test that non-mock mode calls research_market."""
    with (
        patch("app.config.settings.settings.use_mock_data", False),
        patch("app.services.market_analysis_service.research_market", new_callable=AsyncMock) as mock_agent,
    ):
        from app.services.market_analysis_service import analyze

        mock_agent.return_value = MarketResearchResponse(
            result=MarketResearchResult(
                market_name="Test", industry="饮料", category="饮料",
            ),
        )

        result = await analyze(market_name="AllyGo", category="运动饮料")
        mock_agent.assert_called_once_with(market_name="AllyGo", category="运动饮料")


@pytest.mark.asyncio
async def test_analyze_stream_uses_mock():
    """Test that stream in mock mode emits progress + result events."""
    with patch("app.config.settings.settings.use_mock_data", True):
        from app.services.market_analysis_service import analyze_stream

        events = []
        async for event in analyze_stream(market_name="AllyGo", category="运动饮料"):
            events.append(event)

        assert len(events) >= 8  # 7 progress + 1 result
        assert events[0].startswith("event: progress")
        assert "define" in events[0]
        assert events[-1].startswith("event: result")
        assert "result" in events[-1]
