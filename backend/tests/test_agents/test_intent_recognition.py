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
    # market_research must be checked before generate_plan since "分析" can co-occur with brand fields
    if "分析" in message or "调研" in message or "竞品" in message:
        if "竞品" in message and "饮料" in message:
            return {
                "intent": "market_research",
                "confidence": 0.9,
                "brand_input": {"category": "饮料"},
                "missing_fields": [],
                "market_name": "娃哈哈",
                "reply": "好的！我已了解研究目标：娃哈哈（饮料）。请点击「开始分析」按钮进行市场分析。",
            }
        if "调研" in message:
            return {
                "intent": "market_research",
                "confidence": 0.85,
                "brand_input": {},
                "missing_fields": ["market_name", "category"],
                "market_name": None,
                "reply": "好的，我来帮您做市场分析。请问您想分析哪个品牌或赛道？以及属于什么品类？",
            }
        if "电解质" in message:
            return {
                "intent": "market_research",
                "confidence": 0.88,
                "brand_input": {"category": "饮料"},
                "missing_fields": ["market_name"],
                "market_name": None,
                "reply": "请问您想分析哪个品牌或赛道？",
            }
        if "行业" in message or "赛道" in message:
            return {
                "intent": "market_research",
                "confidence": 0.85,
                "brand_input": {},
                "missing_fields": ["market_name", "category"],
                "market_name": None,
                "reply": "好的，我来帮您做市场分析。请问您想分析哪个品牌或赛道？以及属于什么品类？",
            }
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
    if "分析" in message or "调研" in message or "竞品" in message:
        if "竞品" in message and "饮料" in message:
            return {
                "intent": "market_research",
                "confidence": 0.9,
                "brand_input": {"category": "饮料"},
                "missing_fields": [],
                "market_name": "娃哈哈",
                "reply": "好的！我已了解研究目标：娃哈哈（饮料）。请点击「开始分析」按钮进行市场分析。",
            }
        if "调研" in message:
            return {
                "intent": "market_research",
                "confidence": 0.85,
                "brand_input": {},
                "missing_fields": ["market_name", "category"],
                "market_name": None,
                "reply": "好的，我来帮您做市场分析。请问您想分析哪个品牌或赛道？以及属于什么品类？",
            }
        if "电解质" in message:
            return {
                "intent": "market_research",
                "confidence": 0.88,
                "brand_input": {"category": "饮料"},
                "missing_fields": ["market_name"],
                "market_name": None,
                "reply": "请问您想分析哪个品牌或赛道？",
            }
        if "行业" in message or "赛道" in message:
            return {
                "intent": "market_research",
                "confidence": 0.85,
                "brand_input": {},
                "missing_fields": ["market_name", "category"],
                "market_name": None,
                "reply": "好的，我来帮您做市场分析。请问您想分析哪个品牌或赛道？以及属于什么品类？",
            }
    if "开始分析" in message:
        # 字段齐全的 market_research
        ctx = state.get("context", {}) if isinstance(state.get("context"), dict) else {}
        mn = ctx.get("market_name") if isinstance(ctx, dict) else None
        return {
            "intent": "market_research",
            "confidence": 0.95,
            "brand_input": {"category": "饮料"},
            "missing_fields": [],
            "market_name": mn or "娃哈哈",
            "reply": "",
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


# ── market_research ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_intent__market_research__with_full_fields__returns_market_research():
    result = await intent_recognition_agent.run_intent_recognition({
        "message": "帮我分析一下娃哈哈竞品，饮料",
    })
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "market_research"
    assert output.market_name == "娃哈哈"
    assert output.brand_input.category == "饮料"
    assert output.missing_fields == []
    assert "开始分析" in output.reply


@pytest.mark.asyncio
async def test_intent__market_research__missing_both__asks_questions():
    result = await intent_recognition_agent.run_intent_recognition({
        "message": "帮我做个市场调研",
    })
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "market_research"
    assert output.market_name is None
    assert "market_name" in output.missing_fields
    assert "category" in output.missing_fields
    assert "品类" in output.reply


@pytest.mark.asyncio
async def test_intent__market_research__missing_market_name__asks_market_name():
    result = await intent_recognition_agent.run_intent_recognition({
        "message": "帮我分析电解质饮料的市场",
    })
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "market_research"
    assert output.market_name is None
    assert "market_name" in output.missing_fields
    assert "category" not in output.missing_fields


@pytest.mark.asyncio
async def test_intent__market_research__not_overridden_by_generate_plan():
    """market_research should NOT be overridden to generate_plan even when brand fields are fully filled."""
    result = await intent_recognition_agent.run_intent_recognition({
        "message": "分析一下娃哈哈竞品，饮料，目标上海，预算100万，周期3个月",
    })
    output = IntentRecognitionOutput.model_validate(result)

    # Even though brand fields are filled, "分析" keyword should keep it as market_research
    assert output.intent == "market_research"


@pytest.mark.asyncio
async def test_intent__market_research__fills_market_name_from_context():
    result = await intent_recognition_agent.run_intent_recognition({
        "message": "开始分析",
        "context": {"market_name": "娃哈哈"},
    })
    output = IntentRecognitionOutput.model_validate(result)

    assert output.intent == "market_research"
    assert output.market_name == "娃哈哈"


# ── image fallback normalization ─────────────────────────────────────────


def test_normalize__empty_message_with_image_urls__asks_clarify_options():
    """上传图片无文字 → clarify 反问三选一，不直接判生成意图。"""
    output = IntentRecognitionOutput(
        intent="chat",
        confidence=0.5,
        reply="你好！",
        brand_input={},
    )
    normalized = intent_recognition_agent._normalize_intent_output(
        output, image_urls=["oss://uploads/test.png"]
    )

    assert normalized.intent == "clarify"
    assert normalized.missing_fields == []
    assert normalized.confidence >= 0.85
    assert "参数介绍图" in normalized.reply
    assert "宣传图" in normalized.reply
    assert "宣传短片" in normalized.reply


def test_normalize__clarify_with_image_urls__keeps_clarify_options():
    """clarify + 图片 → 保持 clarify 反问，不被品牌字段缺失覆盖。"""
    output = IntentRecognitionOutput(
        intent="clarify",
        confidence=0.6,
        reply="为了生成营销方案，我还需要了解：品牌名",
        brand_input={},
        missing_fields=["brand_name"],
    )
    normalized = intent_recognition_agent._normalize_intent_output(
        output, image_urls=["oss://uploads/test.png"]
    )

    assert normalized.intent == "clarify"
    assert "参数介绍图" in normalized.reply
    assert "宣传短片" in normalized.reply


def test_normalize__no_image_urls__keep_original_chat():
    output = IntentRecognitionOutput(
        intent="chat",
        confidence=0.9,
        reply="你好！",
        brand_input={},
    )
    normalized = intent_recognition_agent._normalize_intent_output(output)

    assert normalized.intent == "chat"
    assert normalized.image_url is None


def test_normalize__generate_video_with_image_urls__unchanged():
    output = IntentRecognitionOutput(
        intent="generate_video",
        confidence=0.9,
        reply="好的。",
        brand_input={},
        image_url="oss://uploads/test.png",
        video_prompt="做成视频",
    )
    normalized = intent_recognition_agent._normalize_intent_output(
        output, image_urls=["oss://uploads/test.png"]
    )

    assert normalized.intent == "generate_video"
    assert normalized.image_url == "oss://uploads/test.png"
    assert "image_url" not in normalized.missing_fields


def test_normalize__text_to_image_backfills_reference_image():
    """以图生图：text_to_image 无 image_url 时从上下文参考图回填。"""
    output = IntentRecognitionOutput(
        intent="text_to_image",
        confidence=0.85,
        reply="好的。",
        brand_input={},
        image_url=None,
        generation_prompt="基于这张图做海报",
    )
    normalized = intent_recognition_agent._normalize_intent_output(
        output, image_urls=["oss://uploads/ref.png"]
    )

    assert normalized.intent == "text_to_image"
    assert normalized.image_url == "oss://uploads/ref.png"


def test_normalize__generate_video_backfills_reference_image():
    """以图生视频：generate_video 无 image_url 时从上下文参考图回填，不再追问。"""
    output = IntentRecognitionOutput(
        intent="generate_video",
        confidence=0.85,
        reply="好的。",
        brand_input={},
        image_url=None,
        video_prompt="做成宣传短片",
    )
    normalized = intent_recognition_agent._normalize_intent_output(
        output, image_urls=["oss://uploads/ref.png"]
    )

    assert normalized.intent == "generate_video"
    assert normalized.image_url == "oss://uploads/ref.png"
    assert "image_url" not in normalized.missing_fields
