"""Tests for prompt optimizer image_context support.

Corresponding OpenSpec: docs/api/paths/prompt-optimizer.yaml
Corresponding in_scope ID: video-generation
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.prompt_optimizer import optimize_prompt

pytestmark = pytest.mark.asyncio


def _mock_llm_response(text: str) -> MagicMock:
    resp = MagicMock()
    resp.content = text
    return resp


async def test_optimize__with_image_context__renders_reference():
    """携带 image_context 时，渲染的 prompt 包含参考图片内容。"""
    captured = {}

    async def _fake_ainvoke(messages):
        captured["system"] = messages[0].content
        return _mock_llm_response('{"optimized": "优化后", "reason": "r"}')

    with patch("app.services.prompt_optimizer.build_chat_model") as mock_build:
        mock_build.return_value.ainvoke = AsyncMock(side_effect=_fake_ainvoke)
        result = await optimize_prompt("一双跑鞋的海报", "image", image_context="一双红色跑鞋，白底")

    assert result.optimized == "优化后"
    assert "一双红色跑鞋，白底" in captured["system"]
    assert "参考图片内容" in captured["system"]


async def test_optimize__without_image_context__no_reference_block():
    """不带 image_context 时，prompt 不含参考图片区块（行为不变）。"""
    captured = {}

    async def _fake_ainvoke(messages):
        captured["system"] = messages[0].content
        return _mock_llm_response('{"optimized": "优化后", "reason": "r"}')

    with patch("app.services.prompt_optimizer.build_chat_model") as mock_build:
        mock_build.return_value.ainvoke = AsyncMock(side_effect=_fake_ainvoke)
        await optimize_prompt("一双跑鞋的海报", "image")

    assert "参考图片内容" not in captured["system"]


async def test_optimize__empty_prompt__raises():
    """空提示词抛 ValueError。"""
    with pytest.raises(ValueError):
        await optimize_prompt("   ", "image")
