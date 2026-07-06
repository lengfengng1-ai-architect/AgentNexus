"""Market research agent V2 — node functions as public API.
Corresponding OpenSpec: docs/api/paths/market-analysis.yaml
Corresponding in_scope ID: market-analysis
"""

import json
import os
import re
from pathlib import Path
from typing import Any
from jinja2 import Environment, FileSystemLoader
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

from app.agents.llm_utils import build_chat_model
from app.agents.registry import register
from app.schemas.market_analysis import (
    CompetitorItem,
    MarketDefinition,
    MarketResearchResponse,
    MarketResearchResult,
    MarketSize,
    MarketSizeSegment,
    OpportunityAssessment,
    TargetUserSegment,
    TrendSignalItem,
)

NODE_LABELS = {
    "define": "市场边界定义",
    "size": "市场规模估算",
    "trends": "趋势信号扫描",
    "users": "用户画像分析",
    "competitors": "竞争格局梳理",
    "assess": "机会综合评估",
    "synthesize": "报告合成",
}

# ── Helpers ──

_model = None


def _build_model():
    global _model
    if _model is None:
        _model = build_chat_model()
    return _model


def _render(name: str, **kw) -> str:
    _dir = os.path.join(os.path.dirname(__file__), "..", "prompt_templates")
    env = Environment(loader=FileSystemLoader(_dir))
    return env.get_template(f"{name}.md.j2").render(**kw)


async def _llm_json(system_prompt: str, user_msg: str) -> dict:
    msg = (await _build_model().ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_msg),
    ]))
    raw = msg.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}  # fallback to empty dict on parse failure


# ── Public node functions (extracted for streaming) ──

async def call_node_define(market_name: str, category: str) -> dict:
    """Node 1: market definition → returns dict with included_scope, etc."""
    return await _llm_json(
        _render("research_define", market_name=market_name, category=category),
        f"请对「{market_name}」进行市场定义和分析。",
    )


async def call_node_size(market_name: str, definition_dict: dict) -> dict:
    """Node 2: market size → returns dict with tam/sam/som/cagr."""
    return await _llm_json(
        _render("research_size", market_name=market_name,
                definition_context=json.dumps(definition_dict, ensure_ascii=False)),
        f"估算「{market_name}」的市场规模。",
    )


async def call_node_trends(market_name: str, size_dict: dict) -> dict:
    """Node 3: trend signals → returns dict or list of signals."""
    return await _llm_json(
        _render("research_trends", market_name=market_name,
                size_context=json.dumps(size_dict, ensure_ascii=False)),
        f"扫描「{market_name}」的趋势信号。",
    )


async def call_node_users(market_name: str, trends_dict: dict) -> dict:
    """Node 4: target users → returns dict or list of user segments."""
    return await _llm_json(
        _render("research_users", market_name=market_name,
                trend_context=json.dumps(trends_dict, ensure_ascii=False)),
        f"分析「{market_name}」的用户画像。",
    )


async def call_node_competitors(market_name: str, users_dict: dict) -> dict:
    """Node 5: competitors → returns dict or list of competitors."""
    return await _llm_json(
        _render("research_competitors", market_name=market_name,
                context=json.dumps(users_dict, ensure_ascii=False)),
        f"梳理「{market_name}」的竞争格局。",
    )


async def call_node_assess(market_name: str, competitors_dict: dict) -> dict:
    """Node 6: opportunity assessment → returns dict with scores."""
    return await _llm_json(
        _render("research_assess", market_name=market_name,
                context=json.dumps(competitors_dict, ensure_ascii=False)),
        f"评估「{market_name}」的市场机会。",
    )


async def call_node_synthesize(market_name: str, d1: dict, d2: dict, d3: dict,
                                 d4: dict, d5: dict, d6: dict) -> str:
    """Node 7: synthesize full report → returns markdown string."""
    msg = await _build_model().ainvoke([
        SystemMessage(content=_render("research_synthesize",
            market_name=market_name,
            definition=json.dumps(d1, ensure_ascii=False),
            size=json.dumps(d2, ensure_ascii=False),
            trends=json.dumps(d3, ensure_ascii=False),
            users=json.dumps(d4, ensure_ascii=False),
            competitors=json.dumps(d5, ensure_ascii=False),
            assess=json.dumps(d6, ensure_ascii=False),
        )),
        HumanMessage(content=f"为「{market_name}」生成完整分析报告。"),
    ])
    return msg.content


