"""Market research agent V2 — node functions as public API.
Corresponding OpenSpec: docs/api/paths/market-analysis.yaml
Corresponding in_scope ID: market-analysis
"""

import json
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.registry import register
from app.config.settings import settings
from app.schemas.market_analysis import (
    CompetitorItem,
    EvidenceItem,
    MarketDefinition,
    MarketResearchResponse,
    MarketResearchResult,
    MarketSize,
    MarketSizeSegment,
    OpportunityAssessment,
    TargetUserSegment,
    TrendSignalItem,
)

_MARKET_MOCK_PATH = Path(__file__).parent.parent.parent / "mock_data" / "market.json"

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

def _load_mock_response() -> MarketResearchResponse:
    with _MARKET_MOCK_PATH.open("r", encoding="utf-8") as f:
        return MarketResearchResponse.model_validate(json.load(f))


def _build_model():
    if settings.llm_provider == "agnes":
        return init_chat_model(
            model=settings.agnes_model, model_provider="openai",
            api_key=settings.agnes_api_key, base_url=settings.agnes_base_url,
        )
    return init_chat_model(
        model=settings.dashscope_model, model_provider="openai",
        api_key=settings.dashscope_api_key, base_url=settings.dashscope_base_url,
    )


def _render(name: str, **kw) -> str:
    env = Environment(loader=FileSystemLoader("app/prompt_templates"))
    return env.get_template(f"{name}.md.j2").render(**kw)


def _llm_json(system_prompt: str, user_msg: str) -> dict:
    msg = _build_model().invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_msg),
    ])
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

def call_node_define(market_name: str, category: str) -> dict:
    """Node 1: market definition → returns dict with included_scope, etc."""
    return _llm_json(
        _render("research_define", market_name=market_name, category=category),
        f"请对「{market_name}」进行市场定义和分析。",
    )


def call_node_size(market_name: str, definition_dict: dict) -> dict:
    """Node 2: market size → returns dict with tam/sam/som/cagr."""
    return _llm_json(
        _render("research_size", market_name=market_name,
                definition_context=json.dumps(definition_dict, ensure_ascii=False)),
        f"估算「{market_name}」的市场规模。",
    )


def call_node_trends(market_name: str, size_dict: dict) -> dict:
    """Node 3: trend signals → returns dict or list of signals."""
    return _llm_json(
        _render("research_trends", market_name=market_name,
                size_context=json.dumps(size_dict, ensure_ascii=False)),
        f"扫描「{market_name}」的趋势信号。",
    )


def call_node_users(market_name: str, trends_dict: dict) -> dict:
    """Node 4: target users → returns dict or list of user segments."""
    return _llm_json(
        _render("research_users", market_name=market_name,
                trend_context=json.dumps(trends_dict, ensure_ascii=False)),
        f"分析「{market_name}」的用户画像。",
    )


def call_node_competitors(market_name: str, users_dict: dict) -> dict:
    """Node 5: competitors → returns dict or list of competitors."""
    return _llm_json(
        _render("research_competitors", market_name=market_name,
                context=json.dumps(users_dict, ensure_ascii=False)),
        f"梳理「{market_name}」的竞争格局。",
    )


def call_node_assess(market_name: str, competitors_dict: dict) -> dict:
    """Node 6: opportunity assessment → returns dict with scores."""
    return _llm_json(
        _render("research_assess", market_name=market_name,
                context=json.dumps(competitors_dict, ensure_ascii=False)),
        f"评估「{market_name}」的市场机会。",
    )


def call_node_synthesize(market_name: str, d1: dict, d2: dict, d3: dict,
                         d4: dict, d5: dict, d6: dict) -> str:
    """Node 7: synthesize full report → returns markdown string."""
    msg = _build_model().invoke([
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
            cagr_period=d2.get("cagr_period", ""),
            cagr_confidence=d2.get("cagr_confidence", "medium"),
            conflict_notes=d2.get("conflict_notes", ""),
        ),
        trend_signals=[TrendSignalItem.model_validate(i) for i in d3_list],
        target_users=[TargetUserSegment.model_validate(i) for i in d4_list],
        competitors=[CompetitorItem.model_validate(i) for i in d5_list],
        opportunity_assessment=OpportunityAssessment.model_validate(d6),
        evidence=[],
        full_report=report,
    )
    return MarketResearchResponse(result=result, confidence="medium")


# ── Synchronous all-at-once (for /market-analysis sync endpoint) ──

async def research_market(market_name: str, category: str) -> MarketResearchResponse:
    d1 = call_node_define(market_name, category)
    d2 = call_node_size(market_name, d1)
    d3 = call_node_trends(market_name, d2)
    d4 = call_node_users(market_name, d3)
    d5 = call_node_competitors(market_name, d4)
    d6 = call_node_assess(market_name, d5)
    report = call_node_synthesize(market_name, d1, d2, d3, d4, d5, d6)
    return assemble_result(market_name, category, d1, d2, d3, d4, d5, d6, report)


# ── Registry entry (for workflow orchestration) ──

async def run_market_analysis(state: dict[str, Any]) -> dict[str, Any]:
    mn = state.get("market_name") or state.get("brand_name")
    cat = state.get("category")
    if not mn or not cat:
        raise ValueError("Missing required inputs")
    if settings.use_mock_data:
        return _load_mock_response().model_dump()
    resp = await research_market(market_name=mn, category=cat)
    return resp.model_dump()


register("market_analysis", run_market_analysis)
