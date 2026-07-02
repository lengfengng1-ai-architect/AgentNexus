"""Market analysis service — true streaming: per-node data events.

Corresponding OpenSpec: docs/api/paths/market-analysis.yaml
Corresponding in_scope ID: market-analysis
"""

import asyncio
from typing import AsyncGenerator

from app.agents.market_analysis_agent import (
    _load_mock_response,
    call_node_define,
    call_node_size,
    call_node_trends,
    call_node_users,
    call_node_competitors,
    call_node_assess,
    call_node_synthesize,
    assemble_result,
    research_market,
    NODE_LABELS,
)
from app.config.settings import settings
from app.schemas.market_analysis import (
    MarketAnalysisProgressEvent,
    MarketResearchDataEvent,
    MarketResearchNodeEnd,
    MarketResearchResponse,
    RESEARCH_NODES,
)


async def analyze(market_name: str, category: str) -> MarketResearchResponse:
    """同步分析入口。USE_MOCK_DATA=true 时返回 mock 数据。"""
    if settings.use_mock_data:
        return _load_mock_response()
    return await research_market(market_name=market_name, category=category)


async def analyze_stream(market_name: str, category: str) -> AsyncGenerator[str, None]:
    """真流式 SSE 入口：逐节点调 LLM，每完成立即 yield 3 事件。

    每个节点：progress → data → node_end
    全部完成：result 全量
    """
    if settings.use_mock_data:
        async for event in _mock_stream():
            yield event
        return

    # Storage for partial results
    d1 = d2 = d3 = d4 = d5 = d6 = {}
    report = ""
    node_error = None

    # ── Node: define ──
    node_key = "define"
    yield _p(node_key)
    try:
        d1 = call_node_define(market_name, category)
        yield _d(node_key, d1)
        yield _ne(node_key, "completed")
    except Exception as e:
        node_error = str(e)
        yield _ne(node_key, "failed", node_error)
        return  # abort on define failure (no data to proceed)

    # ── Node: size ──
    node_key = "size"
    yield _p(node_key)
    try:
        d2 = call_node_size(market_name, d1)
        yield _d(node_key, d2)
        yield _ne(node_key, "completed")
    except Exception as e:
        yield _ne(node_key, "failed", str(e))
        return

    # ── Node: trends ──
    node_key = "trends"
    yield _p(node_key)
    try:
        d3 = call_node_trends(market_name, d2)
        yield _d(node_key, {"trend_signals": d3} if isinstance(d3, list) else d3)
        yield _ne(node_key, "completed")
    except Exception as e:
        yield _ne(node_key, "failed", str(e))
        return

    # ── Node: users ──
    node_key = "users"
    yield _p(node_key)
    try:
        d4 = call_node_users(market_name, d3)
        yield _d(node_key, {"target_users": d4} if isinstance(d4, list) else d4)
        yield _ne(node_key, "completed")
    except Exception as e:
        yield _ne(node_key, "failed", str(e))
        return

    # ── Node: competitors ──
    node_key = "competitors"
    yield _p(node_key)
    try:
        d5 = call_node_competitors(market_name, d4)
        yield _d(node_key, {"competitors": d5} if isinstance(d5, list) else d5)
        yield _ne(node_key, "completed")
    except Exception as e:
        yield _ne(node_key, "failed", str(e))
        return

    # ── Node: assess ──
    node_key = "assess"
    yield _p(node_key)
    try:
        d6 = call_node_assess(market_name, d5)
        yield _d(node_key, d6)
        yield _ne(node_key, "completed")
    except Exception as e:
        yield _ne(node_key, "failed", str(e))
        return

    # ── Node: synthesize ──
    node_key = "synthesize"
    yield _p(node_key)
    try:
        report = call_node_synthesize(market_name, d1, d2, d3, d4, d5, d6)
        yield _d(node_key, {"full_report": report})
        yield _ne(node_key, "completed")
    except Exception as e:
        yield _ne(node_key, "failed", str(e))
        return

    # ── Assemble & emit final result ──
    result = assemble_result(market_name, category, d1, d2, d3, d4, d5, d6, report)
    yield f"event: result\ndata: {result.model_dump_json()}\n\n"


async def _mock_stream() -> AsyncGenerator[str, None]:
    result = _load_mock_response()
    for node_key, progress in RESEARCH_NODES:
        label = NODE_LABELS.get(node_key, node_key)
        yield f"event: progress\ndata: {MarketAnalysisProgressEvent(node=node_key, progress=progress, stage=label).model_dump_json()}\n\n"
        await asyncio.sleep(0.3)
    yield f"event: result\ndata: {result.model_dump_json()}\n\n"


# ── SSE event builders ──

def _p(node: str) -> str:
    return f"event: progress\ndata: {MarketAnalysisProgressEvent(node=node, progress=_progress(node), stage=NODE_LABELS.get(node, node)).model_dump_json()}\n\n"


def _d(node: str, result: dict) -> str:
    return f"event: data\ndata: {MarketResearchDataEvent(node=node, result=result).model_dump_json()}\n\n"


def _ne(node: str, status: str, error: str | None = None) -> str:
    return f"event: node_end\ndata: {MarketResearchNodeEnd(node=node, status=status, error=error).model_dump_json()}\n\n"


def _progress(node: str) -> int:
    for k, v in RESEARCH_NODES:
        if k == node:
            return v
    return 0
