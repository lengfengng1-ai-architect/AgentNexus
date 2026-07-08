"""Plan generation pipeline — LangGraph StateGraph with checkpoint + interrupts.

注册名称: plan_generation (service layer, not a registry agent)
对应 OpenSpec: docs/api/paths/plan.yaml
对应 in_scope ID: plan-generation
用途: 串行调用 10 个 agent，生成 9 章营销方案，含 3 处人工审核检查点
输入: brand_input（brand_name/category/city/budget/period）
输出: plan_generator 的 chapters
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from collections.abc import AsyncGenerator
from typing import Any

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.graph import END, StateGraph
from langgraph.types import Command, Send
from pydantic import BaseModel
from typing_extensions import TypedDict

import aiosqlite

from app.agents.llm_utils import drain_logs, write_log
from app.agents.registry import get_handler
from app.agents.video_generation_agent import create_video_task, poll_video_task
from app.agents.image_generation_agent import run_image_generation
from app.schemas.common import ErrorCode

logger = logging.getLogger(__name__)

_CHECKPOINT_DB_PATH = "data/checkpoints.db"
# 从数据查询起,每个节点执行前暂停,等待用户「确认继续」。
# interrupt_before 使 snapshot.node_id = 即将执行的节点,该节点显示「等待确认」+ 按钮。
_INTERRUPT_BEFORE = [
    "plan_data_query",
    "fitness_analysis",
    "strategy_generation",
    "execution_planning",
    "budget_kpi",
    "action_recommendations",
    "plan_generator",
]
_PARALLEL_NODES = ["product_research", "market_research", "audience_insight"]


class PlanRunRecord(BaseModel):
    """Trackable plan run record with timestamps."""
    run_id: str
    brand_input: dict[str, Any]
    status: str  # running / paused / completed / failed / canceled
    created_at: str  # ISO 8601
    updated_at: str
    current_node: str | None = None


_RUN_RECORDS: dict[str, PlanRunRecord] = {}
_plan_db_initialized = False

# ── 宣传视频缓存 ──────────────────────────────────────────
# key: run_id, value: {status, video_url?, error?, task_id?}
_promo_video_cache: dict[str, dict[str, Any]] = {}
# ── 海报图片缓存 ──────────────────────────────────────────
# key: run_id, value: {status, image_url?, error?, size?}
_poster_cache: dict[str, dict[str, Any]] = {}
_current_run_id: str | None = None  # 跟踪当前正在执行的 run_id


async def _build_promo_video_prompt(state: PlanState) -> str:
    """用 LLM 优化宣传视频 prompt，输出后用于 HappyHorse 文生视频。

    基于品牌调性、策略定位和营销目标生成更具画面感和节奏感的 prompt。
    """
    from app.agents.llm_utils import invoke_json

    brand = state.get("brand_input", {})
    brand_name = brand.get("brand_name", "")
    category = brand.get("category", "")
    strategy = state.get("strategy_generation", {})
    positioning = strategy.get("positioning", "")
    marketing_goal = strategy.get("marketing_goal", "")
    key_messages = strategy.get("key_messages", [])

    raw_prompt = (
        f"品牌名：{brand_name}\n"
        f"品类：{category}\n"
        f"核心主张：{positioning}\n"
        f"营销目标：{marketing_goal}\n"
        f"核心传播信息：{'；'.join(key_messages) if key_messages else '无'}"
    )
    # ponytail: 先用 LLM 优化，后续可改为模板 + 风格参数
    result = await invoke_json(
        "你是一个专业的营销视频 prompt 工程师。"
        "根据品牌信息和营销策略，生成一段 HappyHorse 文生视频模型的 prompt。"
        "要求：画面感强、节奏明快、有品牌感，15 秒以内的短视频风格。"
        "输出 JSON 格式 {\"prompt\": \"...\"}。",
        raw_prompt,
    )
    return result.get("prompt", raw_prompt)


async def _run_promo_video(run_id: str, prompt: str) -> None:
    """后台异步执行宣传视频生成，结果写入缓存和 DB。"""
    try:
        task = await create_video_task(prompt, ratio="16:9", resolution="720P", duration=5)
        cache_entry = {
            "status": "generating",
            "task_id": task["task_id"],
        }
        _promo_video_cache[run_id] = cache_entry
        await _save_promo_video(run_id, cache_entry)
        logger.info(
            "[promo_video] task created run=%s task_id=%s prompt=%.200s",
            run_id, task["task_id"], prompt,
        )

        output = await poll_video_task(task["task_id"])
        logger.info(
            "[promo_video] poll finished run=%s task_id=%s output=%s",
            run_id, task["task_id"],
            json.dumps(output, default=str, ensure_ascii=False),
        )

        if output.get("task_status") == "SUCCEEDED":
            video_url = output.get("video_url")
            cache_entry = {
                "status": "completed",
                "video_url": video_url,
                "task_id": task["task_id"],
                "usage": {
                    "resolution": output.get("SR"),
                    "ratio": output.get("ratio"),
                    "duration": output.get("output_video_duration"),
                },
            }
            _promo_video_cache[run_id] = cache_entry
            logger.info(
                "[promo_video] SUCCEEDED run=%s video_url=%s usage=%s",
                run_id, video_url, cache_entry.get("usage"),
            )
        else:
            error_msg = output.get("message", output.get("code", "视频生成失败"))
            cache_entry = {
                "status": "failed",
                "error": error_msg,
                "task_id": task["task_id"],
            }
            _promo_video_cache[run_id] = cache_entry
            logger.warning(
                "[promo_video] FAILED run=%s task_id=%s status=%s error=%s",
                run_id, task["task_id"], output.get("task_status"), error_msg,
            )

        await _save_promo_video(run_id, cache_entry)
    except Exception as exc:
        logger.exception("[promo_video] background task failed run=%s", run_id)
        cache_entry = {"status": "failed", "error": str(exc)}
        _promo_video_cache[run_id] = cache_entry
        await _save_promo_video(run_id, cache_entry)


async def _ensure_plan_db_conn() -> aiosqlite.Connection:
    """Return the shared aiosqlite connection, creating plan_records table once."""
    global _plan_db_initialized
    if _conn is None:
        await _get_saver()
    if _conn is not None and not _plan_db_initialized:
        await _conn.execute("""
            CREATE TABLE IF NOT EXISTS plan_records (
                run_id TEXT PRIMARY KEY,
                brand_input TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'running',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                current_node TEXT
            )
        """)
        # Add promo_video / poster columns if missing (migration-friendly)
        for col in ("promo_video", "poster"):
            try:
                await _conn.execute(f"SELECT {col} FROM plan_records LIMIT 0")
            except Exception:
                await _conn.execute(f"ALTER TABLE plan_records ADD COLUMN {col} TEXT")
        await _conn.commit()
        _plan_db_initialized = True
    if _conn is None:
        msg = "Database connection not initialized"
        raise RuntimeError(msg)
    return _conn


async def _save_promo_video(run_id: str, data: dict[str, Any]) -> None:
    """Persist promo_video status to plan_records table."""
    try:
        conn = await _ensure_plan_db_conn()
        now = datetime.now(timezone.utc).isoformat()
        await conn.execute(
            "UPDATE plan_records SET promo_video = ?, updated_at = ? WHERE run_id = ?",
            (json.dumps(data, ensure_ascii=False, default=str), now, run_id),
        )
        await conn.commit()
    except Exception as exc:
        logger.warning("failed to save promo_video run=%s: %s", run_id, exc)


async def _load_promo_video(run_id: str) -> dict[str, Any] | None:
    """Load persisted promo_video data from plan_records table."""
    try:
        conn = await _ensure_plan_db_conn()
        cur = await conn.execute(
            "SELECT promo_video FROM plan_records WHERE run_id = ?",
            (run_id,),
        )
        row = await cur.fetchone()
        if row and row[0]:
            return json.loads(row[0])
    except Exception as exc:
        logger.warning("failed to load promo_video run=%s: %s", run_id, exc)
    return None


# ── 海报图片生成 ──────────────────────────────────────────
DEFAULT_POSTER_SIZE = "2688*1536"  # 16:9 横版主视觉


def _build_poster_content(chapters: list[dict[str, Any]]) -> str:
    """从方案章节拼出海报生成的 plan_content（与前端 buildPosterPrompt 对齐）。

    取前 4 章标题 + 内容摘要，拼成主视觉海报生成指令。
    """
    if not chapters:
        return ""
    summary = []
    for c in chapters[:4]:
        title = c.get("title", "")
        content = str(c.get("content", "")).replace("\n", " ").replace("#*`", " ")
        summary.append(f"{title}：{content[:120]}")
    return (
        "基于以下营销方案生成一张主视觉海报，要求画面大气、品牌感强、"
        "色彩鲜明，突出运动场景与年轻活力：" + "；".join(summary)
    )


async def _run_poster(run_id: str, plan_content: str, size: str = DEFAULT_POSTER_SIZE) -> None:
    """后台异步执行海报生成，结果写入缓存和 DB。"""
    try:
        cache_entry = {"status": "generating", "size": size}
        _poster_cache[run_id] = cache_entry
        await _save_poster(run_id, cache_entry)
        logger.info("[poster] task created run=%s size=%s", run_id, size)

        result = await run_image_generation({
            "plan_content": plan_content,
            "image_type": "main_visual",
            "size": size,
            "negative_prompt": "",
        })
        image_url = result.get("image_url")
        cache_entry = {
            "status": "completed",
            "image_url": image_url,
            "size": size,
            "width": result.get("width", 0),
            "height": result.get("height", 0),
        }
        _poster_cache[run_id] = cache_entry
        logger.info("[poster] SUCCEEDED run=%s image_url=%s", run_id, image_url)
        await _save_poster(run_id, cache_entry)
    except Exception as exc:
        logger.exception("[poster] background task failed run=%s", run_id)
        cache_entry = {"status": "failed", "error": str(exc), "size": size}
        _poster_cache[run_id] = cache_entry
        await _save_poster(run_id, cache_entry)


async def _save_poster(run_id: str, data: dict[str, Any]) -> None:
    """Persist poster status to plan_records table."""
    try:
        conn = await _ensure_plan_db_conn()
        now = datetime.now(timezone.utc).isoformat()
        await conn.execute(
            "UPDATE plan_records SET poster = ?, updated_at = ? WHERE run_id = ?",
            (json.dumps(data, ensure_ascii=False, default=str), now, run_id),
        )
        await conn.commit()
    except Exception as exc:
        logger.warning("failed to save poster run=%s: %s", run_id, exc)


async def _load_poster(run_id: str) -> dict[str, Any] | None:
    """Load persisted poster data from plan_records table."""
    try:
        conn = await _ensure_plan_db_conn()
        cur = await conn.execute(
            "SELECT poster FROM plan_records WHERE run_id = ?",
            (run_id,),
        )
        row = await cur.fetchone()
        if row and row[0]:
            return json.loads(row[0])
    except Exception as exc:
        logger.warning("failed to load poster run=%s: %s", run_id, exc)
    return None


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

# 并行 fan-in 节点的并行前置节点列表:next 是 X 时,X 的所有并行分支必须都已完成才能 pause。
# 当前 graph 只有 plan_data_query 是并行 fan-in 节点。
_PARALLEL_PREDECESSORS: dict[str, list[str]] = {
    "plan_data_query": ["product_research", "market_research", "audience_insight"],
}

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

    Live operation logs from the handler are pushed via write_log()
    into a shared buffer; _stream_events drains this buffer and emits
    node.log SSE.
    """
    handler = get_handler(node_id)

    async def node_fn(state: PlanState) -> dict[str, Any]:
        inputs = _node_inputs(node_id, state)
        try:
            result = {node_id: await handler(inputs)}
        except Exception:
            logger.exception("node %s failed, skipping with empty output", node_id)
            return {node_id: {}}

        # After action_recommendations completes, async trigger promo video.
        # 独立 try：视频触发的任何异常都不能影响节点主输出。
        if node_id == "action_recommendations":
            try:
                rid = _current_run_id or ""
                prompt = await _build_promo_video_prompt(state)
                logger.info("[promo_video] run=%s optimized prompt: %s", rid, prompt)
                write_log("action_recommendations", f"📹 宣传视频提示词: {prompt}")
                _promo_video_cache[rid] = {"status": "generating", "prompt": prompt, "run_id": rid}
                await _save_promo_video(rid, _promo_video_cache[rid])
                asyncio.create_task(_run_promo_video(rid, prompt))
                logger.info("[promo_video] triggered async task for run=%s", rid)
            except Exception:
                logger.exception("[promo_video] trigger failed, skipping video generation")

        # After plan_generator completes, async trigger poster image generation.
        # chapters 在本节点输出 result 中，取出拼成 plan_content 后后台生成。
        if node_id == "plan_generator":
            try:
                rid = _current_run_id or ""
                chapters = (result.get("plan_generator") or {}).get("chapters") or []
                plan_content = _build_poster_content(chapters)
                if plan_content:
                    _poster_cache[rid] = {"status": "generating", "run_id": rid}
                    await _save_poster(rid, _poster_cache[rid])
                    asyncio.create_task(_run_poster(rid, plan_content))
                    logger.info("[poster] triggered async task for run=%s", rid)
            except Exception:
                logger.exception("[poster] trigger failed, skipping poster generation")

        return result

    node_fn.__name__ = f"{node_id}_node"
    node_fn.__qualname__ = f"{node_id}_node"
    return node_fn


