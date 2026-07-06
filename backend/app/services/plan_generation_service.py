"""Plan generation pipeline — LangGraph StateGraph with checkpoint + interrupts.

注册名称: plan_generation (service layer, not a registry agent)
对应 OpenSpec: docs/api/paths/plan.yaml
对应 in_scope ID: plan-generation
用途: 串行调用 10 个 agent，生成 9 章营销方案，含 3 处人工审核检查点
输入: brand_input（brand_name/category/city/budget/period）
输出: plan_generator 的 chapters
"""

from __future__ import annotations

import json
import logging
import sqlite3
import uuid
from datetime import datetime, timezone
from collections.abc import AsyncGenerator
from typing import Any

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.graph import END, StateGraph
from langgraph.types import Command
from pydantic import BaseModel
from typing_extensions import TypedDict

import aiosqlite

from app.agents.registry import get_handler
from app.schemas.common import ErrorCode

logger = logging.getLogger(__name__)

_CHECKPOINT_DB_PATH = "data/checkpoints.db"
_CHECKPOINT_INTERRUPT_NODES = [
    "strategy_generation",
    "execution_planning",
    "plan_generator",
]


class PlanRunRecord(BaseModel):
    """Trackable plan run record with timestamps."""
    run_id: str
    brand_input: dict[str, Any]
    status: str  # running / paused / completed / failed / canceled
    created_at: str  # ISO 8601
    updated_at: str
    current_node: str | None = None


_RUN_RECORDS: dict[str, PlanRunRecord] = {}


def _ensure_plan_db() -> sqlite3.Connection:
    """Open (or reuse) the checkpoints SQLite DB with our plan_records table.

    与 LangGraph 共用同一个 checkpoints.db 文件，不额外创建数据库。
    """
    if not hasattr(_ensure_plan_db, "_conn") or _ensure_plan_db._conn is None:  # type: ignore[attr-defined]
        conn = sqlite3.connect(_CHECKPOINT_DB_PATH)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS plan_records (
                run_id TEXT PRIMARY KEY,
                brand_input TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'running',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                current_node TEXT
            )
        """)
        conn.commit()
        _ensure_plan_db._conn = conn  # type: ignore[attr-defined]
    return _ensure_plan_db._conn  # type: ignore[attr-defined]  # in-memory, lost on restart


class PlanState(TypedDict):
    brand_input: dict[str, Any]
    product_research: dict[str, Any]
    market_research: dict[str, Any]
    audience_insight: dict[str, Any]
    plan_data_query: dict[str, Any]
    fitness_analysis: dict[str, Any]
    strategy_generation: dict[str, Any]
    execution_planning: dict[str, Any]
    budget_kpi: dict[str, Any]
    action_recommendations: dict[str, Any]
    plan_generator: dict[str, Any]


_NODE_LABELS: dict[str, str] = {
    "product_research": "产品调研",
    "market_research": "市场研究",
    "audience_insight": "人群洞察",
    "plan_data_query": "平台资源",
    "fitness_analysis": "适配度分析",
    "strategy_generation": "策略生成",
    "execution_planning": "执行规划",
    "budget_kpi": "预算KPI",
    "action_recommendations": "行动建议",
    "plan_generator": "方案生成",
}

_NODE_ORDER = list(_NODE_LABELS.keys())

# Lazy singleton: created on first use so imports stay cheap during tests.
_saver: AsyncSqliteSaver | None = None
_conn: aiosqlite.Connection | None = None
_graph: Any = None


async def _get_saver() -> AsyncSqliteSaver:
    """Return shared AsyncSqliteSaver, opening the DB connection if needed."""
    global _saver, _conn
    if _saver is None:
        _conn = await aiosqlite.connect(_CHECKPOINT_DB_PATH)
        _saver = AsyncSqliteSaver(_conn)
    return _saver


def _node_inputs(node_id: str, state: PlanState) -> dict[str, Any]:
    """Build each node's input payload from state."""
    if node_id == "product_research":
        return {"brand_name": state["brand_input"].get("brand_name")}
    if node_id == "market_research":
        return {
            "brand_name": state["brand_input"].get("brand_name"),
            "category": state["brand_input"].get("category"),
        }
    if node_id in ("audience_insight", "plan_data_query"):
        return {
            "city": state["brand_input"].get("city"),
            "product_name": state["brand_input"].get("brand_name"),
        }
    if node_id == "fitness_analysis":
        return {
            "category": state["brand_input"].get("category"),
            "city": state["brand_input"].get("city"),
        }
    if node_id in ("strategy_generation", "execution_planning"):
        return {"brand_input": state["brand_input"]}
    if node_id == "budget_kpi":
        return {
            "brand_input": state["brand_input"],
            "execution_planning": state.get("execution_planning", {}),
        }
    if node_id == "action_recommendations":
        return {
            "brand_input": state["brand_input"],
            "strategy_generation": state.get("strategy_generation", {}),
            "fitness_analysis": state.get("fitness_analysis", {}),
            "budget_kpi": state.get("budget_kpi", {}),
        }
    # plan_generator
    all_upstream = dict(state)
    all_upstream.pop("brand_input")
    return {"brand_input": state["brand_input"], **all_upstream}


