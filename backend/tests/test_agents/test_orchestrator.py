import pytest

from app.agents import registry
from app.agents.orchestrator import WorkflowState, build_graph
from app.schemas.workflow import WorkflowDefinition, WorkflowEdge, WorkflowNode


@pytest.fixture(autouse=True)
def clear_registry():
    original = registry.snapshot()
    registry.clear()
    yield
    registry.restore(original)


@pytest.mark.asyncio
async def test_build_graph__single_node__returns_output():
    async def echo_handler(state: dict) -> dict:
        return {"echo": state.get("message")}

    registry.register("echo", echo_handler)

    workflow = WorkflowDefinition(
        id="echo_flow",
        name="回声测试",
        version="0.1",
        nodes=[
            WorkflowNode(
                id="echo_node",
                agent="echo",
                input_mapping={"message": "$.input.message"},
            )
        ],
        edges=[WorkflowEdge(from_="echo_node", to="__end__")],
    )

    graph = build_graph(workflow)
    result = await graph.ainvoke(WorkflowState(input={"message": "hello"}))

    assert result["outputs"]["echo_node"]["echo"] == "hello"


@pytest.mark.asyncio
async def test_build_graph__two_nodes_in_sequence__passes_state():
    async def extract_handler(state: dict) -> dict:
        return {"brand": state.get("message", "").upper()}

    async def enrich_handler(state: dict) -> dict:
        return {"enriched": f"品牌: {state.get('brand', '')}"}

    registry.register("extract", extract_handler)
    registry.register("enrich", enrich_handler)

    workflow = WorkflowDefinition(
        id="enrich_flow",
        name="增强测试",
        version="0.1",
        nodes=[
            WorkflowNode(
                id="extract",
                agent="extract",
                input_mapping={"message": "$.input.message"},
            ),
            WorkflowNode(
                id="enrich",
                agent="enrich",
                depends_on=["extract"],
                input_mapping={"brand": "$.outputs.extract.brand"},
            ),
        ],
        edges=[
            WorkflowEdge(from_="extract", to="enrich"),
            WorkflowEdge(from_="enrich", to="__end__"),
        ],
    )

    graph = build_graph(workflow)
    result = await graph.ainvoke(WorkflowState(input={"message": "nike"}))

    assert result["outputs"]["extract"]["brand"] == "NIKE"
    assert result["outputs"]["enrich"]["enriched"] == "品牌: NIKE"


def test_build_graph__cycle__raises_value_error():
    async def handler(state: dict) -> dict:
        return {}

    registry.register("a", handler)
    registry.register("b", handler)

    workflow = WorkflowDefinition(
        id="cycle_flow",
        name="循环测试",
        version="0.1",
        nodes=[
            WorkflowNode(id="a", agent="a"),
            WorkflowNode(id="b", agent="b"),
        ],
        edges=[
            WorkflowEdge(from_="a", to="b"),
            WorkflowEdge(from_="b", to="a"),
        ],
    )

    with pytest.raises(ValueError, match="cycle"):
        build_graph(workflow)


def test_build_graph__unregistered_agent__raises_key_error():
    workflow = WorkflowDefinition(
        id="bad_flow",
        name="错误测试",
        version="0.1",
        nodes=[WorkflowNode(id="only", agent="missing")],
        edges=[WorkflowEdge(from_="only", to="__end__")],
    )

    with pytest.raises(KeyError, match="Agent 'missing' is not registered"):
        build_graph(workflow)
