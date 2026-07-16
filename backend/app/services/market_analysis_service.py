"""Market analysis service — real-time SSE via asyncio.Queue.

Each node executes sequentially, pushing events through an asyncio.Queue
so the HTTP SSE response can yield them to the client immediately.

Corresponding OpenSpec: docs/api/paths/market-analysis.yaml
Corresponding in_scope ID: market-analysis
"""

import asyncio
import json
from collections.abc import AsyncGenerator, Callable
from pathlib import Path
from typing import Any

from app.agents.market_analysis_agent import (
    NODE_LABELS,
    assemble_result,
    call_node_assess,
    call_node_competitors,
    call_node_define,
    call_node_size,
    call_node_synthesize,
    call_node_trends,
    call_node_users,
    research_market,
)
from app.agents.llm_utils import drain_logs
from app.agents.tools.event_stream import build_sse_frame, make_emit
from app.config.cache_paths import MARKET_ANALYSIS_DIR, market_analysis_path
from app.schemas.market_analysis import (
    MarketResearchResponse,
)


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
    """同步分析入口（不经过 astream_events / _graph）。"""
    cached = _load_cache(market_name)
    if cached:
        return cached

    result = await research_market(market_name=market_name, category=category)
    _save_cache(market_name, result)
    return result


async def analyze_stream(market_name: str, category: str) -> AsyncGenerator[str, None]:
    """流式 SSE 入口：手动顺序节点循环 + asyncio.Queue 实时推送。

    每个节点内产生的事件序列（由 call_node_* 内部通过 emit 推送）：
      tool_call_start → search_result ×N → tool_call_end
      content_delta ×N
    服务层补充推送：
      progress → [node events] → data → node_end

    7 个节点完成后推送 result 事件。
    """
    event_queue: asyncio.Queue = asyncio.Queue()
    emit: Callable[[str, dict], None] = make_emit(event_queue)

    async def _run_nodes() -> None:
        """后台任务：顺序执行 7 个分析节点。"""
        try:
            # ── Node 1: 市场边界定义 ──
            emit("progress", {
                "node": "define",
                "progress": 14,
                "stage": NODE_LABELS.get("define", "市场边界定义"),
            })
            d1 = await call_node_define(market_name, category, emit=emit)
            emit("data", {"node": "define", "result": d1})
            emit("node_end", {"node": "define", "status": "completed"})

            # ── Node 2: 市场规模估算 ──
            emit("progress", {
                "node": "size",
                "progress": 28,
                "stage": NODE_LABELS.get("size", "市场规模估算"),
            })
            d2 = await call_node_size(market_name, d1, emit=emit)
            emit("data", {"node": "size", "result": d2})
            emit("node_end", {"node": "size", "status": "completed"})

            # ── Node 3: 趋势信号扫描 ──
            emit("progress", {
                "node": "trends",
                "progress": 42,
                "stage": NODE_LABELS.get("trends", "趋势信号扫描"),
            })
            d3 = await call_node_trends(market_name, d2, emit=emit)
            emit("data", {"node": "trends", "result": d3})
            emit("node_end", {"node": "trends", "status": "completed"})

            # ── Node 4: 用户画像分析 ──
            emit("progress", {
                "node": "users",
                "progress": 57,
                "stage": NODE_LABELS.get("users", "用户画像分析"),
            })
            d4 = await call_node_users(market_name, d3, emit=emit)
            emit("data", {"node": "users", "result": d4})
            emit("node_end", {"node": "users", "status": "completed"})

            # ── Node 5: 竞争格局梳理 ──
            emit("progress", {
                "node": "competitors",
                "progress": 71,
                "stage": NODE_LABELS.get("competitors", "竞争格局梳理"),
            })
            d5 = await call_node_competitors(market_name, d4, emit=emit)
            emit("data", {"node": "competitors", "result": d5})
            emit("node_end", {"node": "competitors", "status": "completed"})

            # ── Node 6: 机会综合评估 ──
            emit("progress", {
                "node": "assess",
                "progress": 85,
                "stage": NODE_LABELS.get("assess", "机会综合评估"),
            })
            d6 = await call_node_assess(market_name, d5, emit=emit)
            emit("data", {"node": "assess", "result": d6})
            emit("node_end", {"node": "assess", "status": "completed"})

            # ── Node 7: 报告合成 ──
            emit("progress", {
                "node": "synthesize",
                "progress": 100,
                "stage": NODE_LABELS.get("synthesize", "报告合成"),
            })
            report = await call_node_synthesize(market_name, d1, d2, d3, d4, d5, d6, emit=emit)
            response = assemble_result(market_name, category, d1, d2, d3, d4, d5, d6, report)
            emit("result", response.model_dump())
        except Exception as exc:
            emit("node_end", {
                "node": "synthesize",
                "status": "failed",
                "error": str(exc),
            })
        finally:
            await event_queue.put(None)  # sentinel — signals consumer to stop

    # ── 启动后台任务 ──
    runner = asyncio.create_task(_run_nodes())

    # ── 消费者：从 queue 取出事件并 yield SSE ──
    try:
        while True:
            raw = await event_queue.get()
            if raw is None:
                break
            # raw is JSON string: {"event": "...", "data": {...}}
            yield raw

            # Also drain the write_log buffer (backward compat with log events)
            for entry in drain_logs():
                yield build_sse_frame("log", entry)
    finally:
        runner.discard() if hasattr(runner, "discard") else None
        # asyncio.all_tasks() cleanup not needed — runner completes on sentinel
