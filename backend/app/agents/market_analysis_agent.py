"""Market research agent V2 — node functions as public API.

Each node now accepts an optional *emit* callback for real-time SSE event
pushing.  When emit is provided (streaming path), nodes execute real
web_search and push tool_call_start/search_result/tool_call_end events.
When emit is None (sync path / research_market), behavior is unchanged.

Corresponding OpenSpec: docs/api/paths/market-analysis.yaml
Corresponding in_scope ID: market-analysis
"""

import json
import re
from collections.abc import Callable
from typing import Any, Literal, cast

from jinja2 import Environment, FileSystemLoader
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

from app.agents.llm_utils import build_chat_model, searxng_search, write_log
from app.agents.registry import register
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
    env = Environment(loader=FileSystemLoader("app/prompt_templates"))
    return env.get_template(f"{name}.md.j2").render(**kw)


async def _llm_json(system_prompt: str, user_msg: str) -> dict:
    """Invoke LLM, parse JSON response (sync path — no streaming)."""
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


async def _llm_json_stream(
    system_prompt: str,
    user_msg: str,
    node_name: str,
    emit: Callable[[str, dict], None] | None = None,
) -> dict:
    """Invoke LLM, push content_delta events, return parsed JSON.

    Only pushes content_delta when *emit* is provided (streaming path).
    """
    msg = (await _build_model().ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_msg),
    ]))
    raw = msg.content.strip()

    # Push content_delta by paragraph (when streaming)
    if emit is not None:
        paragraphs = re.split(r"\n\s*\n", raw)
        for para in paragraphs:
            para = para.strip()
            if para:
                emit("content_delta", {"node": node_name, "text": para + "\n\n"})

    # Parse JSON from raw output
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


async def _run_searches(
    keywords: list[str],
    node_label: str,
    emit: Callable[[str, dict], None] | None = None,
    max_results: int = 5,
) -> list[dict[str, str]]:
    """Run multiple web_search calls, emitting SSE events for each.

    Returns the aggregated list of {href, title, body} results.
    When *emit* is None (sync path), still returns search results
    but emits no SSE events.
    """
    all_results: list[dict[str, str]] = []

    for i, kw in enumerate(keywords):
        search_id = f"search_{node_label}_{i}"

        if emit is not None:
            emit("tool_call_start", {
                "tool": "web_search",
                "query": kw,
                "search_id": search_id,
            })

        try:
            raw = await searxng_search(kw, max_results=max_results)
            for item in raw:
                if emit is not None:
                    emit("search_result", {
                        "search_id": search_id,
                        "title": item.get("title", ""),
                        "url": item.get("href", ""),
                        "snippet": item.get("body", ""),
                    })
                all_results.append(item)
            result_count = len(raw)
        except Exception as exc:
            write_log("web_search", f"⚠️ 搜索失败: {kw} — {exc}")
            result_count = 0

        if emit is not None:
            emit("tool_call_end", {
                "tool": "web_search",
                "query": kw,
                "search_id": search_id,
                "result_count": result_count,
            })

    return all_results


def _format_search_context(results: list[dict[str, str]]) -> str:
    """Format search results into a plain-text context block for LLM prompts."""
    lines: list[str] = []
    for r in results:
        href = r.get("href", "")
        title = r.get("title", "")
        body = r.get("body", "")
        lines.append(f"来源: {href}\n标题: {title}\n摘要: {body}")
    return "\n\n".join(lines)


# ── Public node functions ──


async def call_node_define(
    market_name: str,
    category: str,
    emit: Callable[[str, dict], None] | None = None,
) -> dict:
    """Node 1: market definition → returns dict with included_scope, etc."""
    write_log("market_research", f"📋 正在定义 {market_name} 的市场范围…")

    # Search
    keywords = [
        f"{market_name} {category} 市场 定义 范围",
        f"{market_name} {category} 行业 分类 标准",
        f"{market_name} 发展现状",
    ]
    results = await _run_searches(keywords, "define", emit=emit)
    search_context = _format_search_context(results)

    # LLM generation
    return await _llm_json_stream(
        _render("research_define", market_name=market_name, category=category,
                search_context=search_context),
        f"请对「{market_name}」进行市场定义和分析。",
        node_name="define",
        emit=emit,
    )


