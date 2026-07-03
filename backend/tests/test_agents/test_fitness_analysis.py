"""Tests for fitness analysis agent.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
"""

import pytest

from app.agents.fitness_analysis_agent import run_fitness_analysis
from app.schemas.plan_generation import FitnessAnalysisOutput


@pytest.mark.asyncio
async def test_run_fitness_analysis__normal():
    result = await run_fitness_analysis({"category": "运动服装", "city": "上海"})

    output = FitnessAnalysisOutput.model_validate(result)
    assert output.category == "运动服装"
    assert output.city == "上海"
    assert any(s.sport == "健身" for s in output.sport_fitness_scores)


@pytest.mark.asyncio
async def test_run_fitness_analysis__missing_inputs():
    with pytest.raises(ValueError, match="Missing required inputs"):
        await run_fitness_analysis({"category": "运动服装"})
