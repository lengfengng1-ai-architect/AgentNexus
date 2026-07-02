"""Tests for audience insight agent.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
"""

import pytest

from app.agents.audience_insight_agent import run_audience_insight
from app.config.settings import settings
from app.schemas.plan_generation import AudienceInsightOutput


@pytest.fixture(autouse=True)
def use_mock_env(monkeypatch):
    monkeypatch.setattr(settings, "use_mock_data", True)


@pytest.mark.asyncio
async def test_run_audience_insight__mock():
    result = await run_audience_insight({"city": "上海"})

    output = AudienceInsightOutput.model_validate(result)
    assert output.city == "上海"
    assert output.sport_index == 92
    assert "注重健康" in output.traits


@pytest.mark.asyncio
async def test_run_audience_insight__missing_city():
    with pytest.raises(ValueError, match="Missing required input: city"):
        await run_audience_insight({})
