"""Tests for intent recognition agent.

Corresponding OpenSpec: openspec/changes/add-intent-recognition-agent/specs/intent-recognition/spec.md
"""

import pytest

from app.agents import intent_recognition_agent
from app.schemas.intent import IntentRecognitionOutput


async def _fake_intent(state: dict) -> dict:
    """Deterministic mock for intent recognition; avoids live LLM calls."""
    if not state.get("message"):
        raise ValueError("Missing required input: message")
    message = state.get("message", "")
    if "娃哈哈" in message and "上海" in message:
        return {
            "intent": "generate_plan",
            "confidence": 0.95,
            "brand_input": {
                "brand_name": "娃哈哈",
                "category": "饮料",
                "city": "上海",
                "budget": 300,
                "period": 3,
            },
            "missing_fields": [],
            "reply": "",
        }
    if "查询" in message or "数据" in message:
        return {
            "intent": "query_data",
            "confidence": 0.8,
            "brand_input": {"city": "上海"},
            "missing_fields": [],
            "reply": "已识别到查询意图，正在为您查询数据。",
        }
    if "你好" in message:
        return {
            "intent": "chat",
            "confidence": 0.9,
            "brand_input": {},
            "missing_fields": [],
            "reply": "你好！欢迎使用 AllyGo 营销方案助手。",
        }
    if "营销方案" in message:
        return {
            "intent": "clarify",
            "confidence": 0.85,
            "brand_input": {},
            "missing_fields": ["brand_name", "city"],
            "reply": "请问您的品牌名称和目标城市是？",
        }
    if "改成" in message:
        return {
            "intent": "update_context",
            "confidence": 0.9,
            "brand_input": {"brand_name": "娃哈哈", "city": "北京"},
            "updated_fields": {"city": "北京"},
            "missing_fields": [],
            "reply": "已更新目标城市为北京。",
        }
    return {
        "intent": "chat",
        "confidence": 0.5,
        "brand_input": {},
        "missing_fields": [],
        "reply": "",
    }


@pytest.fixture(autouse=True)
def patch_intent_agent(monkeypatch):
    """Use deterministic mock instead of live LLM."""
    monkeypatch.setattr(
        intent_recognition_agent,
        "run_intent_recognition",
        _fake_intent,
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
