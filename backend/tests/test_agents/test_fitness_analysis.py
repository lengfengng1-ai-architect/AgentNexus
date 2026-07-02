"""Tests for fitness analysis agent.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
"""

import pytest

from app.agents.fitness_analysis_agent import run_fitness_analysis
from app.config.settings import settings
from app.schemas.plan_generation import FitnessAnalysisOutput


@pytest.fixture(autouse=True)
def use_mock_env(monkeypatch):
    monkeypatch.setattr(settings, "use_mock_data", True)


@pytest.mark.asyncio
async def test_run_fitness_analysis__mock():
    result = await run_fitness_analysis({"category": "运动服装", "city": "上海"})

    output = FitnessAnalysisOutput.model_validate(result)
    assert output.category == "运动服装"
    assert output.city == "上海"
    assert output.primary_sport == "健身"
    assert any(s.sport == "跑步" for s in output.sport_fitness_scores)


@pytest.mark.asyncio
async def test_run_fitness_analysis__unknown_category(monkeypatch):
    monkeypatch.setattr(settings, "use_mock_data", False)
    result = await run_fitness_analysis({"category": "外星人饮料", "city": "上海"})

    output = FitnessAnalysisOutput.model_validate(result)
    assert output.primary_sport != ""
    assert len(output.sport_fitness_scores) > 0


@pytest.mark.asyncio
async def test_run_fitness_analysis__missing_inputs():
    with pytest.raises(ValueError, match="Missing required inputs"):
        await run_fitness_analysis({"category": "运动服装"})
