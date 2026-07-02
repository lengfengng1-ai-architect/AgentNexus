"""Tests for orchestrator conditional edges.

Corresponding OpenSpec: openspec/changes/add-intent-recognition-agent/specs/workflow-orchestration/spec.md
"""

import pytest

from app.agents import registry
from app.agents.orchestrator import WorkflowState, build_graph, _evaluate_condition
from app.schemas.workflow import WorkflowDefinition, WorkflowEdge, WorkflowNode


@pytest.fixture(autouse=True)
def clear_registry():
    original = registry.snapshot()
    registry.clear()
    yield
    registry.restore(original)


def test_evaluate_condition__equal__matches():
    state = WorkflowState(outputs={"intent": {"intent": "generate_plan"}})
    assert _evaluate_condition("$.outputs.intent.intent == 'generate_plan'", state) is True


def test_evaluate_condition__not_equal__no_match():
    state = WorkflowState(outputs={"intent": {"intent": "query_data"}})
    assert _evaluate_condition("$.outputs.intent.intent == 'generate_plan'", state) is False


def test_evaluate_condition__in__matches():
    state = WorkflowState(outputs={"intent": {"intent": "clarify"}})
    assert _evaluate_condition(
        "$.outputs.intent.intent in ['chat', 'clarify', 'update_context']", state
    ) is True


def test_evaluate_condition__and__matches():
    state = WorkflowState(outputs={"intent": {"intent": "generate_plan", "missing_fields": []}})
    assert _evaluate_condition(
        "$.outputs.intent.intent == 'generate_plan' and len($.outputs.intent.missing_fields) == 0",
        state,
    ) is True


def test_evaluate_condition__missing_pointer__returns_false():
    state = WorkflowState(outputs={})
    assert _evaluate_condition("$.outputs.intent.intent == 'generate_plan'", state) is False


@pytest.mark.asyncio
async def test_build_graph__conditional_edges__routes_to_matching_branch():
    async def intent_handler(state: dict) -> dict:
        return {"intent": "query_data", "brand_input": {"city": "上海"}}

    async def extract_handler(state: dict) -> dict:
        return {"extracted": True}

    async def data_query_handler(state: dict) -> dict:
        return {"city": state.get("city")}

    registry.register("intent", intent_handler)
    registry.register("extract", extract_handler)
    registry.register("data_query", data_query_handler)

    workflow = WorkflowDefinition(
        id="conditional_flow",
        name="条件分支测试",
        version="0.1",
        nodes=[
            WorkflowNode(id="intent", agent="intent"),
            WorkflowNode(
                id="extract",
                agent="extract",
                condition="$.outputs.intent.intent == 'generate_plan'",
            ),
            WorkflowNode(
                id="data_query",
                agent="data_query",
                condition="$.outputs.intent.intent == 'query_data'",
                input_mapping={"city": "$.outputs.intent.brand_input.city"},
            ),
        ],
        edges=[
            WorkflowEdge(from_="intent", to="extract"),
            WorkflowEdge(from_="intent", to="data_query"),
            WorkflowEdge(from_="extract", to="__end__"),
            WorkflowEdge(from_="data_query", to="__end__"),
        ],
    )

    graph = build_graph(workflow)
    result = await graph.ainvoke(WorkflowState(input={}))

    assert "extract" not in result["outputs"]
    assert result["outputs"]["data_query"]["city"] == "上海"


@pytest.mark.asyncio
async def test_build_graph__mixed_conditional_and_unconditional__raises():
    async def handler(state: dict) -> dict:
        return {}

    registry.register("a", handler)
    registry.register("b", handler)
    registry.register("c", handler)

    workflow = WorkflowDefinition(
        id="mixed_flow",
        name="混合边测试",
        version="0.1",
        nodes=[
            WorkflowNode(id="a", agent="a"),
            WorkflowNode(id="b", agent="b", condition="$.input.x == 1"),
            WorkflowNode(id="c", agent="c"),
        ],
        edges=[
            WorkflowEdge(from_="a", to="b"),
            WorkflowEdge(from_="a", to="c"),
        ],
    )

    with pytest.raises(ValueError, match="both conditional and unconditional"):
        build_graph(workflow)
