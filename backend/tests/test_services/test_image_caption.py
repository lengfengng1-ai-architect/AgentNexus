"""Tests for image caption service (qwen-vl-plus).

Corresponding OpenSpec: openspec/changes/image-understanding-caption
Corresponding in_scope ID: video-generation
"""

import asyncio
from pathlib import Path
from unittest.mock import MagicMock, patch

import openai
import pytest

from app.services.image_caption import generate_caption

pytestmark = pytest.mark.asyncio


def _png_file(tmp_path: Path) -> Path:
    # 1x1 透明 PNG
    data = bytes.fromhex(
        "89504e470d0a1a0a0000000d494844520000000100000001080600000"
        "01f15c4890000000d49444154789c626001000000ffff030000060005"
        "57bfabd40000000049454e44ae426082"
    )
    p = tmp_path / "shoe.png"
    p.write_bytes(data)
    return p


def _mock_vl_response(text: str) -> MagicMock:
    resp = MagicMock()
    resp.choices = [MagicMock()]
    resp.choices[0].message.content = text
    return resp


async def test_generate_caption__success(tmp_path, monkeypatch):
    """VL 返回描述时透传文本。"""
    img = _png_file(tmp_path)
    monkeypatch.setattr("app.config.settings.settings.upload_dir", str(tmp_path))
    with patch("app.services.image_caption.openai.OpenAI") as mock_cls:
        mock_cls.return_value.chat.completions.create.return_value = _mock_vl_response("一双红色跑鞋，白底")
        caption = await generate_caption(img)
    assert caption == "一双红色跑鞋，白底"
    # 确认用了 base64 内联而非公网 URL
    call = mock_cls.return_value.chat.completions.create.call_args
    content = call.kwargs["messages"][0]["content"]
    assert content[0]["image_url"]["url"].startswith("data:image/png;base64,")


async def test_generate_caption__timeout_returns_none(tmp_path, monkeypatch):
    """VL 超时降级为 None。"""
    img = _png_file(tmp_path)
    monkeypatch.setattr("app.config.settings.settings.upload_dir", str(tmp_path))
    with patch("app.services.image_caption.openai.OpenAI") as mock_cls, \
         patch("app.services.image_caption._TIMEOUT_SECONDS", 0.05):
        mock_cls.return_value.chat.completions.create.side_effect = openai.APITimeoutError(request=MagicMock())
        caption = await generate_caption(img)
    assert caption is None


async def test_generate_caption__api_error_returns_none(tmp_path, monkeypatch):
    """VL 返回错误降级为 None。"""
    img = _png_file(tmp_path)
    monkeypatch.setattr("app.config.settings.settings.upload_dir", str(tmp_path))
    with patch("app.services.image_caption.openai.OpenAI") as mock_cls:
        mock_cls.return_value.chat.completions.create.side_effect = openai.APIError(
            message="boom", request=MagicMock(), body=None
        )
        caption = await generate_caption(img)
    assert caption is None


async def test_generate_caption__missing_file_returns_none(tmp_path, monkeypatch):
    """图片文件不存在降级为 None（不抛异常）。"""
    monkeypatch.setattr("app.config.settings.settings.upload_dir", str(tmp_path))
    caption = await generate_caption(tmp_path / "nonexistent.png")
    assert caption is None


async def test_generate_caption__empty_response_returns_none(tmp_path, monkeypatch):
    """VL 返回空字符串降级为 None。"""
    img = _png_file(tmp_path)
    monkeypatch.setattr("app.config.settings.settings.upload_dir", str(tmp_path))
    with patch("app.services.image_caption.openai.OpenAI") as mock_cls:
        mock_cls.return_value.chat.completions.create.return_value = _mock_vl_response("")
        caption = await generate_caption(img)
    assert caption is None
