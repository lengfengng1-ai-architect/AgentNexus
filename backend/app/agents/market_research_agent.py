"""Market research agent for plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

from typing import Any

from app.agents.market_analysis_agent import (
    call_node_assess,
    call_node_competitors,
    call_node_define,
    call_node_size,
    call_node_synthesize,
    call_node_trends,
    call_node_users,
)
from app.agents.registry import register
from app.schemas.plan_generation import MarketResearchOutput, MarketTrend


def _build_output(brand_name: str, category: str, d3: Any, d6: dict, report: str) -> MarketResearchOutput:
    d3_list = d3 if isinstance(d3, list) else d3.get("trend_signals", [])
    d6_opportunities = d6.get("key_opportunities", []) if isinstance(d6, dict) else []

    return MarketResearchOutput(
        market_summary=f"{brand_name} 所在的 {category} 市场分析：" + report[:300],
        trends=[MarketTrend.model_validate({
            "title": t.get("title", ""),
            "description": t.get("summary", ""),
        }) for t in d3_list[:5]],
        opportunities=d6_opportunities[:5],
    )


async def run_market_research(state: dict[str, Any]) -> dict[str, Any]:
    """Run market research for plan generation and return structured output."""
    brand_name = state.get("brand_name") or state.get("brand_input", {}).get("brand_name")
    category = state.get("category") or state.get("brand_input", {}).get("category")
    if not brand_name or not category:
        raise ValueError("Missing required inputs: brand_name and category")

    d1 = await call_node_define(brand_name, category)
    d2 = await call_node_size(brand_name, d1)
    d3 = await call_node_trends(brand_name, d2)
    d4 = await call_node_users(brand_name, d3)
    d5 = await call_node_competitors(brand_name, d4)
    d6 = await call_node_assess(brand_name, d5)
    report = await call_node_synthesize(brand_name, d1, d2, d3, d4, d5, d6)

    output = _build_output(brand_name, category, d3, d6, report)
    return output.model_dump()


register("market_research", run_market_research)
