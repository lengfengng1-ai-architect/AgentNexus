"""End-to-end tests for chat-pipeline workflow.

Corresponding OpenSpec: openspec/changes/add-intent-recognition-agent/specs/intent-recognition/spec.md
"""

import pytest

from app.agents import intent_recognition_agent, registry
from app.services.workflow_service import reload_workflows, run_workflow


@pytest.fixture(autouse=True)
def patch_intent_agent(monkeypatch):
    """Use deterministic mock instead of live LLM."""
    monkeypatch.setattr(
        intent_recognition_agent,
        "run_intent_recognition",
        intent_recognition_agent.mock_run_intent_recognition,
    )
    registry.register("intent_recognition", intent_recognition_agent.mock_run_intent_recognition)
    reload_workflows()


@pytest.mark.asyncio
async def test_chat_pipeline__generate_plan__runs_extract():
    result = await run_workflow(
        "chat_pipeline",
        {"message": "我是娃哈哈，想在上海推广果汁，预算300万，周期3个月"},
    )

    assert result["status"] == "completed"
    assert result["outputs"]["intent"]["intent"] == "generate_plan"
    assert "extract" in result["outputs"]
    assert "data_query" not in result["outputs"]
    assert "end_reply" not in result["outputs"]


@pytest.mark.asyncio
async def test_chat_pipeline__query_data__runs_data_query():
    result = await run_workflow(
        "chat_pipeline",
        {"message": "查询上海的盟域数据"},
    )

    assert result["status"] == "completed"
    assert result["outputs"]["intent"]["intent"] == "query_data"
    assert "data_query" in result["outputs"]
    assert "extract" not in result["outputs"]
    assert "end_reply" not in result["outputs"]


@pytest.mark.asyncio
async def test_chat_pipeline__chat__runs_end_reply():
    result = await run_workflow(
        "chat_pipeline",
        {"message": "你好"},
    )

    assert result["status"] == "completed"
    assert result["outputs"]["intent"]["intent"] == "chat"
    assert "end_reply" in result["outputs"]
    assert "extract" not in result["outputs"]
    assert "data_query" not in result["outputs"]


@pytest.mark.asyncio
async def test_chat_pipeline__clarify__runs_end_reply():
    result = await run_workflow(
        "chat_pipeline",
        {"message": "我想做营销方案"},
    )

    assert result["status"] == "completed"
    assert result["outputs"]["intent"]["intent"] == "clarify"
    assert "end_reply" in result["outputs"]
    assert "extract" not in result["outputs"]