async def call_node_size(
    market_name: str,
    definition_dict: dict,
    emit: Callable[[str, dict], None] | None = None,
) -> dict:
    """Node 2: market size → returns dict with tam/sam/som/cagr."""
    write_log("market_research", f"📋 正在测算 {market_name} 的市场规模 TAM/SAM/SOM…")

    keywords = [
        f"{market_name} 市场规模 2024 2025",
        f"{market_name} 行业 增长 数据",
        f"{market_name} 市场 报告 分析",
    ]
    results = await _run_searches(keywords, "size", emit=emit)
    search_context = _format_search_context(results)

    return await _llm_json_stream(
        _render("research_size", market_name=market_name,
                definition_context=json.dumps(definition_dict, ensure_ascii=False),
                search_context=search_context),
        f"估算「{market_name}」的市场规模。",
        node_name="size",
        emit=emit,
    )


async def call_node_trends(
    market_name: str,
    size_dict: dict,
    emit: Callable[[str, dict], None] | None = None,
) -> dict:
    """Node 3: trend signals → returns dict or list of signals."""
    write_log("market_research", f"📋 正在扫描 {market_name} 的行业趋势…")

    keywords = [
        f"{market_name} 行业趋势 政策 2024 2025",
        f"{market_name} 技术 创新 发展方向",
        f"{market_name} 消费 趋势 变化",
    ]
    results = await _run_searches(keywords, "trends", emit=emit)
    search_context = _format_search_context(results)

    return await _llm_json_stream(
        _render("research_trends", market_name=market_name,
                size_context=json.dumps(size_dict, ensure_ascii=False),
                search_context=search_context),
        f"扫描「{market_name}」的趋势信号。",
        node_name="trends",
        emit=emit,
    )


async def call_node_users(
    market_name: str,
    trends_dict: dict,
    emit: Callable[[str, dict], None] | None = None,
) -> dict:
    """Node 4: target users → returns dict or list of user segments."""
    write_log("market_research", f"📋 正在分析 {market_name} 的目标用户群体…")

    keywords = [
        f"{market_name} 目标用户 画像 人群",
        f"{market_name} 消费者 行为 偏好",
        f"{market_name} 用户 痛点 需求",
    ]
    results = await _run_searches(keywords, "users", emit=emit)
    search_context = _format_search_context(results)

    return await _llm_json_stream(
        _render("research_users", market_name=market_name,
                trend_context=json.dumps(trends_dict, ensure_ascii=False),
                search_context=search_context),
        f"分析「{market_name}」的用户画像。",
        node_name="users",
        emit=emit,
    )


async def call_node_competitors(
    market_name: str,
    users_dict: dict,
    emit: Callable[[str, dict], None] | None = None,
) -> dict:
    """Node 5: competitors → returns dict or list of competitors."""
    write_log("market_research", f"📋 正在梳理 {market_name} 的竞争格局…")

    keywords = [
        f"{market_name} 竞争对手 品牌",
        f"{market_name} 市场 份额 排名",
        f"{market_name} 产品 定价 渠道",
    ]
    results = await _run_searches(keywords, "competitors", emit=emit)
    search_context = _format_search_context(results)

    return await _llm_json_stream(
        _render("research_competitors", market_name=market_name,
                context=json.dumps(users_dict, ensure_ascii=False),
                search_context=search_context),
        f"梳理「{market_name}」的竞争格局。",
        node_name="competitors",
        emit=emit,
    )


async def call_node_assess(
    market_name: str,
    competitors_dict: dict,
    emit: Callable[[str, dict], None] | None = None,
) -> dict:
    """Node 6: opportunity assessment → returns dict with scores."""
    write_log("market_research", f"📋 正在评估 {market_name} 的市场机会…")

    keywords = [
        f"{market_name} 市场机会 进入壁垒",
        f"{market_name} 风险 挑战 分析",
    ]
    results = await _run_searches(keywords, "assess", emit=emit)
    search_context = _format_search_context(results)

    return await _llm_json_stream(
        _render("research_assess", market_name=market_name,
                context=json.dumps(competitors_dict, ensure_ascii=False),
                search_context=search_context),
        f"评估「{market_name}」的市场机会。",
        node_name="assess",
        emit=emit,
    )