def _build_node(node_id: str) -> Any:
    """Create a LangGraph node that calls get_handler(node_id).

    ponytail: plan_generator 接受 writer 参数用于发送 chapter progress 事件。
    LangGraph 在 astream_events 模式下不会自动注入 writer，
    所以当前 plan_generator 节点不传 writer (None)。
    如果后续需要前端显示逐章进度，需要通过其他方式(如自定义事件)实现。
    """
    handler = get_handler(node_id)

    async def node_fn(state: PlanState) -> dict[str, Any]:
        inputs = _node_inputs(node_id, state)
        return {node_id: await handler(inputs)}

    node_fn.__name__ = f"{node_id}_node"
    node_fn.__qualname__ = f"{node_id}_node"
    return node_fn


def _build_graph() -> Any:
    """Build graph topology; compile with checkpointer in _get_graph."""
    graph = StateGraph(PlanState)  # type: ignore[arg-type]

    graph.add_node("product_research", _build_node("product_research"))
    graph.add_node("market_research", _build_node("market_research"))
    graph.add_node("audience_insight", _build_node("audience_insight"))
    graph.add_node("plan_data_query", _build_node("plan_data_query"))
    graph.add_node("fitness_analysis", _build_node("fitness_analysis"))
    graph.add_node("strategy_generation", _build_node("strategy_generation"))
    graph.add_node("execution_planning", _build_node("execution_planning"))
    graph.add_node("budget_kpi", _build_node("budget_kpi"))
    graph.add_node("action_recommendations", _build_node("action_recommendations"))
    graph.add_node("plan_generator", _build_node("plan_generator"))

    graph.set_entry_point("product_research")
    graph.add_edge("product_research", "market_research")
    graph.add_edge("market_research", "audience_insight")
    graph.add_edge("audience_insight", "plan_data_query")
    graph.add_edge("plan_data_query", "fitness_analysis")
    graph.add_edge("fitness_analysis", "strategy_generation")
    graph.add_edge("strategy_generation", "execution_planning")
    graph.add_edge("execution_planning", "budget_kpi")
    graph.add_edge("budget_kpi", "action_recommendations")
    graph.add_edge("action_recommendations", "plan_generator")
    graph.add_edge("plan_generator", END)

    return graph


async def _get_graph() -> Any:
    """Return compiled graph with shared checkpointer attached."""
    global _graph
    if _graph is None:
        saver = await _get_saver()
        _graph = _build_graph().compile(
            checkpointer=saver,
            interrupt_after=_NODE_ORDER,
        )
    return _graph


def _initial_state(brand_input: dict[str, Any]) -> PlanState:
    return {
        "brand_input": brand_input,
        **{key: {} for key in _NODE_LABELS},
    }


def _json_default(obj: Any) -> Any:
    """Fallback serializer for non-JSON-native objects (Pydantic models, dataclasses, etc.)."""
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "__dict__"):
        return obj.__dict__
    return str(obj)


def _sse_frame(*, event_id: int, event: str, data: dict[str, Any]) -> str:
    """Standard 3-line SSE frame with monotonic id."""
    return f"id: {event_id}\nevent: {event}\ndata: {json.dumps(data, ensure_ascii=False, default=_json_default)}\n\n"


