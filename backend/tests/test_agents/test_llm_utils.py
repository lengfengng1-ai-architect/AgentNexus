"""Tests for llm_utils helpers — build_chat_model caching and stream_chat."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.llm_utils import (
    build_chat_model,
    clear_model_cache,
    invoke_json,
    stream_chat,
)


class _AsyncMock:
    def __init__(self, return_value):
        self.return_value = return_value

    async def __call__(self, *args, **kwargs):
        return self.return_value


@pytest.fixture(autouse=True)
def auto_clear_cache():
    clear_model_cache()
    yield
    clear_model_cache()


# ── Task 2.1 + 4.5: build_chat_model singleton ────────────────────────


def test_build_chat_model_caches_instance():
    """Same provider returns same model object (cached)."""
    with patch("app.agents.llm_utils.settings.llm_provider", "dashscope"):
        with patch("app.agents.llm_utils.init_chat_model") as mock_init:
            m1 = mock_init.return_value
            m2 = mock_init.return_value

            r1 = build_chat_model()
            r2 = build_chat_model()

            # Only init once
            assert mock_init.call_count == 1
            # Same cached instance
            assert r1 is r2


def test_build_chat_model_different_providers_different_instances():
    """Switching provider creates a new instance; previous remains cached."""
    with patch("app.agents.llm_utils.settings") as mock_settings:
        with patch("app.agents.llm_utils.init_chat_model") as mock_init:
            # Use side_effect so each call returns a distinct MagicMock
            instances = [MagicMock(), MagicMock()]
            mock_init.side_effect = instances

            mock_settings.llm_provider = "dashscope"
            mock_settings.dashscope_model = "qwen-turbo"
            mock_settings.dashscope_api_key = ""
            mock_settings.dashscope_base_url = ""

            a1 = build_chat_model()

            mock_settings.llm_provider = "myself"
            mock_settings.myself_model = "deepseek-v4-flash"
            mock_settings.myself_api_key = ""
            mock_settings.myself_base_url = ""

            b1 = build_chat_model()

            # Switch back to dashscope — should return the *cached* instance
            mock_settings.llm_provider = "dashscope"
            a2 = build_chat_model()

            assert mock_init.call_count == 2
            assert a1 is a2  # cached dashscope instance
            assert b1 is not a1


def test_clear_model_cache_forces_reinit():
    """clear_model_cache removes cached instances."""
    with patch("app.agents.llm_utils.settings.llm_provider", "dashscope"):
        with patch("app.agents.llm_utils.init_chat_model") as mock_init:
            m1 = build_chat_model()
            clear_model_cache()
            m2 = build_chat_model()
            assert mock_init.call_count == 2


# ── Task 2.2: stream_chat yields text tokens ──────────────────────────


class _AsyncChunkIter:
    """Simulate langchain model.astream, yielding chunks with .content."""

    def __init__(self, chunks: list[str]):
        self._chunks = list(chunks)

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self._chunks:
            raise StopAsyncIteration
        chunk = self._chunks.pop(0)
        # Build a fake chunk with the .content attribute like AIMessageChunk
        msg = MagicMock()
        msg.content = chunk
        return msg


@pytest.mark.asyncio
async def test_stream_chat_yields_strings():
    """stream_chat returns each non-empty token text yield."""
    fake_chunks = ["Hello", " ", "world", "!"]
    mock_model = MagicMock()
    mock_model.astream = lambda msgs: _AsyncChunkIter(fake_chunks)

    with patch("app.agents.llm_utils.build_chat_model", return_value=mock_model):
        tokens = []
        async for token in stream_chat("system", "user"):
            tokens.append(token)

    assert tokens == fake_chunks


@pytest.mark.asyncio
async def test_stream_chat_skips_empty():
    """Empty chunks from model (e.g. during thinking) are skipped."""
    mock_model = MagicMock()
    mock_model.astream = lambda msgs: _AsyncChunkIter(["a", "", "b", "", "c"])

    with patch("app.agents.llm_utils.build_chat_model", return_value=mock_model):
        tokens = []
        async for token in stream_chat("system", "user"):
            tokens.append(token)

    assert tokens == ["a", "b", "c"]


# ── Task 2.3: max_tokens ──────────────────────────────────────────────


def test_build_chat_model_passes_max_tokens():
    """All providers pass max_tokens=16384."""
    with patch("app.agents.llm_utils.settings.llm_provider", "dashscope"):
        with patch("app.agents.llm_utils.init_chat_model") as mock_init:
            build_chat_model()
            kwargs = mock_init.call_args.kwargs
            assert kwargs["max_tokens"] == 16384


# ── Existing invoke_json tests (unchanged) ────────────────────────────


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
