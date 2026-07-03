"""测试并行 orchestrator —— fan-out / fan-in。"""

from unittest.mock import AsyncMock, patch

import pytest

from app.agents.orchestrator import WorkflowState, _topological_sort_by_depends
from app.schemas.workflow import WorkflowDefinition, WorkflowNode, WorkflowEdge


@pytest.fixture
def sample_nodes():
    return [
        WorkflowNode(id="a", agent="dummy"),
        WorkflowNode(id="b", agent="dummy"),
        WorkflowNode(id="c", agent="dummy", depends_on=["a", "b"]),
        WorkflowNode(id="d", agent="dummy", depends_on=["c"]),
    ]


def test_topological_sort_by_depends(sample_nodes):
    """依赖排序确保 c 在 a/b 之后，d 在 c 之后。"""
    order = _topological_sort_by_depends(sample_nodes)
    assert order.index("a") < order.index("c")
    assert order.index("b") < order.index("c")
    assert order.index("c") < order.index("d")


def test_multiple_entry_points():
    """多个无依赖节点：a 和 b 都排在前面。"""
    nodes = [
        WorkflowNode(id="a", agent="dummy"),
        WorkflowNode(id="b", agent="dummy"),
        WorkflowNode(id="c", agent="dummy", depends_on=["a", "b"]),
    ]
    order = _topological_sort_by_depends(nodes)
    assert order[:2] == ["a", "b"] or order[:2] == ["b", "a"]
    assert order[-1] == "c"


def test_cycle_detection():
    """依赖包含环时抛出 ValueError。"""
    nodes = [
        WorkflowNode(id="a", agent="dummy", depends_on=["b"]),
        WorkflowNode(id="b", agent="dummy", depends_on=["a"]),
    ]
    with pytest.raises(ValueError, match="cycle"):
        _topological_sort_by_depends(nodes)


@pytest.mark.asyncio
async def test_parallel_workflow_runs_all_nodes():
    """并行 workflow 中所有节点都得到执行。"""
    from app.agents.orchestrator import build_graph
    from app.agents.registry import register

    # Register dummy agents for each node
    async def dummy_a(state):
        return {"result": "from_a"}

    async def dummy_b(state):
        return {"result": "from_b"}

    async def dummy_c(state):
        return {"result": "from_c"}

    async def dummy_d(state):
        pi = state.get("product_info", {})
        mi = state.get("market_info", {})
        return {"result": f"got pi={bool(pi)} mi={bool(mi)}"}

    register("dummy_a", dummy_a)
    register("dummy_b", dummy_b)
    register("dummy_c", dummy_c)
    register("dummy_d", dummy_d)

    workflow = WorkflowDefinition(
        id="test_parallel",
        name="测试并行",
        version="0.1",
        nodes=[
            WorkflowNode(id="a", agent="dummy_a"),
            WorkflowNode(id="b", agent="dummy_b"),
            WorkflowNode(id="c", agent="dummy_c", depends_on=["a", "b"]),
        ],
        edges=[],
    )

    graph = build_graph(workflow)
    state = WorkflowState(input={"product_name": "Test"})

    # Run with patched asyncio.sleep to make it fast
    result = await graph.ainvoke(state)

    assert "a" in result["outputs"]
    assert "b" in result["outputs"]
    assert "c" in result["outputs"]
    assert result["outputs"]["a"]["result"] == "from_a"
    assert result["outputs"]["b"]["result"] == "from_b"


@pytest.mark.asyncio
async def test_fan_in_passes_upstream_outputs():
    """fan-in 节点的 input_mapping 能正确引用上游输出。"""
    from app.agents.orchestrator import build_graph
    from app.agents.registry import register

    async def product_research(state):
        return {"basic": {"product_name": "Test", "brand": "TestBrand"}}

    async def market_analysis(state):
        return {"industry": "消费电子"}

    async def generate_persona(state):
        pi = state.get("product_info", {})
        mi = state.get("market_info", {})
        return {"done": True, "has_pi": bool(pi), "has_mi": bool(mi)}

    register("test_pr", product_research)
    register("test_ma", market_analysis)
    register("test_gp", generate_persona)

    workflow = WorkflowDefinition(
        id="test_fanin",
        name="测试汇合",
        version="0.1",
        nodes=[
            WorkflowNode(id="pr", agent="test_pr"),
            WorkflowNode(id="ma", agent="test_ma"),
            WorkflowNode(id="gp", agent="test_gp", depends_on=["pr", "ma"],
                         input_mapping={
                             "product_info": "$.outputs.pr",
                             "market_info": "$.outputs.ma",
                         }),
        ],
        edges=[],
    )

    graph = build_graph(workflow)
    state = WorkflowState(input={"product_name": "Test"})
    result = await graph.ainvoke(state)

    gp_output = result["outputs"]["gp"]
    assert gp_output["has_pi"] is True
    assert gp_output["has_mi"] is True
