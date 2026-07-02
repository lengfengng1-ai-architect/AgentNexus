"""Tests for market analysis agent."""
from unittest.mock import patch

import pytest

from app.schemas.market_analysis import (
    CompetitorItem,
    MarketResearchResponse,
    MarketResearchResult,
)


@pytest.fixture
def sample_d1() -> dict:
    return {
        "included_scope": ["现制冰美式"],
        "excluded_scope": ["热美式"],
        "upstream": ["咖啡豆"],
        "downstream": ["门店"],
        "substitute_solutions": ["冷萃"],
        "definition_notes": "冰美式定义",
    }


@pytest.fixture
def sample_d2() -> dict:
    return {
        "tam": {"value": 1000, "year": 2024, "calculation_method": "推算", "confidence_level": "medium"},
        "sam": {"value": 500, "year": 2024, "calculation_method": "推算", "confidence_level": "medium"},
        "som": {"value": 200, "year": 2024, "calculation_method": "推算", "confidence_level": "low"},
        "cagr": 0.2, "cagr_period": "2021-2026", "cagr_confidence": "medium",
        "conflict_notes": "",
    }


@pytest.fixture
def sample_d3() -> list:
    return [
        {"signal_type": "消费行为", "title": "趋势1", "summary": "说明", "impact": "positive",
         "confidence_level": "high", "evidence_ids": []},
    ]


@pytest.fixture
def sample_d4() -> list:
    return [
        {"segment_name": "白领", "user_profile": "画像", "core_scenarios": ["通勤"],
         "pain_points": ["排队"], "purchase_drivers": ["便宜"], "purchase_barriers": ["远"],
         "willingness_to_pay": "10元", "evidence_ids": []},
    ]


@pytest.fixture
def sample_d5() -> list:
    return [
        {"company_name": "瑞幸", "brand": "瑞幸", "product_or_service": "冰美式",
         "positioning": "性价比", "pricing": "10元", "channels": ["门店"],
         "strengths": ["多"], "weaknesses": ["利润低"], "evidence_ids": []},
    ]


@pytest.fixture
def sample_d6() -> dict:
    return {
        "market_attractiveness": "high", "competition_intensity": "high",
        "entry_difficulty": "medium", "data_confidence": "medium",
        "key_opportunities": ["机会"], "key_risks": ["风险"],
        "recommended_actions": ["建议"], "unknowns_to_verify": ["待核实"],
    }


@pytest.mark.asyncio
async def test_assemble_result_returns_valid_model(sample_d1, sample_d2, sample_d3,
                                                    sample_d4, sample_d5, sample_d6):
    """Test that assemble_result returns a valid MarketResearchResponse."""
    from app.agents.market_analysis_agent import assemble_result

    result = assemble_result(
        market_name="冰美式咖啡", category="咖啡饮品",
        d1=sample_d1, d2=sample_d2, d3=sample_d3,
        d4=sample_d4, d5=sample_d5, d6=sample_d6,
        report="# 测试报告",
    )
    assert isinstance(result, MarketResearchResponse)
    assert result.result.market_name == "冰美式咖啡"
    assert result.result.market_size.tam.value == 1000
    assert len(result.result.trend_signals) == 1
    assert len(result.result.target_users) == 1
    assert len(result.result.competitors) == 1
    assert result.result.opportunity_assessment.market_attractiveness == "high"


@pytest.mark.asyncio
async def test_call_node_define_calls_llm():
    """Test call_node_define function."""
    with patch("app.agents.market_analysis_agent._llm_json") as mock_llm:
        mock_llm.return_value = {"included_scope": ["test"]}
        from app.agents.market_analysis_agent import call_node_define
        result = call_node_define("test_market", "test_cat")
        assert result["included_scope"] == ["test"]
        mock_llm.assert_called_once()


@pytest.mark.asyncio
async def test_research_market_produces_valid_response():
    """Test that research_market returns valid output (with mocked node functions)."""
    from app.agents.market_analysis_agent import research_market

    with (
        patch("app.agents.market_analysis_agent.call_node_define") as mock_d1,
        patch("app.agents.market_analysis_agent.call_node_size") as mock_d2,
        patch("app.agents.market_analysis_agent.call_node_trends") as mock_d3,
        patch("app.agents.market_analysis_agent.call_node_users") as mock_d4,
        patch("app.agents.market_analysis_agent.call_node_competitors") as mock_d5,
        patch("app.agents.market_analysis_agent.call_node_assess") as mock_d6,
        patch("app.agents.market_analysis_agent.call_node_synthesize") as mock_syn,
    ):
        mock_d1.return_value = {"included_scope": ["test"], "excluded_scope": [], "upstream": [],
                                "downstream": [], "substitute_solutions": [], "definition_notes": ""}
        mock_d2.return_value = {"tam": {"value": 100}, "sam": {"value": 50}, "som": {"value": 20},
                                "cagr": 0.1, "cagr_period": "2021-2026", "cagr_confidence": "medium",
                                "conflict_notes": ""}
        mock_d3.return_value = []
        mock_d4.return_value = []
        mock_d5.return_value = []
        mock_d6.return_value = {"market_attractiveness": "medium", "competition_intensity": "medium",
                                "entry_difficulty": "medium", "data_confidence": "medium",
                                "key_opportunities": [], "key_risks": [],
                                "recommended_actions": [], "unknowns_to_verify": []}
        mock_syn.return_value = "# Report"

        result = await research_market("test", "test")
        assert result.result.market_name == "test"


@pytest.mark.asyncio
async def test_run_market_analysis_missing_inputs():
    """Test that the registry-compatible entry raises on missing inputs."""
    from app.agents.market_analysis_agent import run_market_analysis

    with pytest.raises(ValueError, match="Missing required inputs"):
        await run_market_analysis({"brand_name": ""})
