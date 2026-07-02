"""Tests for reply builder agent.

Corresponding OpenSpec: openspec/changes/add-reply-builder-to-chat-pipeline/specs/reply-builder/spec.md
"""

import pytest

from app.agents import reply_builder_agent
from app.schemas.reply_builder import ReplyBuilderOutput


@pytest.mark.asyncio
async def test_reply_builder__generate_plan__acknowledges_brand_input():
    state = {
        "message": "我是 Nike，想在上海推广跑步鞋，预算 50 万，周期 1 个月",
        "intent": {
            "intent": "generate_plan",
            "brand_input": {
                "brand_name": "Nike",
                "category": "跑步鞋",
                "city": "上海",
                "budget": 50,
                "period": 1,
            },
        },
        "branch_output": {"extract": {"is_complete": True}},
    }

    result = await reply_builder_agent.mock_run_reply_builder(state)
    output = ReplyBuilderOutput.model_validate(result)

    assert "Nike" in output.reply
    assert "上海" in output.reply
    assert "50" in output.reply
    assert "1" in output.reply


@pytest.mark.asyncio
async def test_reply_builder__query_data__uses_branch_reply():
    state = {
        "message": "查询上海的跑步人群规模",
        "intent": {
            "intent": "query_data",
            "brand_input": {"city": "上海"},
        },
        "branch_output": {
            "data_query": {"reply": "上海跑步人群约 300 万，月活 120 万。"}
        },
    }

    result = await reply_builder_agent.mock_run_reply_builder(state)
    output = ReplyBuilderOutput.model_validate(result)

    assert "300 万" in output.reply


@pytest.mark.asyncio
async def test_reply_builder__query_data__falls_back_when_no_branch_reply():
    state = {
        "message": "查询数据",
        "intent": {
            "intent": "query_data",
            "brand_input": {"city": "北京"},
        },
        "branch_output": {"data_query": {}},
    }

    result = await reply_builder_agent.mock_run_reply_builder(state)
    output = ReplyBuilderOutput.model_validate(result)

    assert "北京" in output.reply


@pytest.mark.asyncio
async def test_reply_builder__clarify__lists_missing_fields():
    state = {
        "message": "我想做方案",
        "intent": {
            "intent": "clarify",
            "missing_fields": ["brand_name", "budget"],
        },
        "branch_output": {"end_reply": {}},
    }

    result = await reply_builder_agent.mock_run_reply_builder(state)
    output = ReplyBuilderOutput.model_validate(result)

    assert "brand_name" in output.reply
    assert "budget" in output.reply


@pytest.mark.asyncio
async def test_reply_builder__update_context__mentions_updated_fields():
    state = {
        "message": "改成北京",
        "intent": {
            "intent": "update_context",
            "updated_fields": {"city": "北京"},
        },
        "branch_output": {"end_reply": {}},
    }

    result = await reply_builder_agent.mock_run_reply_builder(state)
    output = ReplyBuilderOutput.model_validate(result)

    assert "北京" in output.reply
    assert "已更新" in output.reply


@pytest.mark.asyncio
async def test_reply_builder__chat__returns_welcome_reply():
    state = {
        "message": "你好",
        "intent": {"intent": "chat"},
        "branch_output": {"end_reply": {"reply": "你好！"}},
    }

    result = await reply_builder_agent.mock_run_reply_builder(state)
    output = ReplyBuilderOutput.model_validate(result)

    assert "AllyGo" in output.reply


@pytest.mark.asyncio
async def test_reply_builder__missing_message__raises_value_error():
    with pytest.raises(ValueError, match="Missing required input: message"):
        await reply_builder_agent.run_reply_builder({})


@pytest.mark.asyncio
async def test_reply_builder__resolve_branch_output__returns_empty_for_unknown_intent():
    result = reply_builder_agent._resolve_branch_output(
        {"intent": "unknown"}, {"extract": {}}
    )
    assert result == {}


def test_reply_builder__resolve_branch_output__returns_active_branch():
    result = reply_builder_agent._resolve_branch_output(
        {"intent": "query_data"},
        {"data_query": {"reply": "data"}, "extract": {"reply": "extract"}},
    )
    assert result == {"reply": "data"}