def _dispatch_init(state: PlanState) -> list[Send]:
    """Fan out to all three parallel research nodes。

    Skip already-completed ones so that Command(resume={}) does NOT re-execute
    finished parallel nodes (which would make plan_data_query need a second confirm).
    """
    return [Send(nid, state) for nid in _PARALLEL_NODES if not state.get(nid)]


def _build_graph() -> Any:
    """Build graph topology; compile with checkpointer in _get_graph."""
    graph = StateGraph(PlanState)

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

    graph.set_conditional_entry_point(
        _dispatch_init,
        {nid: nid for nid in _PARALLEL_NODES},
    )
    graph.add_edge("product_research", "plan_data_query")
    graph.add_edge("market_research", "plan_data_query")
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
            interrupt_before=_INTERRUPT_BEFORE,
        )
    return _graph


def _initial_state(brand_input: dict[str, Any]) -> PlanState:
    base: dict[str, Any] = {key: {} for key in _NODE_LABELS}
    base["brand_input"] = brand_input
    return base  # type: ignore[return-value]


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
    _started: set[str] | None = None,
) -> str | None:
    """Map astream_events v2 event to our SSE frame, or return None to skip."""
    ev_type = event.get("event")
    name = event.get("name")
    data = event.get("data", {})

    if ev_type == "on_chain_start" and name == "LangGraph":
        logger.info("[sse] workflow.start run=%s", run_id)
        return _sse_frame(
            event_id=_counter[0],
            event="workflow.start",
            data={"run_id": run_id},
        )

    if ev_type == "on_chain_start" and name in _NODE_LABELS:
        # Deduplicate: LangGraph may emit on_chain_start multiple times
        # for the same node (outer chain + nested chain).
        if _started is not None:
            if name in _started:
                return None
            _started.add(name)
        _counter[0] += 1
        logger.info("[sse] node.start run=%s node=%s", run_id, name)
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
        # Also skip intermediate output — only broadcast on_chain_end which
        # carries the complete node output. This avoids overwriting outputs
        # with partial data on the frontend.
        if chunk and "__interrupt__" not in chunk:
            pass  # defer to on_chain_end

    if ev_type == "on_chain_end" and name in _NODE_LABELS:
        # Confirm completion with the structured output if available.
        output = data.get("output", {})
        # The plan_generator handler returns {plan_generator: {...}}
        # so on_chain_end passes the full output. For plan_generator specifically
        # the output is already complete with all 9 chapters.
        _counter[0] += 1
        logger.info("[sse] node.end run=%s node=%s output_keys=%s", run_id, name, list(output.keys())[:3])
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
        # 防御:LangGraph 在异常或部分边界场景下可能发 on_chain_end 而图未真正完成
        # 校验最后一个节点 plan_generator 的输出存在,否则降级为 workflow.paused
        if not output.get("plan_generator") or not output["plan_generator"].get("chapters"):
            logger.warning(
                "[sse] workflow.complete skipped (no plan_generator output) run=%s keys=%s",
                run_id, list(output.keys()),
            )
            return None
        _counter[0] += 1
        logger.info("[sse] workflow.complete run=%s", run_id)
        # 合并宣传视频/海报状态，让前端能在 workflow.complete 时就收到
        if run_id in _promo_video_cache:
            output["promo_video"] = _promo_video_cache[run_id]
        if run_id in _poster_cache:
            output["poster"] = _poster_cache[run_id]
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
    # Pre-seed started with already-completed nodes so LangGraph resume
    # replay doesn't emit duplicate node.start events.
    completed: set[str] = set()
    try:
        state_obj = await graph.aget_state(_thread_config(run_id))
        state_values = getattr(state_obj, "values", {}) or {}
        for nid in _NODE_ORDER:
            if state_values.get(nid):
                completed.add(nid)
    except Exception:
        pass
    started: set[str] = set(completed)

    async for event in graph.astream_events(
        input_value,
        _thread_config(run_id),
        version="v2",
    ):
        translated = _translate_event(event, run_id, _counter=counter, _started=started)
        if translated is not None:
            yield translated

        # Drain any logs written during handler execution
        for log_msg in drain_logs():
            counter[0] += 1
            yield _sse_frame(
                event_id=counter[0],
                event="node.log",
                data={
                    "run_id": run_id,
                    "node_id": log_msg["node_id"],
                    "message": log_msg["message"],
                },
            )

    # After the event stream finishes, check whether the graph paused at an
    # interrupt checkpoint. With interrupt_before, the stream stops before each
    # confirm-required node runs. Emit workflow.paused whenever next is non-empty.
    state_obj = await graph.aget_state(_thread_config(run_id))
    next_nodes = list(getattr(state_obj, "next", ()) or [])
    state_values = getattr(state_obj, "values", {}) or {}

    # 防御:LangGraph 在并行 fan-in 边界场景下,next 可能比预期提前非空(部分并行
    # 分支未完成但 next 已含 fan-in 节点)。手动校验并行前置节点全部完成才 paused。
    if next_nodes:
        node_id = next_nodes[0]
        required = _PARALLEL_PREDECESSORS.get(node_id, [])
        if required and not all(state_values.get(p) for p in required):
            logger.warning(
                "[sse] workflow.paused deferred: next=%s but parallel predecessors %s not all complete",
                node_id, required,
            )
        else:
            counter[0] += 1
            logger.info("[sse] workflow.paused run=%s at node=%s", run_id, node_id)
            yield _sse_frame(
                event_id=counter[0],
                event="workflow.paused",
                data={
                    "run_id": run_id,
                    "snapshot": _paused_snapshot(state_values, node_id),  # type: ignore[arg-type]
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


def _next_node(state: PlanState) -> str | None:
    """Return the first non-completed node (sequential order), or None."""
    for nid in _NODE_ORDER:
        if not state.get(nid):
            return nid
    return None


async def _checkpoint_tuple(run_id: str) -> Any:
    """Fetch the latest checkpoint tuple for a run_id."""
    saver = await _get_saver()
    config: Any = {"configurable": {"thread_id": run_id}}
    return await saver.aget_tuple(config)


async def _checkpoint_state(run_id: str) -> PlanState | None:
    """Fetch the latest checkpoint state for a run_id."""
    tuple_ = await _checkpoint_tuple(run_id)
    if tuple_ is None:
        return None
    checkpoint = tuple_.checkpoint
    return checkpoint.get("channel_values")


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
    outputs = {nid: state[nid] for nid in completed}  # type: ignore[literal-required]

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
    cn = _next_node(state)
    if cn:
        current_node = cn
        # 仅当下一节点是 interrupt 检查点时才视为 paused；
        # 并行节点(product_research/market_research/audience_insight)未完成说明图仍在执行中,
        # 误判 paused 会导致前端轮询覆盖 SSE 的 running 状态并误弹「确认继续」。
        if cn in _INTERRUPT_BEFORE:
            paused_snapshot = _paused_snapshot(state, cn)
            status = "paused"
        else:
            status = "running"
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
    global _current_run_id
    run_id = run_id or str(uuid.uuid4())
    _current_run_id = run_id
    now = datetime.now(timezone.utc).isoformat()
    logger.info("[plan] start_run run=%s brand=%s", run_id, brand_input.get("brand_name"))
    # 持久化批次记录到 SQLite
    await _save_plan_record(run_id, brand_input, "running", now, now)
    graph = await _get_graph()
    state = _initial_state(brand_input)

    # Emit workflow.start immediately so the frontend knows the run is live
    yield _sse_frame(
        event_id=0,
        event="workflow.start",
        data={"run_id": run_id},
    )

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
    logger.info("[plan] approve_run run=%s", run_id)
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
    # Clear this node's output AND all downstream nodes from checkpoint state,
    # so they re-execute fresh when the graph resumes.
    checkpoint = tuple_.checkpoint
    channel_values = checkpoint.setdefault("channel_values", {})
    # Find index of current node to determine which nodes are downstream
    try:
        current_idx = _NODE_ORDER.index(node_id)
    except ValueError:
        current_idx = -1
    if current_idx >= 0:
        downstream = _NODE_ORDER[current_idx:]
    else:
        downstream = [node_id]
    for key in downstream:
        channel_values.pop(key, None)

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
    _promo_video_cache.pop(run_id, None)
    _poster_cache.pop(run_id, None)
    try:
        conn = await _ensure_plan_db_conn()
        await conn.execute(
            "UPDATE plan_records SET promo_video = NULL, poster = NULL WHERE run_id = ?",
            (run_id,),
        )
        await conn.commit()
    except Exception:
        pass


async def get_status(run_id: str) -> dict[str, Any]:
    """Return current run status including paused snapshot if applicable."""
    state = await _checkpoint_state(run_id)
    st = _status_for_state(state, run_id)
    outputs = st.setdefault("outputs", {})
    # 合并宣传视频状态到 outputs：优先内存缓存，兜底 DB
    promo_video = _promo_video_cache.get(run_id)
    if promo_video is None:
        promo_video = await _load_promo_video(run_id)
        if promo_video is not None:
            _promo_video_cache[run_id] = promo_video
    if promo_video is not None:
        outputs["promo_video"] = promo_video
    # 合并海报状态到 outputs：优先内存缓存，兜底 DB
    poster = _poster_cache.get(run_id)
    if poster is None:
        poster = await _load_poster(run_id)
        if poster is not None:
            _poster_cache[run_id] = poster
    if poster is not None:
        outputs["poster"] = poster
    logger.info(
        "[status] run=%s promo_video=%s poster=%s",
        run_id,
        json.dumps(promo_video, default=str, ensure_ascii=False),
        json.dumps(poster, default=str, ensure_ascii=False),
    )
    # 更新批次记录的状态和更新时间
    await _update_plan_record(run_id, st["status"], st.get("current_node"))
    # 同步删除已 canceled 的旧记录（超过 50 条时清理）
    await _cleanup_old_records()
    return st


async def _save_plan_record(run_id: str, brand_input: dict, status: str, created_at: str, updated_at: str) -> None:
    try:
        conn = await _ensure_plan_db_conn()
        await conn.execute(
            "INSERT OR REPLACE INTO plan_records (run_id, brand_input, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (run_id, json.dumps(brand_input, ensure_ascii=False), status, created_at, updated_at),
        )
        await conn.commit()
    except Exception as exc:
        logger.warning("failed to save plan record: %s", exc)


async def _update_plan_record(run_id: str, status: str, current_node: str | None = None) -> None:
    try:
        conn = await _ensure_plan_db_conn()
        now = datetime.now(timezone.utc).isoformat()
        await conn.execute(
            "UPDATE plan_records SET status = ?, updated_at = ?, current_node = ? WHERE run_id = ?",
            (status, now, current_node, run_id),
        )
        await conn.commit()
    except Exception as exc:
        logger.warning("failed to update plan record: %s", exc)


async def _cleanup_old_records() -> None:
    try:
        conn = await _ensure_plan_db_conn()
        await conn.execute(
            "DELETE FROM plan_records WHERE run_id NOT IN (SELECT run_id FROM plan_records ORDER BY created_at DESC LIMIT 50)"
        )
        await conn.commit()
    except Exception:
        pass


async def list_runs(limit: int = 20) -> list[dict[str, Any]]:
    """List recent plan run records with timestamps."""
    try:
        conn = await _ensure_plan_db_conn()
        cur = await conn.execute(
            "SELECT run_id, brand_input, status, created_at, updated_at, current_node FROM plan_records ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cur.fetchall()
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


async def regenerate_poster(run_id: str, *, size: str = DEFAULT_POSTER_SIZE) -> dict[str, Any]:
    """重新生成海报（换尺寸/手动重试），后台触发并立即返回 generating 状态。

    从 checkpoint 取 plan_generator.chapters 构造 plan_content。
    Returns: 当前 poster 状态 dict。
    Raises ValueError: run 不存在或 chapters 为空。
    """
    state = await _checkpoint_state(run_id)
    if state is None:
        raise ValueError(f"Run {run_id} not found")
    chapters = (state.get("plan_generator") or {}).get("chapters") or []
    plan_content = _build_poster_content(chapters)
    if not plan_content:
        raise ValueError("方案章节为空，无法生成海报")

    cache_entry = {"status": "generating", "size": size}
    _poster_cache[run_id] = cache_entry
    await _save_poster(run_id, cache_entry)
    asyncio.create_task(_run_poster(run_id, plan_content, size))
    logger.info("[poster] regenerate triggered run=%s size=%s", run_id, size)
    return cache_entry
