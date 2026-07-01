import pytest

from app.agents import registry
from app.schemas.workflow import WorkflowDefinition, WorkflowEdge, WorkflowNode
from app.services import workflow_service


@pytest.fixture(autouse=True)
def clear_registry_and_workflows(tmp_path, monkeypatch):
    registry.clear()
    workflow_service._workflows = None  # noqa: SLF001
    original_dir = workflow_service._WORKFLOWS_DIR  # noqa: SLF001
    monkeypatch.setattr(workflow_service, "_WORKFLOWS_DIR", tmp_path)
    yield
    registry.clear()
    workflow_service._workflows = None  # noqa: SLF001
    workflow_service._WORKFLOWS_DIR = original_dir  # noqa: SLF001


def _write_workflow(tmp_path, workflow_id: str, content: str):
    path = tmp_path / f"{workflow_id}.yaml"
    path.write_text(content, encoding="utf-8")


@pytest.mark.asyncio
async def test_run_workflow__single_node__returns_completed(tmp_path):
    async def echo_handler(state: dict) -> dict:
        return {"echo": state.get("message")}

    registry.register("echo", echo_handler)

    _write_workflow(
        tmp_path,
        "echo_flow",
        """
id: echo_flow
name: 回声测试
version: "0.1"
nodes:
  - id: echo
    agent: echo
    input_mapping:
      message: "$.input.message"
edges:
  - from: echo
    to: __end__
""",
    )

    result = await workflow_service.run_workflow("echo_flow", {"message": "hello"})

    assert result["workflow_id"] == "echo_flow"
    assert result["status"] == "completed"
    assert result["outputs"]["echo"]["echo"] == "hello"


def test_list_workflows__after_load__returns_summary(tmp_path):
    async def handler(state: dict) -> dict:
        return {}

    registry.register("noop", handler)

    _write_workflow(
        tmp_path,
        "noop_flow",
        """
id: noop_flow
name: 空流程
version: "0.1"
nodes:
  - id: noop
    agent: noop
edges:
  - from: noop
    to: __end__
""",
    )

    response = workflow_service.list_workflows()

    assert len(response.items) == 1
    assert response.items[0].id == "noop_flow"
    assert response.items[0].name == "空流程"


def test_get_workflow__missing__raises_key_error():
    with pytest.raises(KeyError, match="Workflow 'missing' not found"):
        workflow_service.get_workflow("missing")


def test_validate_workflow__unregistered_agent__raises_value_error():
    workflow = WorkflowDefinition(
        id="bad",
        name="错误",
        version="0.1",
        nodes=[WorkflowNode(id="only", agent="missing")],
        edges=[WorkflowEdge(from_="only", to="__end__")],
    )

    with pytest.raises(ValueError, match="unregistered agent 'missing'"):
        workflow_service.validate_workflow(workflow)
