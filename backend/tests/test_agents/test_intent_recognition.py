"""Tests for intent recognition agent.

Corresponding OpenSpec: openspec/changes/add-intent-recognition-agent/specs/intent-recognition/spec.md
"""

import pytest

from app.agents import intent_recognition_agent
from app.agents.mock_intent_recognition_agent import mock_run_intent_recognition
from app.schemas.intent import IntentRecognitionOutput


@pytest.fixture(autouse=True)
def patch_intent_agent(monkeypatch):
    """Use deterministic mock instead of live LLM."""
    monkeypatch.setattr(
        intent_recognition_agent,
        "run_intent_recognition",
        mock_run_intent_recognition,
    )


@pytest.mark.asyncio
async def test_intent__generate_plan__returns_full_brand_input():
    result = await intent_recognition_agent.run_intent_recognition(
        {"message": "我是娃哈哈，想在上海推广果汁，预算300万，周期3个月"}
    )
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "generate_plan"
    assert output.brand_input.brand_name == "娃哈哈"
    assert output.brand_input.city == "上海"
    assert output.brand_input.budget == 300
    assert output.brand_input.period == 3
    assert output.missing_fields == []


@pytest.mark.asyncio
async def test_intent__query_data__returns_query_intent():
    result = await intent_recognition_agent.run_intent_recognition(
        {"message": "查询上海的盟域数据"}
    )
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "query_data"
    assert output.brand_input.city == "上海"
    assert output.reply


@pytest.mark.asyncio
async def test_intent__chat__returns_welcome_reply():
    result = await intent_recognition_agent.run_intent_recognition({"message": "你好"})
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "chat"
    assert output.reply
    assert "AllyGo" in output.reply


@pytest.mark.asyncio
async def test_intent__clarify__lists_missing_fields():
    result = await intent_recognition_agent.run_intent_recognition(
        {"message": "我想做营销方案"}
    )
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "clarify"
    assert output.missing_fields
    assert "brand_name" in output.missing_fields


@pytest.mark.asyncio
async def test_intent__update_context__updates_city():
    result = await intent_recognition_agent.run_intent_recognition(
        {
            "message": "改成北京",
            "context": {"brand_input": {"brand_name": "娃哈哈", "city": "上海"}},
        }
    )
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "update_context"
    assert output.brand_input.city == "北京"
    assert output.updated_fields.get("city") == "北京"


@pytest.mark.asyncio
async def test_intent__missing_message__raises_value_error():
    with pytest.raises(ValueError, match="Missing required input: message"):
        await intent_recognition_agent.run_intent_recognition({})
