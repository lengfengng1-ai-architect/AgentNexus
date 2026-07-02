"""Tests for remaining plan generation agents and workflow.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
"""

import pytest

from app.agents.action_recommendations_agent import run_action_recommendations
from app.config.settings import settings
from app.agents.budget_kpi_agent import run_budget_kpi
from app.agents.execution_planning_agent import run_execution_planning
from app.agents.plan_generator_agent import run_plan_generator
from app.agents.strategy_generation_agent import run_strategy_generation
from app.schemas.plan_generation import (
    ActionRecommendationsOutput,
    BudgetKpiOutput,
    ExecutionOutput,
    PlanGeneratorOutput,
    StrategyOutput,
)
from app.services.workflow_service import reload_workflows, run_workflow


@pytest.fixture(autouse=True)
def use_mock_env(monkeypatch):
    monkeypatch.setattr(settings, "use_mock_data", True)


@pytest.fixture(autouse=True)
def reload_after_env(monkeypatch):
    reload_workflows()


@pytest.mark.asyncio
async def test_run_strategy_generation__mock():
    result = await run_strategy_generation({
        "brand_input": {"brand_name": "Nike", "category": "运动服装", "city": "上海"},
        "market_research": {"market_summary": "市场良好", "trends": [], "opportunities": []},
        "audience_insight": {"persona_summary": "年轻白领", "traits": [], "peak_hours": "周末"},
        "fitness_analysis": {"sport_fitness_scores": [{"sport": "健身", "score": 90, "reason": ""}], "primary_sport": "健身", "secondary_sport": "跑步"},
    })

    output = StrategyOutput.model_validate(result)
    assert output.positioning
    assert output.marketing_goal
    assert len(output.key_messages) > 0


@pytest.mark.asyncio
async def test_run_execution_planning__mock():
    result = await run_execution_planning({
        "brand_input": {"brand_name": "Nike", "category": "运动服装", "city": "上海"},
        "strategy_generation": {"positioning": "连接", "marketing_goal": "目标", "strategy_framework": "4M", "key_messages": ["信息"]},
        "plan_data_query": {"leagues": {"count": 342}, "events": {"monthly": 156}, "influencers": {"count": 568}, "stores": {"count": 89}, "venues": {"count": 234}},
    })

    output = ExecutionOutput.model_validate(result)
    assert output.leagues_plan
    assert output.events_plan
    assert output.influencer_plan
    assert output.content_plan
    assert output.store_plan


@pytest.mark.asyncio
async def test_run_budget_kpi__mock():
    result = await run_budget_kpi({
        "brand_input": {"brand_name": "Nike", "category": "运动服装", "city": "上海", "budget": 200, "period": 3},
        "execution_planning": {"leagues_plan": "", "events_plan": "", "influencer_plan": "", "content_plan": "", "store_plan": ""},
    })

    output = BudgetKpiOutput.model_validate(result)
    assert output.total_budget == 200
    assert output.period_months == 3
    assert len(output.allocations) > 0
    assert sum(a.percentage for a in output.allocations) == pytest.approx(100)


@pytest.mark.asyncio
async def test_run_action_recommendations__mock():
    result = await run_action_recommendations({
        "brand_input": {"brand_name": "Nike", "category": "运动服装", "city": "上海", "budget": 200, "period": 3},
        "strategy_generation": {"positioning": "连接", "marketing_goal": "目标", "strategy_framework": "4M", "key_messages": ["信息"]},
        "fitness_analysis": {"primary_sport": "健身"},
        "budget_kpi": {"kpis": {"曝光量": "500万+"}},
    })

    output = ActionRecommendationsOutput.model_validate(result)
    assert len(output.actions) > 0


@pytest.mark.asyncio
async def test_run_plan_generator__mock():
    result = await run_plan_generator({
        "brand_input": {"brand_name": "Nike", "category": "运动服装", "city": "上海", "budget": 200, "period": 3},
        "market_research": {"market_summary": "", "trends": [], "opportunities": []},
        "audience_insight": {"city": "上海", "sport_index": 92, "top_sports": [], "persona_summary": "", "traits": [], "peak_hours": ""},
        "plan_data_query": {"city": "上海", "population": "", "sport_index": 0, "consumption": "", "weekend_active": "", "leagues": {"count": 0, "top_leagues": [], "avg_members": 0}, "events": {"monthly": 0, "avg_participants": 0, "categories": []}, "influencers": {"count": 0, "tiers": {"supreme": 0, "star": 0, "elite": 0, "influencer": 0}, "avg_quote": ""}, "stores": {"count": 0, "categories": []}, "venues": {"count": 0, "types": [], "capacity": ""}},
        "fitness_analysis": {"category": "", "city": "", "sport_fitness_scores": [], "primary_sport": "", "secondary_sport": ""},
        "strategy_generation": {"positioning": "", "marketing_goal": "", "strategy_framework": "", "key_messages": []},
        "execution_planning": {"leagues_plan": "", "events_plan": "", "influencer_plan": "", "content_plan": "", "store_plan": ""},
        "budget_kpi": {"total_budget": 0, "period_months": 0, "allocations": [], "kpis": {}, "timeline": []},
        "action_recommendations": {"actions": []},
    })

    output = PlanGeneratorOutput.model_validate(result)
    assert len(output.chapters) == 9


@pytest.mark.asyncio
async def test_plan_generation_pipeline__mock():
    result = await run_workflow(
        "plan_generation_pipeline",
        {"brand_input": {"brand_name": "Nike", "category": "运动服装", "city": "上海", "budget": 200, "period": 3}},
    )

    assert result["status"] == "completed"
    assert "plan_generator" in result["outputs"]
    assert len(result["outputs"]["plan_generator"]["chapters"]) == 9
