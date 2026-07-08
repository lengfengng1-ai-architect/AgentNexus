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
    if "生成视频" in message or "图生视频" in message or "做成视频" in message or "成视频" in message:
        ctx_img = state.get("context", {}).get("image_url") if isinstance(state.get("context"), dict) else None
        if ctx_img:
            return {
                "intent": "generate_video",
                "confidence": 0.9,
                "brand_input": {},
                "missing_fields": [],
                "reply": "好的，正在准备生成视频。",
                "image_url": ctx_img,
                "video_prompt": message,
            }
        return {
            "intent": "generate_video",
            "confidence": 0.85,
            "brand_input": {},
            "missing_fields": ["image_url"],
            "reply": "好的，请提供需要生成视频的图片。",
            "image_url": None,
            "video_prompt": None,
        }
    # 没有具体描述 → chat 反问（不应判定为 text_to_video / text_to_image）
    if message.strip() in ("生成图片", "我要生成图片", "帮我生成图片", "帮我生成一张图片"):
        return {
            "intent": "chat",
            "confidence": 0.9,
            "brand_input": {},
            "missing_fields": [],
            "reply": "请问您希望生成什么样的图片？请提供详细的图片描述。",
        }
    if message.strip() in ("生成一段视频",):
        return {
            "intent": "chat",
            "confidence": 0.9,
            "brand_input": {},
            "missing_fields": [],
            "reply": "请问您希望生成什么样的视频？请提供详细的视频描述。",
        }
    if "文生视频" in message or ("生成" in message and "视频" in message and "图片" not in message):
        return {
            "intent": "text_to_video",
            "confidence": 0.85,
            "brand_input": {},
            "missing_fields": [],
            "reply": "好的，正在为您跳转到视频生成页面。",
            "generation_prompt": message,
        }
    if "画" in message or "生成图片" in message or "海报" in message or "图片" in message:
        return {
            "intent": "text_to_image",
            "confidence": 0.85,
            "brand_input": {},
            "missing_fields": [],
            "reply": "好的，正在为您跳转到图片生成页面。",
            "generation_prompt": message,
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
async def test_intent__generate_video__with_image_url():
    result = await intent_recognition_agent.run_intent_recognition({
        "message": "把这张图做成视频",
        "context": {"image_url": "https://example.com/img.jpg"},
    })
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "generate_video"
    assert output.image_url == "https://example.com/img.jpg"
    assert output.confidence >= 0.8
    assert "image_url" not in output.missing_fields


@pytest.mark.asyncio
async def test_intent__generate_video__missing_image_url():
    result = await intent_recognition_agent.run_intent_recognition({
        "message": "帮我生成视频",
    })
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "generate_video"
    assert output.image_url is None
    assert "image_url" in output.missing_fields
    assert output.reply


@pytest.mark.asyncio
async def test_intent__text_to_video__returns_text_to_video():
    result = await intent_recognition_agent.run_intent_recognition({
        "message": "帮我用文字生成一段夕阳海滩的视频",
    })
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "text_to_video"
    assert output.generation_prompt
    assert output.confidence >= 0.8


@pytest.mark.asyncio
async def test_intent__text_to_image__returns_text_to_image():
    result = await intent_recognition_agent.run_intent_recognition({
        "message": "帮我画一张赛博朋克风格的海报",
    })
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "text_to_image"
    assert output.generation_prompt
    assert output.confidence >= 0.8


@pytest.mark.asyncio
async def test_intent__text_to_image__no_description_returns_chat():
    result = await intent_recognition_agent.run_intent_recognition({
        "message": "我要生成图片",
    })
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "chat"
    assert "图片" in output.reply


@pytest.mark.asyncio
async def test_intent__text_to_video__no_description_returns_chat():
    result = await intent_recognition_agent.run_intent_recognition({
        "message": "生成一段视频",
    })
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "chat"
    assert "视频" in output.reply


@pytest.mark.asyncio
async def test_intent__missing_message__raises_value_error():
    with pytest.raises(ValueError, match="Missing required input: message"):
        await intent_recognition_agent.run_intent_recognition({})
