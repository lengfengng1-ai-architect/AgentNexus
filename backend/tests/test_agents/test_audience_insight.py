"""Tests for audience insight agent.

Corresponding OpenSpec: openspec/changes/2026-07-02-audience-insight-agent/design.md
"""

from unittest.mock import AsyncMock, patch

import pytest

from app.agents.audience_insight_agent import run_audience_insight
from app.schemas.audience_insight import AudienceRawData, UserPersona


@pytest.mark.asyncio
async def test_run_audience_insight__mock():
    with patch("app.agents.audience_insight_agent._graph.ainvoke", new_callable=AsyncMock) as mock_ainvoke:
        mock_ainvoke.return_value = {
            "audience_data": AudienceRawData(),
            "persona": UserPersona(),
        }
        audience, persona = await run_audience_insight(product_name="Nike")

    assert isinstance(audience, AudienceRawData)
    assert isinstance(persona, UserPersona)

