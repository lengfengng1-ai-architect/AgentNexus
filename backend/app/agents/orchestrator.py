"""Configurable LangGraph orchestrator.

Corresponding OpenSpec: docs/api/workflows.yaml
Corresponding in_scope ID: workflow-orchestration
"""

import asyncio
import functools
import inspect
from collections.abc import Awaitable, Callable
from typing import Annotated, Any

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from app.agents.registry import AgentHandler, get_handler
from app.schemas.workflow import WorkflowDefinition, WorkflowEdge, WorkflowNode


def _merge_outputs(left: dict[str, Any], right: dict[str, Any]) -> dict[str, Any]:
    """Merge node outputs into the shared workflow outputs dict."""
    return {**left, **right}


class WorkflowState(BaseModel):
    """LangGraph state for workflow execution."""

    input: dict[str, Any] = Field(default_factory=dict, description="工作流初始输入")
    outputs: Annotated[dict[str, dict[str, Any]], _merge_outputs] = Field(
        default_factory=dict, description="各节点输出"
    )
    status: str = Field(default="running", description="执行状态")


def _resolve_pointer(state: WorkflowState, pointer: str) -> Any:
    """Resolve a JSONPath-like pointer (e.g. $.input.message)."""
    if not pointer.startswith("$."):
        return pointer

    parts = pointer[2:].split(".")
    root = parts[0]
    if root == "input":
        current: Any = state.input
    elif root == "outputs":
        current = state.outputs
    elif root == "state":
        current = {"input": state.input, "outputs": state.outputs, "status": state.status}
    else:
        return None

    for part in parts[1:]:
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return None
    return current


def _apply_mappings(state: WorkflowState, mappings: dict[str, str] | None) -> dict[str, Any]:
    """Build node input from input_mapping."""
    if not mappings:
        return {}

    return {key: _resolve_pointer(state, pointer) for key, pointer in mappings.items()}


def _wrap_sync_handler(handler: AgentHandler) -> AgentHandler:
    """Wrap a synchronous handler so it does not block the event loop."""

    async def async_handler(input_dict: dict[str, Any]) -> dict[str, Any]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, functools.partial(handler, input_dict))

    return async_handler


def _build_node_wrapper(
    node: WorkflowNode, handler: AgentHandler
) -> Callable[[WorkflowState], Awaitable[dict[str, Any]]]:
    """Build a LangGraph node wrapper that maps state to/from the agent handler."""

    effective_handler = handler if inspect.iscoroutinefunction(handler) else _wrap_sync_handler(handler)

    async def node_wrapper(state: WorkflowState) -> dict[str, Any]:
        node_input = _apply_mappings(state, node.input_mapping)
        output = await effective_handler(node_input)
        return {"outputs": {node.id: output}}

    return node_wrapper


def _topological_sort(nodes: list[WorkflowNode], edges: list[WorkflowEdge]) -> list[str]:
    """Return a topological order of node IDs based on edges."""
    node_ids = {node.id for node in nodes}
    adjacency: dict[str, list[str]] = {node_id: [] for node_id in node_ids}
    in_degree: dict[str, int] = {node_id: 0 for node_id in node_ids}

    for edge in edges:
        if edge.from_ in node_ids and edge.to in node_ids:
            adjacency[edge.from_].append(edge.to)
            in_degree[edge.to] += 1

    queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
    ordered: list[str] = []

    while queue:
        current = queue.pop(0)
        ordered.append(current)
        for neighbor in adjacency[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if len(ordered) != len(node_ids):
        raise ValueError("Workflow contains a cycle or disconnected nodes")

    return ordered


def build_graph(workflow: WorkflowDefinition) -> Any:
    """Build a compiled LangGraph from a workflow definition.

    MVP 实现按边做拓扑排序，串行执行每个节点。
    """
    order = _topological_sort(workflow.nodes, workflow.edges)
    node_map = {node.id: node for node in workflow.nodes}

    graph = StateGraph(WorkflowState)

    for node_id in order:
        node = node_map[node_id]
        handler = get_handler(node.agent)
        wrapper = _build_node_wrapper(node, handler)
        graph.add_node(node_id, wrapper)

    # Set entry point to first node in topological order.
    if order:
        graph.set_entry_point(order[0])

    # Add edges: prefer explicit edges, fall back to topological order.
    explicit_edges = {(edge.from_, edge.to) for edge in workflow.edges}
    for i, node_id in enumerate(order):
        if (node_id, "__end__") in explicit_edges:
            graph.add_edge(node_id, END)
        elif i + 1 < len(order):
            next_id = order[i + 1]
            if (node_id, next_id) in explicit_edges or not explicit_edges:
                graph.add_edge(node_id, next_id)
            else:
                graph.add_edge(node_id, next_id)
        else:
            graph.add_edge(node_id, END)

    return graph.compile()
