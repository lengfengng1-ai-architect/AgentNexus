"""Additional coverage tests for plan generator agents."""
import pytest

from app.agents.action_recommendations_agent import (
    _parse_budget as action_parse_budget,
    _parse_period as action_parse_period,
    run_action_recommendations,
)
from app.agents.budget_kpi_agent import (
    _parse_budget,
    _parse_period,
    run_budget_kpi,
)
from app.agents.plan_generator_agent import run_plan_generator


def test_parse_budget_number():
    assert _parse_budget(200) == 200
    assert _parse_budget(200.5) == 200


def test_parse_budget_string():
    assert _parse_budget("200万元") == 200
    assert _parse_budget("100.5万") == 100


def test_parse_budget_empty():
    assert _parse_budget("") == 0
    assert _parse_budget(None) == 0


def test_parse_period_number():
    assert _parse_period(3) == 3


def test_parse_period_string():
    assert _parse_period("3个月") == 3
    assert _parse_period("12") == 12


def test_parse_period_empty_defaults_to_three():
    assert _parse_period("") == 3
    assert _parse_period(None) == 3


def test_action_parse_budget_empty():
    assert action_parse_budget(None) == 0


def test_action_parse_period_empty():
    assert action_parse_period(None) == 3


@pytest.mark.asyncio
async def test_run_budget_kpi_missing_inputs():
    with pytest.raises(ValueError, match="Missing required brand inputs"):
        await run_budget_kpi({"brand_input": {"brand_name": "Nike"}})


@pytest.mark.asyncio
async def test_run_action_recommendations_missing_inputs():
    with pytest.raises(ValueError, match="Missing required brand inputs"):
        await run_action_recommendations({"brand_input": {"brand_name": "Nike"}})


@pytest.mark.asyncio
async def test_run_plan_generator_missing_inputs():
    with pytest.raises(ValueError, match="Missing required brand inputs"):
        await run_plan_generator({"brand_input": {"brand_name": "Nike"}})
