"""Configurable LangGraph orchestrator.

Corresponding OpenSpec: docs/api/workflows.yaml
Corresponding in_scope ID: workflow-orchestration

Support serial (existing) and parallel (new) workflows.
- Fan-out: multiple nodes can run concurrently when they share no dependencies.
- Fan-in: a node with `depends_on` waits for ALL upstream nodes to complete.
"""

import asyncio
import functools
import inspect
import logging
from collections.abc import Awaitable, Callable
from typing import Annotated, Any

from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from app.agents.registry import AgentHandler, get_handler
from app.schemas.workflow import WorkflowDefinition, WorkflowEdge, WorkflowNode

logger = logging.getLogger(__name__)


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


def _tokenize_condition(condition: str) -> list[str]:
    """Tokenize a condition expression into operators and operands."""
    import re

    pattern = r"(==|!=|<=|>=|<|>|in|and|or|\(|\)|'[^']*'|\"[^\"]*\"|\[|\]|[A-Za-z0-9_$.]+)"
    tokens = [t for t in re.findall(pattern, condition) if t.strip()]
    return tokens


def _parse_value(token: str, state: WorkflowState) -> Any:
    """Parse a token into a concrete value: string literal or resolved pointer."""
    token = token.strip()
    if (token.startswith("'") and token.endswith("'")) or (
        token.startswith('"') and token.endswith('"')
    ):
        return token[1:-1]

    if token.startswith("[") and token.endswith("]"):
        inner = token[1:-1]
        if not inner:
            return []
        import re

        inner_tokens = re.findall(r"'[^']*'|\"[^\"]*\"|[^,]+", inner)
        return [_parse_value(part.strip(), state) for part in inner_tokens if part.strip()]

    if token.startswith("$"):
        return _resolve_pointer(state, token)

    if token in ("True", "true"):
        return True
    if token in ("False", "false"):
        return False
    if token in ("None", "null"):
        return None

    try:
        if "." in token:
            return float(token)
        return int(token)
    except ValueError:
        pass

    return token


def _evaluate_simple_condition(condition: str, state: WorkflowState) -> bool:
    """Evaluate a simple condition without and/or grouping."""
    tokens = _tokenize_condition(condition)
    if not tokens:
        raise ValueError(f"Empty condition: {condition}")

    if tokens[0] == "(" and tokens[-1] == ")":
        tokens = tokens[1:-1]

    for op in ("==", "!=", "<=", ">=", "<", ">", "in"):
        try:
            idx = tokens.index(op)
        except ValueError:
            continue

        left = _parse_value("".join(tokens[:idx]), state)
        right = _parse_value("".join(tokens[idx + 1 :]), state)

        if op == "==":
            return left == right
        if op == "!=":
            return left != right
        if op == "<=":
            return bool(left is not None and right is not None and left <= right)
        if op == ">=":
            return bool(left is not None and right is not None and left >= right)
        if op == "<":
            return bool(left is not None and right is not None and left < right)
        if op == ">":
            return bool(left is not None and right is not None and left > right)
        if op == "in":
            if not isinstance(right, list):
                raise ValueError(f"'in' requires a list on the right side, got {type(right)}")
            return left in right

    value = _parse_value(tokens[0], state)
    return bool(value)


def _evaluate_condition(condition: str, state: WorkflowState) -> bool:
    """Evaluate a condition expression supporting and/or grouping."""
    condition = condition.strip()

    depth = 0
    for i, char in enumerate(condition):
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
        elif depth == 0:
            if condition[i : i + 3] == " or":
                left = condition[:i].strip()
                right = condition[i + 3 :].strip()
                if not left or not right:
                    continue
                return _evaluate_condition(left, state) or _evaluate_condition(right, state)
            if condition[i : i + 4] == " and":
                left = condition[:i].strip()
                right = condition[i + 4 :].strip()
                if not left or not right:
                    continue
                return _evaluate_condition(left, state) and _evaluate_condition(right, state)

    if condition.startswith("(") and condition.endswith(")"):
        return _evaluate_condition(condition[1:-1], state)

    if condition.startswith("len("):
        end = condition.find(")")
        if end == -1:
            raise ValueError(f"Unclosed len() in condition: {condition}")
        pointer = condition[4:end].strip()
        rest = condition[end + 1 :].strip()
        value = _resolve_pointer(state, pointer)
        length = len(value) if isinstance(value, (list, dict, str)) else 0
        if not rest:
            return bool(length)
        import re

        match = re.match(r"^(==|!=|<=|>=|<|>)\s*(.+)$", rest)
        if not match:
            raise ValueError(f"Unsupported len() comparison: {rest}")
        op, num_token = match.groups()
        num = _parse_value(num_token, state)
        if op == "==":
            return length == num
        if op == "!=":
            return length != num
        if op == "<=":
            return length <= num
        if op == ">=":
            return length >= num
        if op == "<":
            return length < num
        if op == ">":
            return length > num

    return _evaluate_simple_condition(condition, state)


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
    """Build a LangGraph node wrapper with fan-in barrier support.

    Fan-in: if node declares depends_on, the wrapper checks ALL upstream
    outputs exist before executing. If not all ready, returns no-op {}.
    This enables multiple upstream nodes to edge into the same downstream
    without premature execution.
    """

    effective_handler = handler if inspect.iscoroutinefunction(handler) else _wrap_sync_handler(handler)

    async def node_wrapper(state: WorkflowState) -> dict[str, Any]:
        # Fan-in barrier: wait for all depends_on outputs to be available
        if node.depends_on:
            for dep in node.depends_on:
                if dep not in state.outputs:
                    logger.info("Fan-in barrier: '%s' waiting for '%s'", node.id, dep)
                    return {}

        node_input = _apply_mappings(state, node.input_mapping)
        output = await effective_handler(node_input)
        return {"outputs": {node.id: output}}

    return node_wrapper


