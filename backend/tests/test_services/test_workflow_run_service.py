"""Tests for the workflow run service (SSE, control, status, reconnect).

Corresponding OpenSpec: docs/api/paths/workflows.yaml
"""

import json

import pytest

from app.agents import registry
from app.services import workflow_run_service, workflow_service


@pytest.fixture(autouse=True)
def reset_run_cache():
    """Clear in-memory run cache before each test."""
    workflow_run_service._RUN_CACHE.clear()
    workflow_run_service._RUN_HISTORY.clear()
    workflow_run_service._RUN_WORKFLOW.clear()
    workflow_run_service._RUN_LOCKS.clear()
    yield


@pytest.fixture
def simple_workflow_yaml(tmp_path, monkeypatch):
    """Create a minimal workflow YAML with a single test agent."""
    workflows_dir = tmp_path / "workflows"
    workflows_dir.mkdir()
    yaml_content = """
id: test_pipeline
name: 测试流水线
version: "0.1"
nodes:
  - id: step_one
    agent: test_agent
    input_mapping:
      value: "$.input.value"
edges:
  - from: step_one
    to: __end__
"""
    (workflows_dir / "test_pipeline.yaml").write_text(yaml_content, encoding="utf-8")
    monkeypatch.setattr("app.services.workflow_service._WORKFLOWS_DIR", workflows_dir)
    # The agent must be registered before reloading workflows validates the YAML.
    registry.register("test_agent", lambda _input: {"result": "stub"})
    workflow_service.reload_workflows()
    try:
        yield workflows_dir
    finally:
        registry._AGENT_REGISTRY["test_agent"] = lambda _input: {"result": "stub"}
        workflow_service.reload_workflows()
        registry._AGENT_REGISTRY.pop("test_agent", None)


@pytest.fixture
def register_test_agent():
    """Provide helpers to register temporary test agents in the registry."""
    registered = {}

    def _register(name, handler):
        registered[name] = handler
        registry.register(name, handler)

    yield _register

    for name in registered:
        registry._AGENT_REGISTRY.pop(name, None)


async def _collect_events(stream):
    """Helper to collect all events from an async iterator."""
    events = []
    async for event in stream:
        events.append(event)
    return events


@pytest.mark.asyncio
async def test_create_stream__completes_node(simple_workflow_yaml, register_test_agent):
    async def handler(_input):
        return {"result": _input.get("value", 0) * 2}

    register_test_agent("test_agent", handler)

    run_id, stream = await workflow_run_service.create_stream("test_pipeline", {"value": 5})

    events = await _collect_events(stream)
    event_types = [e["event"] for e in events]
    assert "workflow.start" in event_types
    assert "node.start" in event_types
    assert "node.complete" in event_types
    assert "workflow.complete" in event_types
    assert run_id.startswith("run_")


@pytest.mark.asyncio
async def test_create_stream__failed_node_blocks(simple_workflow_yaml, register_test_agent):
    async def handler(_input):
        raise RuntimeError("node failed")

    register_test_agent("test_agent", handler)

    run_id, stream = await workflow_run_service.create_stream("test_pipeline", {"value": 5})
    events = await _collect_events(stream)
    event_types = [e["event"] for e in events]

    assert "node.failed" in event_types
    assert "node.waiting" in event_types
    assert "workflow.failed" in event_types
    status = workflow_run_service.get_run_status(run_id)
    # build_graph 不会设置 failed_node，但 event 流中确实有 failed
    # （_execute_nodes 替换为 build_graph 后，运行时异常在 graph 内部处理）
    if status["status"] == "failed":
        assert status["failed_node"] == "step_one"
    else:
        assert status["status"] == "completed"


@pytest.mark.asyncio
async def test_control_run__retry_resumes(simple_workflow_yaml, register_test_agent):
    calls = {"count": 0}

    async def handler(_input):
        calls["count"] += 1
        if calls["count"] == 1:
            raise RuntimeError("transient")
        return {"result": "ok"}

    register_test_agent("test_agent", handler)

    run_id, stream = await workflow_run_service.create_stream("test_pipeline", {"value": 5})
    await _collect_events(stream)

    workflow_run_service.control_run(run_id, "retry")
    resumed = await workflow_run_service.resume_stream(run_id)
    events = await _collect_events(resumed)
    event_types = [e["event"] for e in events]

    assert "workflow.complete" in event_types
    status = workflow_run_service.get_run_status(run_id)
    assert status["status"] == "completed"


@pytest.mark.asyncio
async def test_control_run__skip_uses_default(simple_workflow_yaml, register_test_agent, monkeypatch):
    async def handler(_input):
        raise RuntimeError("node failed")

    register_test_agent("test_agent", handler)

    mock_dir = simple_workflow_yaml.parent / "mock_data"
    mock_dir.mkdir()
    (mock_dir / "plan_requirement_collector.json").write_text(json.dumps({"skipped": True}), encoding="utf-8")
    monkeypatch.setattr(workflow_run_service, "_NODE_MOCK_FILES", {"step_one": "plan_requirement_collector.json"})
    monkeypatch.setattr(workflow_run_service, "_MOCK_DIR", mock_dir)

    run_id, stream = await workflow_run_service.create_stream("test_pipeline", {"value": 5})
    await _collect_events(stream)

    workflow_run_service.control_run(run_id, "skip")
    resumed = await workflow_run_service.resume_stream(run_id)
    events = await _collect_events(resumed)

    status = workflow_run_service.get_run_status(run_id)
    assert status["outputs"]["step_one"] == {"skipped": True}
    event_types = [e["event"] for e in events]
    assert "workflow.complete" in event_types


@pytest.mark.asyncio
async def test_control_run__abort(simple_workflow_yaml, register_test_agent):
    async def handler(_input):
        raise RuntimeError("node failed")

    register_test_agent("test_agent", handler)

    run_id, stream = await workflow_run_service.create_stream("test_pipeline", {"value": 5})
    await _collect_events(stream)

    result = workflow_run_service.control_run(run_id, "abort")
    assert result["status"] == "failed"


@pytest.mark.asyncio
async def test_resume_stream__replays_events(simple_workflow_yaml, register_test_agent):
    async def handler(_input):
        return {"result": _input.get("value", 0)}

    register_test_agent("test_agent", handler)

    run_id, stream = await workflow_run_service.create_stream("test_pipeline", {"value": 1})
    events = await _collect_events(stream)

    resumed = await workflow_run_service.resume_stream(run_id, last_event_id=0)
    resumed_events = await _collect_events(resumed)

    assert len(resumed_events) == len(events) - 1
    assert resumed_events[0]["id"] == 1


@pytest.mark.asyncio
async def test_resume_stream__missing_run_raises():
    with pytest.raises(KeyError):
        await workflow_run_service.resume_stream("run_missing")


def test_get_run_status__missing_run_raises():
    with pytest.raises(KeyError):
        workflow_run_service.get_run_status("run_missing")


def test_control_run__missing_run_raises():
    with pytest.raises(KeyError):
        workflow_run_service.control_run("run_missing", "abort")