def _translate_event(
    event: dict[str, Any],
    run_id: str,
    *,
    _counter: list[int],
) -> str | None:
    """Map astream_events v2 event to our SSE frame, or return None to skip."""
    ev_type = event.get("event")
    name = event.get("name")
    data = event.get("data", {})

    if ev_type == "on_chain_start" and name == "LangGraph":
        return _sse_frame(
            event_id=_counter[0],
            event="workflow.start",
            data={"run_id": run_id},
        )

    if ev_type == "on_chain_start" and name in _NODE_LABELS:
        _counter[0] += 1
        return _sse_frame(
            event_id=_counter[0],
            event="node.start",
            data={
                "run_id": run_id,
                "node_id": name,
                "label": _NODE_LABELS[name],
            },
        )

    if ev_type == "on_custom_event" and name == "chapter":
        chunk = data.get("chunk", {})
        if chunk and chunk.get("event"):
            _counter[0] += 1
            return _sse_frame(
                event_id=_counter[0],
                event="chapter",
                data={"run_id": run_id, "node_id": "plan_generator", "data": chunk},
            )

    if ev_type == "on_chain_stream" and name in _NODE_LABELS:
        chunk = data.get("chunk", {})
        # Skip checkpoint interrupt markers from public stream.
        if chunk and "__interrupt__" not in chunk:
            _counter[0] += 1
            return _sse_frame(
                event_id=_counter[0],
                event="node.complete",
                data={
                    "run_id": run_id,
                    "node_id": name,
                    "output": chunk,
                },
            )

    if ev_type == "on_chain_end" and name in _NODE_LABELS:
        # Confirm completion with the structured output if available.
        output = data.get("output", {})
        # The plan_generator handler returns {plan_generator: {...}}
        # so on_chain_end passes the full output. For plan_generator specifically
        # the output is already complete with all 9 chapters.
        _counter[0] += 1
        return _sse_frame(
            event_id=_counter[0],
            event="node.complete",
            data={
                "run_id": run_id,
                "node_id": name,
                "output": output,
            },
        )

    if ev_type == "on_chain_end" and name == "LangGraph":
        output = data.get("output", {})
        _counter[0] += 1
        return _sse_frame(
            event_id=_counter[0],
            event="workflow.complete",
            data={"run_id": run_id, "output": output},
        )

    return None


def _thread_config(run_id: str) -> dict[str, Any]:
    return {"configurable": {"thread_id": run_id}}


async def _stream_events(
    graph: Any,
    input_value: Any,
    run_id: str,
) -> AsyncGenerator[str, None]:
    """Consume astream_events v2 and yield standard SSE frames."""
    counter = [0]
    async for event in graph.astream_events(
        input_value,
        _thread_config(run_id),
        version="v2",
    ):
        translated = _translate_event(event, run_id, _counter=counter)
        if translated is not None:
            yield translated

    # After the event stream finishes, check whether the graph paused at an
    # interrupt checkpoint. With interrupt_after, the stream stops after each
    # node completes. Emit workflow.paused whenever next is non-empty.
    state_obj = await graph.aget_state(_thread_config(run_id))
    next_nodes = list(getattr(state_obj, "next", ()) or [])
    if next_nodes:
        node_id = next_nodes[0]
        state_values = getattr(state_obj, "values", {}) or {}
        counter[0] += 1
        yield _sse_frame(
            event_id=counter[0],
            event="workflow.paused",
            data={
                "run_id": run_id,
                "snapshot": _paused_snapshot(state_values, node_id),
                "reason": "review",
            },
        )


def _paused_snapshot(state: PlanState, node_id: str) -> dict[str, Any]:
    """Build snapshot of the node that's about to execute."""
    return {
        "node_id": node_id,
        "node_input": _node_inputs(node_id, state),
        "upstream_outputs": {
            key: state.get(key, {}) for key in _NODE_ORDER if key != node_id
        },
    }


async def _checkpoint_tuple(run_id: str) -> Any:
    """Fetch the latest checkpoint tuple for a run_id."""
    saver = await _get_saver()
    return await saver.aget_tuple(_thread_config(run_id))


async def _checkpoint_state(run_id: str) -> PlanState | None:
    """Fetch the latest checkpoint state for a run_id."""
    tuple_ = await _checkpoint_tuple(run_id)
    if tuple_ is None:
        return None
    checkpoint = tuple_.checkpoint
    return checkpoint.get("channel_values")  # type: ignore[return-value]


def _status_for_state(
    state: PlanState | None,
    run_id: str,
    *,
    error: str | None = None,
) -> dict[str, Any]:
    """Derive RunStatus from checkpoint state."""
    if state is None:
        return {
            "run_id": run_id,
            "status": "canceled",
            "current_node": None,
            "outputs": {},
            "completed_nodes": [],
            "paused_snapshot": None,
            "error": None,
        }

    # Find the first non-empty output; if all are empty, we're at the start.
    completed = [nid for nid in _NODE_ORDER if state.get(nid)]
    outputs = {nid: state[nid] for nid in completed}

    if error:
        return {
            "run_id": run_id,
            "status": "failed",
            "current_node": None,
            "outputs": outputs,
            "completed_nodes": completed,
            "paused_snapshot": None,
            "error": error,
        }

    # Determine next expected node based on completed outputs.
    current_node: str | None = None
    paused_snapshot: dict[str, Any] | None = None
    for nid in _NODE_ORDER:
        if not state.get(nid):
            current_node = nid
            # With interrupt_after all nodes, every non-completed node is paused
            paused_snapshot = _paused_snapshot(state, nid)
            status = "paused"
            break
    else:
        status = "completed"

    return {
        "run_id": run_id,
        "status": status,
        "current_node": current_node,
        "outputs": outputs,
        "completed_nodes": completed,
        "paused_snapshot": paused_snapshot,
        "error": None,
    }