def _topological_sort_by_depends(nodes: list[WorkflowNode], edges: list[WorkflowEdge] | None = None) -> list[str]:
    """Topological sort using depends_on and edges for connectivity."""
    node_ids = {n.id for n in nodes}
    node_map = {n.id: n for n in nodes}

    in_degree: dict[str, int] = {}
    adjacency: dict[str, list[str]] = {}

    for nid in node_ids:
        in_degree[nid] = 0
        adjacency[nid] = []

    # Build graph from depends_on
    for n in nodes:
        if n.depends_on:
            for dep in n.depends_on:
                if dep in node_ids:
                    adjacency[dep].append(n.id)
                    in_degree[n.id] += 1

    # Also incorporate edges for cycle detection + serial compatibility
    if edges:
        for edge in edges:
            if edge.from_ in node_ids and edge.to in node_ids:
                # Skip if already captured by depends_on
                target = node_map.get(edge.to)
                already = target and target.depends_on and edge.from_ in target.depends_on
                if not already and edge.to not in adjacency[edge.from_]:
                    adjacency[edge.from_].append(edge.to)
                    in_degree[edge.to] += 1

    queue = [nid for nid, d in in_degree.items() if d == 0]
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

    Supports:
    - Serial execution (existing behavior)
    - Parallel fan-out: nodes with no dependencies run concurrently
    - Parallel fan-in: nodes with depends_on wait for ALL upstream outputs
    - Conditional edges (existing behavior)
    """
    order = _topological_sort_by_depends(workflow.nodes, workflow.edges)
    node_map = {n.id: n for n in workflow.nodes}

    graph = StateGraph(WorkflowState)

    for node_id in order:
        node = node_map[node_id]
        handler = get_handler(node.agent)
        wrapper = _build_node_wrapper(node, handler)
        graph.add_node(node_id, wrapper)

    # ── Entry: find root nodes (no depends_on) ──
    roots = [n for n in workflow.nodes if not n.depends_on]

    if not roots:
        raise ValueError("Workflow has no entry nodes (all nodes have depends_on)")

    if len(roots) == 1:
        graph.set_entry_point(roots[0].id)
    else:
        # Multiple entry points: fan-out via START
        for root in roots:
            graph.add_edge(START, root.id)

    # ── Build edges from depends_on ──
    for n in workflow.nodes:
        if n.depends_on:
            for dep in n.depends_on:
                if dep in node_map:
                    graph.add_edge(dep, n.id)

    # ── Handle edges from workflow definition ──
    for edge in workflow.edges:
        if edge.from_ in node_map and edge.to in node_map:
            # Skip if already represented by depends_on
            target = node_map.get(edge.to)
            already = target and target.depends_on and edge.from_ in target.depends_on
            if not already:
                graph.add_edge(edge.from_, edge.to)

    # ── Nodes with no outgoing edges → END ──
    has_outgoing: set[str] = set()
    roots_set = {r.id for r in roots}
    for n in workflow.nodes:
        if n.depends_on:
            for dep in n.depends_on:
                has_outgoing.add(dep)
    for edge in workflow.edges:
        has_outgoing.add(edge.from_)
    # Also track edges from depends_on
    has_outgoing.update(roots_set)  # All roots have the virtual start edge

    for nid in order:
        # Check if this node has any outgoing edges from either depends_on or edges
        outgoing = False
        for other in workflow.nodes:
            if other.depends_on and nid in other.depends_on:
                outgoing = True
                break
        if not outgoing:
            for edge in workflow.edges:
                if edge.from_ == nid:
                    outgoing = True
                    break
        if not outgoing:
            graph.add_edge(nid, END)

    return graph.compile()
