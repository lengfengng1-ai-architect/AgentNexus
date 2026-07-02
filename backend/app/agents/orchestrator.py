"""Configurable LangGraph orchestrator.

Corresponding OpenSpec: docs/api/workflows.yaml
Corresponding in_scope ID: workflow-orchestration
"""

import asyncio
import functools
import inspect
import logging
from collections.abc import Awaitable, Callable
from typing import Annotated, Any

from langgraph.graph import END, StateGraph
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
    """Tokenize a condition expression into operators and operands.

    ponytail: naive regex-free tokenizer; sufficient for MVP expressions.
    Upgrade path: replace with a proper parser if expressions become complex.
    """
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
        # Tokenize inner content respecting string literals so commas inside quotes are not split.
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

    # Try numeric literal
    try:
        if "." in token:
            return float(token)
        return int(token)
    except ValueError:
        pass

    return token


def _evaluate_simple_condition(condition: str, state: WorkflowState) -> bool:
    """Evaluate a simple condition without and/or grouping.

    ponytail: supports ==, in, and basic comparisons. Parentheses and mixed
    logic are handled by the recursive evaluator below.
    """
    tokens = _tokenize_condition(condition)
    if not tokens:
        raise ValueError(f"Empty condition: {condition}")

    # Handle unary parentheses stripping
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

    # Single token treated as truthiness
    value = _parse_value(tokens[0], state)
    return bool(value)


def _evaluate_condition(condition: str, state: WorkflowState) -> bool:
    """Evaluate a condition expression supporting and/or grouping.

    ponytail: splits on top-level and/or. Parenthesized sub-expressions are
    evaluated recursively. This is sufficient for MVP conditions like:
    $.outputs.intent.intent == 'generate_plan' and len($.outputs.intent.missing_fields) == 0
    """
    condition = condition.strip()

    # Find top-level and/or (not inside parentheses)
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

    # Strip outer parentheses
    if condition.startswith("(") and condition.endswith(")"):
        return _evaluate_condition(condition[1:-1], state)

    # Handle len(...) == N helpers
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
        # expect == N or != N
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

    MVP 实现按边做拓扑排序，串行执行每个节点。支持带 condition 的条件边。
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

    # Build adjacency and route edges.
    adjacency: dict[str, list[str]] = {node_id: [] for node_id in order}
    for edge in workflow.edges:
        if edge.from_ in adjacency and edge.to in adjacency:
            adjacency[edge.from_].append(edge.to)

    for node_id in order:
        targets = adjacency.get(node_id, [])
        if not targets:
            graph.add_edge(node_id, END)
            continue

        # Separate unconditional targets from conditional targets.
        unconditional_targets: list[str] = []
        conditional_targets: list[tuple[str, str]] = []
        for target_id in targets:
            target_node = node_map[target_id]
            if target_node.condition:
                conditional_targets.append((target_id, target_node.condition))
            else:
                unconditional_targets.append(target_id)

        if conditional_targets:
            # All outgoing edges from this node are conditional.
            if unconditional_targets:
                raise ValueError(
                    f"Node '{node_id}' has both conditional and unconditional outgoing edges"
                )

            def _make_router(conditions: list[tuple[str, str]]) -> Callable[[WorkflowState], str]:
                def router(state: WorkflowState) -> str:
                    for target_id, condition in conditions:
                        try:
                            result = _evaluate_condition(condition, state)
                        except Exception as exc:
                            raise ValueError(
                                f"Failed to evaluate condition for node '{target_id}': {exc}"
                            ) from exc
                        if result:
                            logger.info("Workflow node '%s' condition satisfied -> '%s'", node_id, target_id)
                            return target_id
                    logger.info("Workflow node '%s' no condition satisfied, ending branch", node_id)
                    return END

                return router

            router = _make_router(conditional_targets)
            graph.add_conditional_edges(node_id, router, {t: t for t, _ in conditional_targets} | {"__end__": END})
        else:
            # Unconditional edges: first target is the next node, remaining targets are parallel.
            # ponytail: MVP supports single unconditional target. Multiple targets would require
            # parallel Send support, deferred to future change.
            if len(unconditional_targets) > 1:
                raise ValueError(
                    f"Node '{node_id}' has multiple unconditional outgoing edges (not supported in MVP)"
                )
            next_id = unconditional_targets[0]
            graph.add_edge(node_id, next_id)

    return graph.compile()
