"""测试人群洞察 Agent。"""

from unittest.mock import AsyncMock, patch

import pytest

from app.agents.audience_insight_agent import State


@pytest.mark.asyncio
async def test_agent_returns_audience_and_persona():
    """Agent 返回人群数据和用户画像。"""
    from app.agents.audience_insight_agent import run_audience_insight
    from app.schemas.audience_insight import AudienceRawData, UserPersona

    with patch("app.agents.audience_insight_agent._graph") as mock:
        mock.ainvoke = AsyncMock(return_value={
            "audience_data": AudienceRawData(),
            "persona": UserPersona(),
        })
        audience, persona = await run_audience_insight("Test Product")
        assert isinstance(audience, AudienceRawData)
        assert isinstance(persona, UserPersona)
        mock.ainvoke.assert_awaited_once()


@pytest.mark.asyncio
async def test_agent_raises_on_none():
    """Agent 返回 None 时抛出 ValueError。"""
    from app.agents.audience_insight_agent import run_audience_insight

    with patch("app.agents.audience_insight_agent._graph") as mock:
        mock.ainvoke = AsyncMock(return_value={"audience_data": None, "persona": None})
        with pytest.raises(ValueError, match="did not return"):
            await run_audience_insight("Test")