# ── Public API ──


async def start_run(
    brand_input: dict[str, Any],
    *,
    run_id: str | None = None,
) -> AsyncGenerator[str, None]:
    """Start a new plan generation run and stream SSE events."""
    run_id = run_id or str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    # 持久化批次记录到 SQLite
    _save_plan_record(run_id, brand_input, "running", now, now)
    graph = await _get_graph()
    state = _initial_state(brand_input)

    try:
        async for frame in _stream_events(graph, state, run_id):
            yield frame
    except Exception as exc:
        logger.exception("plan run failed: %s", run_id)
        yield _sse_frame(
            event_id=0,
            event="node.failed",
            data={
                "run_id": run_id,
                "node_id": "plan_generation",
                "message": str(exc),
                "code": ErrorCode.WORKFLOW_RUN_ERROR,
            },
        )


async def approve_run(
    run_id: str,
    *,
    edited_input: dict[str, Any] | None = None,
) -> AsyncGenerator[str, None]:
    """Resume a paused run from an interrupt checkpoint."""
    graph = await _get_graph()

    # If the user edited the node input, persist it into the checkpoint so the
    # next node execution uses the edited payload.
    if edited_input:
        tuple_ = await _checkpoint_tuple(run_id)
        if tuple_ is None:
            yield _sse_frame(
                event_id=0,
                event="node.failed",
                data={
                    "run_id": run_id,
                    "node_id": "plan_generation",
                    "message": f"Run {run_id} not found",
                    "code": ErrorCode.NOT_FOUND,
                },
            )
            return
        checkpoint = tuple_.checkpoint
        channel_values = checkpoint.setdefault("channel_values", {})
        # Apply edited_input shallow merge to all keys provided; the caller is
        # expected to send the intended node_input object.
        for key, value in edited_input.items():
            channel_values[key] = value
        saver = await _get_saver()
        await saver.aput(
            tuple_.config,
            checkpoint,
            tuple_.metadata,
            checkpoint["channel_versions"],
        )

    resume_value: dict[str, Any] = {}
    try:
        async for frame in _stream_events(graph, Command(resume=resume_value), run_id):
            yield frame
    except Exception as exc:
        logger.exception("plan approve failed: %s", run_id)
        yield _sse_frame(
            event_id=0,
            event="node.failed",
            data={
                "run_id": run_id,
                "node_id": "plan_generation",
                "message": str(exc),
                "code": ErrorCode.WORKFLOW_CONTROL_ERROR,
            },
        )


async def reject_run(run_id: str, *, reason: str) -> AsyncGenerator[str, None]:
    """Reject current checkpoint and rerun the node with feedback injected."""
    graph = await _get_graph()
    tuple_ = await _checkpoint_tuple(run_id)
    if tuple_ is None:
        yield _sse_frame(
            event_id=0,
            event="node.failed",
            data={
                "run_id": run_id,
                "node_id": "plan_generation",
                "message": f"Run {run_id} not found",
                "code": ErrorCode.NOT_FOUND,
            },
        )
        return

    # Inject rejection feedback into brand_input stored in the checkpoint so
    # the next node execution sees it.
    checkpoint = tuple_.checkpoint
    channel_values = checkpoint.setdefault("channel_values", {})
    brand_input = dict(channel_values.get("brand_input") or {})
    brand_input["_reject_reason"] = reason
    channel_values["brand_input"] = brand_input

    saver = await _get_saver()
    await saver.aput(
        tuple_.config,
        checkpoint,
        tuple_.metadata,
        checkpoint["channel_versions"],
    )

    try:
        async for frame in _stream_events(graph, Command(resume={}), run_id):
            yield frame
    except Exception as exc:
        logger.exception("plan reject failed: %s", run_id)
        yield _sse_frame(
            event_id=0,
            event="node.failed",
            data={
                "run_id": run_id,
                "node_id": "plan_generation",
                "message": str(exc),
                "code": ErrorCode.WORKFLOW_CONTROL_ERROR,
            },
        )


