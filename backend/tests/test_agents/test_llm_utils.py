"""Tests for llm_utils helpers."""
from unittest.mock import MagicMock, patch

import pytest

from app.agents.llm_utils import build_chat_model, invoke_json


class _AsyncMock:
    def __init__(self, return_value):
        self.return_value = return_value

    async def __call__(self, *args, **kwargs):
        return self.return_value


def test_build_chat_model_agnes_branch():
    """build_chat_model uses agnes provider settings."""
    with patch("app.agents.llm_utils.settings.llm_provider", "agnes"):
        with patch("app.agents.llm_utils.init_chat_model") as mock_init:
            build_chat_model()
            mock_init.assert_called_once()
            kwargs = mock_init.call_args.kwargs
            assert kwargs["model"] == "agnes-2.0-flash"
            assert kwargs["model_provider"] == "openai"


def test_build_chat_model_default_branch():
    """build_chat_model falls back to dashscope."""
    with patch("app.agents.llm_utils.settings.llm_provider", "dashscope"):
        with patch("app.agents.llm_utils.init_chat_model") as mock_init:
            build_chat_model()
            kwargs = mock_init.call_args.kwargs
            assert kwargs["model"] == "qwen-turbo"


@pytest.mark.asyncio
async def test_invoke_json_parses_plain_json():
    """invoke_json parses plain JSON content."""
    mock_msg = MagicMock()
    mock_msg.content = '{"key": "value"}'
    with patch("app.agents.llm_utils.build_chat_model") as mock_build:
        mock_build.return_value.ainvoke = _AsyncMock(mock_msg)
        result = await invoke_json("system", "user")
    assert result == {"key": "value"}


@pytest.mark.asyncio
async def test_invoke_json_parses_fenced_json():
    """invoke_json strips markdown fences before parsing."""
    mock_msg = MagicMock()
    mock_msg.content = '```json\n{"key": "value"}\n```'
    with patch("app.agents.llm_utils.build_chat_model") as mock_build:
        mock_build.return_value.ainvoke = _AsyncMock(mock_msg)
        result = await invoke_json("system", "user")
    assert result == {"key": "value"}
