"""Workflow run service: SSE streaming, state cache, and run control.

Corresponding OpenSpec: docs/api/paths/workflows.yaml
Corresponding in_scope ID: workflow-orchestration
"""

import asyncio
import inspect
import json
import uuid
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

from app.agents.orchestrator import WorkflowState, apply_mappings, _topological_sort_by_depends
from app.agents.registry import get_handler
from app.schemas.workflow import WorkflowNode


_RUN_CACHE: dict[str, WorkflowState] = {}
_RUN_WORKFLOW: dict[str, str] = {}
_RUN_HISTORY: dict[str, list[dict[str, Any]]] = {}
_RUN_LOCKS: dict[str, asyncio.Lock] = {}

_NODE_LOGS: dict[str, list[str]] = {
    "product_research": ["正在搜索品牌产品信息…", "正在读取品牌官方网站…", "正在提取产品规格参数…", "完成产品信息调研"],
    "market_research": ["正在分析行业趋势数据…", "正在研究竞品格局…", "正在生成消费洞察…", "完成市场调研"],
    "audience_insight": ["正在加载城市运动数据…", "正在分析人群画像…", "正在计算运动指数…", "完成人群洞察"],
    "plan_data_query": ["正在查询盟域数据…", "正在查询赛事资源…", "正在查询达人资源…", "正在查询场馆数据…", "完成平台数据查询"],
    "fitness_analysis": ["正在计算品类适配度…", "正在对比运动场景…", "正在生成适配度评分…", "完成适配度分析"],
    "strategy_generation": ["正在制定营销策略…", "正在构建4M+1C框架…", "正在确定核心定位…", "完成策略制定"],
    "execution_planning": ["正在规划赛事方案…", "正在规划达人矩阵…", "正在规划内容策略…", "正在规划经营社联动…", "完成执行规划"],
    "budget_kpi": ["正在测算预算分配…", "正在预测KPI指标…", "正在生成时间表…", "完成预算KPI计算"],
    "action_recommendations": ["正在分析优先级…", "正在生成可执行动作…", "完成行动建议"],
    "plan_generator": ["正在汇总上游数据…", "正在生成方案章节…", "正在格式化文档…", "完成方案生成"],
}

_MOCK_DIR = Path(__file__).parent.parent.parent / "mock_data"
_NODE_MOCK_FILES: dict[str, str] = {
    "collect": "plan_requirement_collector.json",
    "market_research": "plan_market_research.json",
    "audience_insight": "plan_audience_insight.json",
    "plan_data_query": "plan_city_data.json",
    "fitness_analysis": "plan_fitness_analysis.json",
    "strategy_generation": "plan_strategy.json",
    "execution_planning": "plan_execution.json",
    "budget_kpi": "plan_budget_kpi.json",
    "action_recommendations": "plan_actions.json",
    "plan_generator": "plan_full.json",
}


def _ensure_lock(run_id: str) -> asyncio.Lock:
    if run_id not in _RUN_LOCKS:
        _RUN_LOCKS[run_id] = asyncio.Lock()
    return _RUN_LOCKS[run_id]


def _generate_run_id() -> str:
    return f"run_{uuid.uuid4().hex[:12]}"


def _default_output_for_node(node: WorkflowNode) -> dict[str, Any]:
    """Return a default mock output for a node, used when skipping a failed node."""
    filename = _NODE_MOCK_FILES.get(node.id) or _NODE_MOCK_FILES.get(node.agent)
    if not filename:
        return {}
    path = _MOCK_DIR / filename
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _to_sse_event(
    event_id: int,
    event_type: str,
    run_id: str,
    node_id: str | None = None,
    data: dict[str, Any] | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"event": event_type, "run_id": run_id}
    if node_id:
        payload["node_id"] = node_id
    if data:
        payload["data"] = data
    if message:
        payload["message"] = message
    return {
        "id": event_id,
        "event": event_type,
        "data": json.dumps(payload, ensure_ascii=False),
    }