async def call_node_synthesize(
    market_name: str,
    d1: dict, d2: dict, d3: dict,
    d4: dict, d5: dict, d6: dict,
    emit: Callable[[str, dict], None] | None = None,
) -> str:
    """Node 7: synthesize full report → returns markdown string."""
    write_log("market_research", f"📝 正在汇总生成 {market_name} 的完整分析报告…")
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
    report = msg.content

    # Push content_delta for the full report
    if emit is not None and report:
        paragraphs = re.split(r"\n\s*\n", report)
        for para in paragraphs:
            para = para.strip()
            if para:
                emit("content_delta", {"node": "synthesize", "text": para + "\n\n"})

    return report


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

    # ── 从文本字段提取来源 URL（后处理补充） ──
    _SOURCE_RE = re.compile(r"(?:[—\-]{1,2}\s*来源:\s*|\[来源:\s*)(\S+?)(?:[\]\s]|$)")

    def _extract_sources(*texts: str) -> list[EvidenceItem]:
        seen: set[str] = set()
        items: list[EvidenceItem] = []
        for t in texts:
            for m in _SOURCE_RE.finditer(t):
                raw_url = m.group(1)
                if not raw_url or raw_url in seen:
                    continue
                seen.add(raw_url)
                if raw_url.startswith("http://") or raw_url.startswith("https://"):
                    source_name = raw_url.split("/")[2] if "//" in raw_url else raw_url
                    source_type = "媒体报道"
                else:
                    source_name = raw_url
                    source_type = "模型推断"
                items.append(EvidenceItem(
                    evidence_id=f"src_{len(items)}",
                    claim="",
                    source_type=source_type,
                    source_name=source_name,
                    source_url=raw_url,
                ))
        return items

    source_texts = [
        str(d1.get("definition_notes", "")),
    ]
    for sig in d3_list:
        if isinstance(sig, dict):
            source_texts.append(str(sig.get("summary", "")))
            source_texts.append(str(sig.get("title", "")))
    for seg in d4_list:
        if isinstance(seg, dict):
            source_texts.append(str(seg.get("user_profile", "")))
            for sc in seg.get("core_scenarios", []):
                source_texts.append(str(sc))
            for pp in seg.get("pain_points", []):
                source_texts.append(str(pp))
            for pd in seg.get("purchase_drivers", []):
                source_texts.append(str(pd))
            for pb in seg.get("purchase_barriers", []):
                source_texts.append(str(pb))
            source_texts.append(str(seg.get("willingness_to_pay", "")))
    for comp in d5_list:
        if isinstance(comp, dict):
            source_texts.append(str(comp.get("positioning", "")))
            source_texts.append(str(comp.get("pricing", "")))
            for ch in comp.get("channels", []):
                source_texts.append(str(ch))
            for st in comp.get("strengths", []):
                source_texts.append(str(st))
            for wk in comp.get("weaknesses", []):
                source_texts.append(str(wk))
    for k in ("key_opportunities", "key_risks"):
        for item in d6.get(k, []):
            source_texts.append(str(item))
    for seg_key in ("tam", "sam", "som"):
        seg = d2.get(seg_key, {})
        if isinstance(seg, dict):
            source_texts.append(str(seg.get("calculation_method", "")))
    source_texts.append(report)

    extracted = _extract_sources(*source_texts)

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
            cagr_confidence=cast(Literal["high", "medium", "low"], str(d2.get("cagr_confidence") or "medium")),
            conflict_notes=str(d2.get("conflict_notes") or ""),
        ),
        trend_signals=[TrendSignalItem.model_validate(i) for i in d3_list],
        target_users=[TargetUserSegment.model_validate(i) for i in d4_list],
        competitors=[CompetitorItem.model_validate(i) for i in d5_list],
        opportunity_assessment=OpportunityAssessment.model_validate(d6),
        evidence=extracted,
        full_report=report,
    )
    return MarketResearchResponse(result=result, confidence="medium")


# ── Legacy graph (kept for reference; not used by streaming path) ──


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


def _build_state_graph() -> Any:
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
    """同步分析入口（不经过 SSE 流，不传 emit）。"""
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
    return resp.model_dump()


register("market_analysis", run_market_analysis)
