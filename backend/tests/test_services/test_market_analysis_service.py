"""Tests for market analysis service."""
from unittest.mock import AsyncMock, patch

import pytest

from app.schemas.market_analysis import MarketResearchResponse, MarketResearchResult


@pytest.mark.asyncio
async def test_analyze_calls_agent():
    """Test that analyze calls research_market."""
    with (
        patch("app.services.market_analysis_service.research_market", new_callable=AsyncMock) as mock_agent,
        patch("app.services.market_analysis_service._load_cache", return_value=None),
    ):
        from app.services.market_analysis_service import analyze

        mock_agent.return_value = MarketResearchResponse(
            result=MarketResearchResult(
                market_name="Test", industry="饮料", category="饮料",
            ),
        )

        result = await analyze(market_name="AllyGo", category="运动饮料")
        mock_agent.assert_called_once()