async def rerun_run(run_id: str) -> AsyncGenerator[str, None]:
    """Rerun the current paused node by clearing its output and resuming."""
    graph = await _get_graph()
    tuple_ = await _checkpoint_tuple(run_id)
    if tuple_ is None:
        yield _sse_frame(
            event_id=0,
            event="node.failed",
            data={
                "run_id": run_id,
                "node_id": "plan_generation",
                "message": f"Run {run_id} not found",
                "code": ErrorCode.NOT_FOUND,
            },
        )
        return

    state_obj = await graph.aget_state(_thread_config(run_id))
    next_nodes = list(getattr(state_obj, "next", ()) or [])
    if not next_nodes:
        yield _sse_frame(
            event_id=0,
            event="node.failed",
            data={
                "run_id": run_id,
                "node_id": "plan_generation",
                "message": "No paused node to rerun",
                "code": ErrorCode.WORKFLOW_CONTROL_ERROR,
            },
        )
        return

    node_id = next_nodes[0]
    # Clear the node's output from checkpoint state so it reruns fresh
    checkpoint = tuple_.checkpoint
    channel_values = checkpoint.setdefault("channel_values", {})
    channel_values[node_id] = {}

    saver = await _get_saver()
    await saver.aput(
        tuple_.config,
        checkpoint,
        tuple_.metadata,
        checkpoint["channel_versions"],
    )

    try:
        async for frame in _stream_events(graph, Command(resume={}), run_id):
            yield frame
    except Exception as exc:
        logger.exception("plan rerun failed: %s", run_id)
        yield _sse_frame(
            event_id=0,
            event="node.failed",
            data={
                "run_id": run_id,
                "node_id": node_id,
                "message": str(exc),
                "code": ErrorCode.WORKFLOW_CONTROL_ERROR,
            },
        )


async def delete_run(run_id: str) -> None:
    """Delete all checkpoints for a run_id (cancel semantics)."""
    saver = await _get_saver()
    await saver.adelete_thread(run_id)


async def get_status(run_id: str) -> dict[str, Any]:
    """Return current run status including paused snapshot if applicable."""
    state = await _checkpoint_state(run_id)
    st = _status_for_state(state, run_id)
    # 更新批次记录的状态和更新时间
    _update_plan_record(run_id, st["status"], st.get("current_node"))
    # 同步删除已 canceled 的旧记录（超过 50 条时清理）
    _cleanup_old_records()
    return st


def _save_plan_record(run_id: str, brand_input: dict, status: str, created_at: str, updated_at: str) -> None:
    try:
        conn = _ensure_plan_db()
        conn.execute(
            "INSERT OR REPLACE INTO plan_records (run_id, brand_input, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (run_id, json.dumps(brand_input, ensure_ascii=False), status, created_at, updated_at),
        )
        conn.commit()
    except Exception as exc:
        logger.warning("failed to save plan record: %s", exc)


def _update_plan_record(run_id: str, status: str, current_node: str | None = None) -> None:
    try:
        conn = _ensure_plan_db()
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "UPDATE plan_records SET status = ?, updated_at = ?, current_node = ? WHERE run_id = ?",
            (status, now, current_node, run_id),
        )
        conn.commit()
    except Exception as exc:
        logger.warning("failed to update plan record: %s", exc)


def _cleanup_old_records() -> None:
    try:
        conn = _ensure_plan_db()
        conn.execute(
            "DELETE FROM plan_records WHERE run_id NOT IN (SELECT run_id FROM plan_records ORDER BY created_at DESC LIMIT 50)"
        )
        conn.commit()
    except Exception:
        pass


async def list_runs(limit: int = 20) -> list[dict[str, Any]]:
    """List recent plan run records with timestamps."""
    try:
        conn = _ensure_plan_db()
        cur = conn.execute(
            "SELECT run_id, brand_input, status, created_at, updated_at, current_node FROM plan_records ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = cur.fetchall()
        return [
            {
                "run_id": r[0],
                "brand_input": json.loads(r[1]),
                "status": r[2],
                "created_at": r[3],
                "updated_at": r[4],
                "current_node": r[5],
            }
            for r in rows
        ]
    except Exception as exc:
        logger.warning("failed to list plan records: %s", exc)
        return []


async def run_exists(run_id: str) -> bool:
    """Return True if a checkpoint tuple exists for the run_id."""
    return await _checkpoint_tuple(run_id) is not None
