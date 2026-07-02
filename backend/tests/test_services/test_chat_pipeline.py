"""End-to-end tests for chat-pipeline workflow.

Corresponding OpenSpec: openspec/changes/add-reply-builder-to-chat-pipeline/specs/reply-builder/spec.md
"""

import pytest

from app.agents import intent_recognition_agent, registry
from app.schemas.reply_builder import ReplyBuilderOutput
from app.services.workflow_service import reload_workflows, run_workflow


@pytest.fixture(autouse=True)
def patch_chat_pipeline_agents(monkeypatch):
    """Patch all chat_pipeline agents with deterministic mocks."""
    monkeypatch.setattr(
        intent_recognition_agent,
        "run_intent_recognition",
        intent_recognition_agent.mock_run_intent_recognition,
    )

    async def extract_handler(state):
        return {"reply": "已提取品牌信息", "is_complete": True}

    async def data_query_handler(state):
        return {"reply": "上海跑步人群约 300 万"}

    async def end_reply_handler(state):
        return {"reply": state.get("reply", "")}

    async def reply_builder_handler(state):
        intent = state.get("intent", {})
        branch_output = state.get("branch_output", {})
        intent_key = intent.get("intent", "chat")

        if intent_key == "generate_plan":
            brand_input = intent.get("brand_input", {})
            return ReplyBuilderOutput(
                reply=(
                    f"好，{brand_input.get('brand_name')} 在 {brand_input.get('city')} "
                    f"做推广，预算 {brand_input.get('budget')} 万，我记下了。"
                )
            ).model_dump()

        if intent_key == "query_data":
            branch = branch_output.get("data_query", {})
            return ReplyBuilderOutput(
                reply=branch.get("reply", "已查询数据")
            ).model_dump()

        if intent_key == "update_context":
            updated = intent.get("updated_fields", {})
            return ReplyBuilderOutput(
                reply=f"已更新 {', '.join(updated.keys())}。"
            ).model_dump()

        if intent_key == "clarify":
            missing = intent.get("missing_fields", [])
            return ReplyBuilderOutput(
                reply=f"还需要确认：{', '.join(missing)}。"
            ).model_dump()

        return ReplyBuilderOutput(reply="你好！有什么可以帮你？").model_dump()

    registry.register("intent_recognition", intent_recognition_agent.mock_run_intent_recognition)
    registry.register("chat_extraction", extract_handler)
    registry.register("data_query", data_query_handler)
    registry.register("end_reply", end_reply_handler)
    registry.register("reply_builder", reply_builder_handler)

    reload_workflows()


@pytest.fixture(autouse=True)
def clear_registry():
    original = registry.snapshot()
    registry.clear()
    yield
    registry.restore(original)


@pytest.mark.asyncio
async def test_chat_pipeline__generate_plan__runs_extract_and_reply_builder():
    result = await run_workflow(
        "chat_pipeline",
        {"message": "我是娃哈哈，想在上海推广果汁，预算300万，周期3个月"},
    )

    assert result["status"] == "completed"
    assert result["outputs"]["intent"]["intent"] == "generate_plan"
    assert "extract" in result["outputs"]
    assert "data_query" not in result["outputs"]
    assert "end_reply" not in result["outputs"]
    assert "reply_builder" in result["outputs"]
    assert "娃哈哈" in result["outputs"]["reply_builder"]["reply"]


@pytest.mark.asyncio
async def test_chat_pipeline__query_data__runs_data_query_and_reply_builder():
    result = await run_workflow(
        "chat_pipeline",
        {"message": "查询上海的盟域数据"},
    )

    assert result["status"] == "completed"
    assert result["outputs"]["intent"]["intent"] == "query_data"
    assert "data_query" in result["outputs"]
    assert "extract" not in result["outputs"]
    assert "end_reply" not in result["outputs"]
    assert "300 万" in result["outputs"]["reply_builder"]["reply"]


@pytest.mark.asyncio
async def test_chat_pipeline__chat__runs_end_reply_and_reply_builder():
    result = await run_workflow(
        "chat_pipeline",
        {"message": "你好"},
    )

    assert result["status"] == "completed"
    assert result["outputs"]["intent"]["intent"] == "chat"
    assert "end_reply" in result["outputs"]
    assert "extract" not in result["outputs"]
    assert "data_query" not in result["outputs"]
    assert "你好" in result["outputs"]["reply_builder"]["reply"]


@pytest.mark.asyncio
async def test_chat_pipeline__clarify__runs_end_reply_and_reply_builder():
    result = await run_workflow(
        "chat_pipeline",
        {"message": "我想做营销方案"},
    )

    assert result["status"] == "completed"
    assert result["outputs"]["intent"]["intent"] == "clarify"
    assert "end_reply" in result["outputs"]
    assert "extract" not in result["outputs"]
    assert "brand_name" in result["outputs"]["reply_builder"]["reply"]


@pytest.mark.asyncio
async def test_chat_pipeline__update_context__runs_end_reply_and_reply_builder():
    result = await run_workflow(
        "chat_pipeline",
        {
            "message": "改成北京",
            "context": {"brand_input": {"brand_name": "娃哈哈", "city": "上海"}},
        },
    )

    assert result["status"] == "completed"
    assert result["outputs"]["intent"]["intent"] == "update_context"
    assert "end_reply" in result["outputs"]
    assert "city" in result["outputs"]["reply_builder"]["reply"]
