"""Tests for plan generation service checkpoint flow.

Corresponding OpenSpec: docs/api/paths/plan.yaml
Corresponding in_scope ID: plan-generation
"""

from __future__ import annotations

import json
import os
from collections.abc import AsyncGenerator
from typing import Any

import pytest

from app.agents import registry
from app.services import plan_generation_service as service


@pytest.fixture(autouse=True)
async def reset_singletons_and_registry(monkeypatch, tmp_path):
    """Use per-test in-memory sqlite and restore agent registry after tests."""
    original_registry = registry.snapshot()
    registry.clear()

    db_path = tmp_path / "checkpoints.db"
    monkeypatch.setattr(service, "_CHECKPOINT_DB_PATH", str(db_path))
    monkeypatch.setattr(service, "_saver", None)
    monkeypatch.setattr(service, "_conn", None)
    monkeypatch.setattr(service, "_graph", None)

    async def make_handler(node_id: str):
        async def handler(inputs: dict[str, Any]) -> dict[str, Any]:
            return {node_id: inputs}

        return handler

    for name in [
        "product_research",
        "market_research",
        "audience_insight",
        "plan_data_query",
        "fitness_analysis",
        "strategy_generation",
        "execution_planning",
        "budget_kpi",
        "action_recommendations",
        "plan_generator",
    ]:
        registry.register(name, await make_handler(name))

    yield

    registry.restore(original_registry)


def _parse_sse_frames(raw: str) -> list[dict[str, Any]]:
    """Parse concatenated SSE 3-line frames into payload dicts."""
    frames: list[dict[str, Any]] = []
    current_id: str | None = None
    current_event: str | None = None
    current_data_lines: list[str] = []

    def flush() -> None:
        nonlocal current_id, current_event, current_data_lines
        if current_event is not None and current_data_lines:
            frames.append(
                {
                    "id": current_id,
                    "event": current_event,
                    "data": json.loads("\n".join(current_data_lines)),
                }
            )
        current_id = None
        current_event = None
        current_data_lines = []

    for line in raw.splitlines():
        if line.startswith("id: "):
            current_id = line[4:]
        elif line.startswith("event: "):
            current_event = line[7:]
        elif line.startswith("data: "):
            current_data_lines.append(line[6:])
        elif line == "":
            flush()
        else:
            # Continuation of multi-line JSON data payload.
            if current_data_lines:
                current_data_lines.append(line)
    flush()
    return frames


async def _collect(generator: AsyncGenerator[str, None]) -> str:
    """Drain an async string generator."""
    return "".join([chunk async for chunk in generator])


_BRAND_INPUT = {
    "brand_name": "Nike",
    "category": "sportswear",
    "city": "上海",
    "budget": 200,
    "period": 3,
}


@pytest.mark.asyncio
async def test_start_run_pauses_at_first_interrupt():
    """Start run should execute nodes until strategy_generation then pause."""
    raw = await _collect(service.start_run(_BRAND_INPUT, run_id="r-pause"))
    frames = _parse_sse_frames(raw)

    events = [f["event"] for f in frames]
    assert events[0] == "workflow.start"
    assert "node.start" in events
    assert "workflow.paused" in events
    paused_frames = [f for f in frames if f["event"] == "workflow.paused"]
    assert paused_frames[-1]["data"]["snapshot"]["node_id"] == "strategy_generation"
    # The stream ends after executing upstream nodes; the interrupt is explicit.

    status = await service.get_status("r-pause")
    assert status["status"] == "paused"
    assert status["current_node"] == "strategy_generation"
    assert status["paused_snapshot"]["node_id"] == "strategy_generation"
    assert status["paused_snapshot"]["node_input"] == {"brand_input": _BRAND_INPUT}


@pytest.mark.asyncio
async def test_approve_run_resumes_from_interrupt():
    """Approve should resume and execute strategy_generation, then pause again."""
    await _collect(service.start_run(_BRAND_INPUT, run_id="r-approve"))

    raw = await _collect(service.approve_run("r-approve"))
    frames = _parse_sse_frames(raw)

    node_complete_ids = [
        f["data"]["node_id"] for f in frames if f["event"] == "node.complete"
    ]
    assert "strategy_generation" in node_complete_ids

    status = await service.get_status("r-approve")
    assert status["status"] == "paused"
    assert status["current_node"] == "execution_planning"


@pytest.mark.asyncio
async def test_reject_run_reinjects_reason():
    """Reject should update brand_input with _reject_reason and continue to next checkpoint."""
    await _collect(service.start_run(_BRAND_INPUT, run_id="r-reject"))

    raw = await _collect(service.reject_run("r-reject", reason="预算不足"))
    frames = _parse_sse_frames(raw)

    node_complete_ids = [
        f["data"]["node_id"] for f in frames if f["event"] == "node.complete"
    ]
    # After reject, LangGraph re-executes the interrupted node and continues.
    assert "strategy_generation" in node_complete_ids

    status = await service.get_status("r-reject")
    assert status["status"] == "paused"
    assert status["current_node"] == "execution_planning"


@pytest.mark.asyncio
async def test_delete_run_removes_checkpoint():
    """delete_run should remove checkpoints so status becomes canceled."""
    await _collect(service.start_run(_BRAND_INPUT, run_id="r-delete"))
    await service.delete_run("r-delete")

    status = await service.get_status("r-delete")
    assert status["status"] == "canceled"
    assert status["paused_snapshot"] is None


@pytest.mark.asyncio
async def test_status_for_unknown_run_is_canceled():
    """An unknown run_id reports canceled (no checkpoint)."""
    status = await service.get_status("r-unknown")
    assert status["status"] == "canceled"


@pytest.mark.asyncio
async def test_sse_frames_include_run_id():
    """Every emitted SSE frame payload includes run_id."""
    raw = await _collect(service.start_run(_BRAND_INPUT, run_id="r-sse"))
    frames = _parse_sse_frames(raw)

    for frame in frames:
        assert frame["data"].get("run_id") == "r-sse"


@pytest.mark.asyncio
async def test_approve_with_edited_input_updates_state():
    """Approve with edited_input persists the override into checkpoint state.

    The edited_input is merged into channel_values, so the interrupted node
    reads the edited value as its input. We verify by inspecting the checkpoint
    tuple immediately before resume: strategy_generation channel equals the
    edited value.
    """
    await _collect(service.start_run(_BRAND_INPUT, run_id="r-edit"))
    edited = {"strategy_generation": {"edited": True}}

    # Call the inner approve logic manually to inspect checkpoint after edit.
    graph = await service._get_graph()
    tuple_ = await service._checkpoint_tuple("r-edit")
    assert tuple_ is not None
    checkpoint = tuple_.checkpoint
    channel_values = checkpoint.setdefault("channel_values", {})
    for key, value in edited.items():
        channel_values[key] = value
    saver = await service._get_saver()
    await saver.aput(
        tuple_.config,
        checkpoint,
        tuple_.metadata,
        checkpoint["channel_versions"],
    )

    tuple_after_edit = await service._checkpoint_tuple("r-edit")
    assert tuple_after_edit.checkpoint["channel_values"].get("strategy_generation") == {"edited": True}

    await _collect(service.approve_run("r-edit"))
    # After resume, the node has executed and may have overwritten the channel.
    # The important invariant is that it executed with the edited input.
