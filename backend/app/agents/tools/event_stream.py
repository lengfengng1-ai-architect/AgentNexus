"""SSE event streaming manager for agent nodes.

Provides `emit_event` function that agent nodes call to push real-time
events through an asyncio.Queue, consumed by the HTTP SSE response stream.

Corresponding OpenSpec: openspec/changes/market-analysis-search-sync/
Corresponding in_scope ID: market-analysis
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import Callable

# ── Event type constants ──

EVENT_TOOL_CALL_START = "tool_call_start"
EVENT_SEARCH_RESULT = "search_result"
EVENT_TOOL_CALL_END = "tool_call_end"
EVENT_CONTENT_DELTA = "content_delta"
EVENT_PROGRESS = "progress"
EVENT_DATA = "data"
EVENT_NODE_END = "node_end"
EVENT_LOG = "log"
EVENT_RESULT = "result"

# ── Emit helper factory ──


def make_emit(queue: asyncio.Queue) -> Callable[[str, dict], None]:
    """Create an emit() callback bound to *queue*.

    Usage in analyze_stream::

        queue: asyncio.Queue = asyncio.Queue()
        emit = make_emit(queue)
        # pass emit into call_node_* functions
    """

    def emit(event: str, data: dict) -> None:
        queue.put_nowait(build_sse_frame(event, data))

    return emit


def build_sse_frame(event: str, data: dict) -> str:
    """Build a single SSE ``event:...\\ndata:...\\n\\n`` frame."""
    return (
        f"event: {event}\n"
        f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
    )
