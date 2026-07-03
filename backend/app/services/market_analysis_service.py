"""Market analysis service — true streaming: per-node data events.

Corresponding OpenSpec: docs/api/paths/market-analysis.yaml
Corresponding in_scope ID: market-analysis
"""

import asyncio
import json
import re
from pathlib import Path
from typing import AsyncGenerator

from app.agents.market_analysis_agent import (
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

MOCK_DATA_DIR = Path("mock_data") / "market_analysis"


def _sanitize(name: str) -> str:
    safe = re.sub(r'[^\w一-鿿]+', "_", name).strip("_").lower()
    return safe if safe else "unknown"


def _cache_path(market_name: str) -> Path:
    return MOCK_DATA_DIR / f"{_sanitize(market_name)}.json"


def _load_cache(market_name: str) -> MarketResearchResponse | None:
    path = _cache_path(market_name)
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        return MarketResearchResponse.model_validate(data)
    return None


def _save_cache(market_name: str, result: MarketResearchResponse) -> None:
    MOCK_DATA_DIR.mkdir(parents=True, exist_ok=True)
    _cache_path(market_name).write_text(
        result.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8"
    )


async def analyze(market_name: str, category: str) -> MarketResearchResponse:
    """同步分析入口。"""
    # 检查缓存
    cached = _load_cache(market_name)
    if cached:
        return cached

    result = await research_market(market_name=market_name, category=category)
    _save_cache(market_name, result)
    return result


async def analyze_stream(market_name: str, category: str) -> AsyncGenerator[str, None]:
    """真流式 SSE 入口：逐节点调 LLM，每完成立即 yield 3 事件。

    每个节点：progress → data → node_end
    全部完成：result 全量
    """
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