async def _emit(
    history: list[dict[str, Any]],
    event_type: str,
    run_id: str,
    node_id: str | None = None,
    data: dict[str, Any] | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    event_id = len(history)
    event = _to_sse_event(event_id, event_type, run_id, node_id=node_id, data=data, message=message)
    history.append(event)
    return event


async def _run_node(node: WorkflowNode, state: WorkflowState) -> dict[str, Any]:
    handler = get_handler(node.agent)
    node_input = apply_mappings(state, node.input_mapping)
    if inspect.iscoroutinefunction(handler):
        return await handler(node_input)
    return handler(node_input)


async def _execute_nodes(
    run_id: str,
    workflow: WorkflowDefinition,
    state: WorkflowState,
    history: list[dict[str, Any]],
) -> AsyncIterator[dict[str, Any]]:
    node_map = {node.id: node for node in workflow.nodes}
    node_ids = set(node_map.keys())

    # Build depends_on map
    depends_map: dict[str, list[str]] = {n.id: n.depends_on or [] for n in workflow.nodes}

    async def _exec_one(node_id: str) -> None:
        node = node_map[node_id]
        yield await _emit(history, "node.start", run_id, node_id=node_id)

        # Before running the node, emit progress logs
        logs_for_node = _NODE_LOGS.get(node_id, ["执行中…"])
        for log_msg in logs_for_node:
            yield await _emit(history, "node.log", run_id, node_id=node_id, message=log_msg)
            await asyncio.sleep(0.1)  # slight delay so logs stream in

        try:
            output = await _run_node(node, state)
        except Exception as exc:
            state.failed_node = node_id
            state.error = str(exc)
            state.status = "failed"
            yield await _emit(history, "node.failed", run_id, node_id=node_id, message=state.error)
            yield await _emit(history, "node.waiting", run_id, node_id=node_id, message="等待用户决策")
            yield await _emit(history, "workflow.failed", run_id, message=f"节点 {node_id} 执行失败")
            return
        state.outputs[node_id] = output
        yield await _emit(history, "node.complete", run_id, node_id=node_id, data=output)

    # Parallel execution: run ready nodes concurrently
    completed: set[str] = set()
    pending: set[str] = node_ids - completed

    while pending:
        # Find nodes whose dependencies are all met
        ready = {
            nid for nid in pending
            if all(dep in completed for dep in depends_map[nid])
        }
        if not ready:
            # Cycle or unreachable nodes
            raise ValueError(f"Workflow deadlocked: pending={pending}, completed={completed}")

        # Run all ready nodes concurrently
        for nid in ready:
            async for event in _exec_one(nid):
                yield event

        completed |= ready
        pending -= ready

    state.status = "completed"
    yield await _emit(history, "workflow.complete", run_id, data={"outputs": state.outputs})


async def create_stream(
    workflow_id: str, initial_input: dict[str, Any]
) -> tuple[str, AsyncIterator[dict[str, Any]]]:
    """Create a new workflow run and return its SSE event stream."""
    # Import lazily to avoid a circular import with workflow_service.
    from app.services.workflow_service import get_workflow

    workflow = get_workflow(workflow_id)
    run_id = _generate_run_id()
    state = WorkflowState(input=initial_input)
    _RUN_CACHE[run_id] = state
    _RUN_WORKFLOW[run_id] = workflow_id
    _RUN_HISTORY[run_id] = []
    history = _RUN_HISTORY[run_id]
    lock = _ensure_lock(run_id)

    async def generator() -> AsyncIterator[dict[str, Any]]:
        async with lock:
            yield await _emit(history, "workflow.start", run_id, data={"workflow_id": workflow_id})
            async for event in _execute_nodes(run_id, workflow, state, history):
                yield event

    return run_id, generator()


async def resume_stream(
    run_id: str, last_event_id: int | None = None
) -> AsyncIterator[dict[str, Any]]:
    """Resume an existing workflow run SSE stream, optionally replaying from last_event_id."""
    # Import lazily to avoid a circular import with workflow_service.
    from app.services.workflow_service import get_workflow

    if run_id not in _RUN_CACHE:
        raise KeyError(f"Run '{run_id}' not found")

    state = _RUN_CACHE[run_id]
    workflow_id = _RUN_WORKFLOW[run_id]
    workflow = get_workflow(workflow_id)
    history = _RUN_HISTORY[run_id]
    lock = _ensure_lock(run_id)

    async def generator() -> AsyncIterator[dict[str, Any]]:
        async with lock:
            start = (last_event_id + 1) if last_event_id is not None else len(history)
            for event in history[start:]:
                yield event

            if state.status in ("completed", "failed"):
                return

            async for event in _execute_nodes(run_id, workflow, state, history):
                yield event

    return generator()


def get_run_status(run_id: str) -> dict[str, Any]:
    """Return the current status of a cached workflow run."""
    if run_id not in _RUN_CACHE:
        raise KeyError(f"Run '{run_id}' not found")
    state = _RUN_CACHE[run_id]
    return {
        "run_id": run_id,
        "workflow_id": _RUN_WORKFLOW[run_id],
        "status": state.status,
        "outputs": state.outputs,
        "failed_node": state.failed_node,
        "error": state.error,
    }


def control_run(run_id: str, action: str, node_id: str | None = None) -> dict[str, Any]:
    """Apply a control action to a failed workflow run."""
    if run_id not in _RUN_CACHE:
        raise KeyError(f"Run '{run_id}' not found")

    state = _RUN_CACHE[run_id]
    workflow_id = _RUN_WORKFLOW[run_id]
    # Import lazily to avoid a circular import with workflow_service.
    from app.services.workflow_service import get_workflow

    workflow = get_workflow(workflow_id)
    target_node_id = node_id or state.failed_node

    if action in ("retry", "skip") and not target_node_id:
        raise ValueError("No failed node specified or recorded")

    if action == "retry":
        state.status = "running"
        state.failed_node = None
        state.error = None
    elif action == "skip":
        node = next((n for n in workflow.nodes if n.id == target_node_id), None)
        if node is None:
            raise ValueError(f"Node '{target_node_id}' not found")
        state.outputs[target_node_id] = _default_output_for_node(node)
        state.status = "running"
        state.failed_node = None
        state.error = None
    elif action == "abort":
        state.status = "failed"
    else:
        raise ValueError(f"Invalid action '{action}'")

    return {
        "run_id": run_id,
        "status": state.status,
        "failed_node": state.failed_node,
        "outputs": state.outputs,
    }