def assemble_result(market_name: str, category: str,
                    d1: dict, d2: dict, d3: dict,
                    d4: dict, d5: dict, d6: dict,
                    report: str) -> MarketResearchResponse:
    """Assemble partial outputs into final MarketResearchResult."""

    def _seg(k, s):
        if not isinstance(s, dict):
            return MarketSizeSegment()
        return MarketSizeSegment(
            value=s.get("value"), unit="亿元人民币",
            year=s.get("year"), calculation_method=s.get("calculation_method", ""),
            confidence_level=s.get("confidence_level", "medium"),
        )

    d3_list = d3 if isinstance(d3, list) else d3.get("trend_signals", [])
    d4_list = d4 if isinstance(d4, list) else d4.get("target_users", [])
    d5_list = d5 if isinstance(d5, list) else d5.get("competitors", [])

    result = MarketResearchResult(
        market_name=market_name,
        industry=category,
        category=category,
        description=d1.get("definition_notes", "")[:100],
        market_definition=MarketDefinition.model_validate(d1),
        market_size=MarketSize(
            tam=_seg("tam", d2.get("tam")),
            sam=_seg("sam", d2.get("sam")),
            som=_seg("som", d2.get("som")),
            cagr=d2.get("cagr"),
            cagr_period=str(d2.get("cagr_period") or ""),
            cagr_confidence=str(d2.get("cagr_confidence") or "medium"),
            conflict_notes=str(d2.get("conflict_notes") or ""),
        ),
        trend_signals=[TrendSignalItem.model_validate(i) for i in d3_list],
        target_users=[TargetUserSegment.model_validate(i) for i in d4_list],
        competitors=[CompetitorItem.model_validate(i) for i in d5_list],
        opportunity_assessment=OpportunityAssessment.model_validate(d6),
        evidence=[],
        full_report=report,
    )
    return MarketResearchResponse(result=result, confidence="medium")


class MarketAnalysisState(TypedDict):
    """State for the market analysis graph."""
    market_name: str
    category: str
    definition: dict
    size: dict
    trends: dict
    users: dict
    competitors: dict
    assess: dict
    report: str
    result: dict | None


# ── Graph node wrappers ──


async def _define_node(state: MarketAnalysisState) -> dict:
    return {"definition": await call_node_define(state["market_name"], state["category"])}


async def _size_node(state: MarketAnalysisState) -> dict:
    return {"size": await call_node_size(state["market_name"], state["definition"])}


async def _trends_node(state: MarketAnalysisState) -> dict:
    return {"trends": await call_node_trends(state["market_name"], state["size"])}


async def _users_node(state: MarketAnalysisState) -> dict:
    return {"users": await call_node_users(state["market_name"], state["trends"])}


async def _competitors_node(state: MarketAnalysisState) -> dict:
    return {"competitors": await call_node_competitors(state["market_name"], state["users"])}


async def _assess_node(state: MarketAnalysisState) -> dict:
    return {"assess": await call_node_assess(state["market_name"], state["competitors"])}


async def _synthesize_node(state: MarketAnalysisState) -> dict:
    d1 = state["definition"]
    d2 = state["size"]
    d3 = state["trends"]
    d4 = state["users"]
    d5 = state["competitors"]
    d6 = state["assess"]
    report = await call_node_synthesize(state["market_name"], d1, d2, d3, d4, d5, d6)
    return {"report": report, "result": assemble_result(state["market_name"], state["category"], d1, d2, d3, d4, d5, d6, report).model_dump()}


def _build_state_graph() -> StateGraph:
    """Build graph with explicit add_node/add_edge — no for-loop indirection.

    ponytail: 7-node serial graph is small enough that a for-loop over
    _GRAPH_NODES makes the topology harder to read, not easier.
    """
    g = StateGraph(MarketAnalysisState)

    g.add_node("define", _define_node)
    g.add_node("size", _size_node)
    g.add_node("trends", _trends_node)
    g.add_node("users", _users_node)
    g.add_node("competitors", _competitors_node)
    g.add_node("assess", _assess_node)
    g.add_node("synthesize", _synthesize_node)

    g.set_entry_point("define")
    g.add_edge("define", "size")
    g.add_edge("size", "trends")
    g.add_edge("trends", "users")
    g.add_edge("users", "competitors")
    g.add_edge("competitors", "assess")
    g.add_edge("assess", "synthesize")
    g.add_edge("synthesize", END)

    return g.compile()


_graph = _build_state_graph()


# ── Synchronous all-at-once (for /market-analysis sync endpoint) ──

async def research_market(market_name: str, category: str) -> MarketResearchResponse:
    d1 = await call_node_define(market_name, category)
    d2 = await call_node_size(market_name, d1)
    d3 = await call_node_trends(market_name, d2)
    d4 = await call_node_users(market_name, d3)
    d5 = await call_node_competitors(market_name, d4)
    d6 = await call_node_assess(market_name, d5)
    report = await call_node_synthesize(market_name, d1, d2, d3, d4, d5, d6)
    return assemble_result(market_name, category, d1, d2, d3, d4, d5, d6, report)


# ── Registry entry (for workflow orchestration) ──

async def run_market_analysis(state: dict[str, Any]) -> dict[str, Any]:
    mn = state.get("market_name") or state.get("brand_name")
    cat = state.get("category")
    if not mn or not cat:
        raise ValueError("Missing required inputs")
    resp = await research_market(market_name=mn, category=cat)

    # 持久化到 mock_data/market_analysis/
    safe_name = re.sub(r'[^\w一-鿿]+', "_", mn).strip("_").lower()
    mkt_dir = Path("mock_data") / "market_analysis"
    mkt_dir.mkdir(parents=True, exist_ok=True)
    path = mkt_dir / f"{safe_name}.json"
    if not safe_name:
        path = mkt_dir / "unknown.json"
    path.write_text(resp.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")

    return resp.model_dump()


register("market_analysis", run_market_analysis)
