"""Market analysis service — streaming via agent graph astream_events.

Corresponding OpenSpec: docs/api/paths/market-analysis.yaml
Corresponding in_scope ID: market-analysis
"""

import json
from pathlib import Path
from typing import AsyncGenerator

from app.agents.market_analysis_agent import (
    NODE_LABELS,
    _graph,
    research_market,
)
from app.config.cache_paths import MARKET_ANALYSIS_DIR, market_analysis_path
from app.schemas.market_analysis import (
    MarketAnalysisProgressEvent,
    MarketResearchDataEvent,
    MarketResearchNodeEnd,
    MarketResearchResponse,
    RESEARCH_NODES,
)
from app.utils import sanitize


def _load_cache(market_name: str) -> MarketResearchResponse | None:
    path = market_analysis_path(market_name)
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        return MarketResearchResponse.model_validate(data)
    return None


def _save_cache(market_name: str, result: MarketResearchResponse) -> None:
    MARKET_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    market_analysis_path(market_name).write_text(
        result.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8"
    )


async def analyze(market_name: str, category: str) -> MarketResearchResponse:
    """同步分析入口。"""
    cached = _load_cache(market_name)
    if cached:
        return cached

    result = await research_market(market_name=market_name, category=category)
    _save_cache(market_name, result)
    return result


async def analyze_stream(market_name: str, category: str) -> AsyncGenerator[str, None]:
    """流式 SSE 入口：通过 agent 的 StateGraph.astream_events() 消费。

    每个节点完成时自动 yield 3 个 SSE 事件：
      progress → data → node_end
    全部完成时 yield result。
    """
    state = {
        "market_name": market_name,
        "category": category,
        "definition": {},
        "size": {},
        "trends": {},
        "users": {},
        "competitors": {},
        "assess": {},
        "report": "",
        "result": None,
    }

    try:
        async for event in _graph.astream_events(state, None, version="v2"):
            translated = _translate_event(event, market_name, category)
            if translated is not None:
                yield translated
    except Exception as exc:
        yield _sse_error(str(exc))


def _translate_event(
    event: dict,
    market_name: str,
    category: str,
) -> str | None:
    """Map astream_events v2 event to our SSE frame, or return None to skip."""
    ev_type = event.get("event")
    name = event.get("name")
    data = event.get("data", {})

    if ev_type == "on_chain_start" and name in NODE_LABELS:
        progress_val = _progress(name)
        return f"event: progress\ndata: {MarketAnalysisProgressEvent(node=name, progress=progress_val, stage=NODE_LABELS.get(name, name)).model_dump_json()}\n\n"

    if ev_type == "on_chain_end" and name in NODE_LABELS:
        output = data.get("output", {})
        # Emit data event with the node's output
        result_str = f"event: data\ndata: {MarketResearchDataEvent(node=name, result=output).model_dump_json()}\n\n"
        status_str = f"event: node_end\ndata: {MarketResearchNodeEnd(node=name, status='completed').model_dump_json()}\n\n"
        return result_str + status_str

    if ev_type == "on_chain_end" and name == "LangGraph":
        output = data.get("output", {})
        # The synthesize node returns result as a dict; wrap into response
        r = output.get("result")
        if r:
            return f"event: result\ndata: {json.dumps(r, ensure_ascii=False)}\n\n"

    if ev_type == "on_chain_end" and name == "" and not data.get("output"):
        # handle None
        pass

    return None


def _progress(node: str) -> int:
    for k, v in RESEARCH_NODES:
        if k == node:
            return v
    return 0


def _sse_error(msg: str) -> str:
    return f"event: node_end\ndata: {MarketResearchNodeEnd(node='synthesize', status='failed', error=msg).model_dump_json()}\n\n"
