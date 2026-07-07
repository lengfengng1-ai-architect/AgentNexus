"""Tests for image generation agent.

Coverage:
  - generate_image_prompt: LLM prompt 生成逻辑
  - call_qwen_image_api: HTTP 调用 Qwen-Image API
  - run_image_generation: Agent 入口函数

Mock 策略:
  - LLM 层（build_chat_model）通过 monkeypatch mock 返回值
  - HTTP 层（httpx.AsyncClient）通过 respx 或 monkeypatch mock
"""

import pytest

from app.agents.image_generation_agent import (
    generate_image_prompt,
    call_qwen_image_api,
    run_image_generation,
    _DEFAULT_MODEL,
    _DEFAULT_SIZE,
)


# ── Fixtures ──────────────────────────────────────────────────────────────


class _FakeLLMResponse:
    """模拟 LLM 的 ainvoke 返回值。"""

    def __init__(self, content: str):
        self.content = content


class _FakeLLM:
    """模拟 build_chat_model() 返回的 LLM 对象。"""

    async def ainvoke(self, messages, **_kw):
        return _FakeLLMResponse(
            "一张充满运动感的画面，阳光明媚的户外运动场，年轻人在挥洒汗水，"
            "背景是现代化的城市天际线，整体色调温暖明亮，充满活力和激情。"
        )


@pytest.fixture
def mock_llm(monkeypatch):
    """Mock LLM 层，避免实际调用模型 API。"""
    import app.agents.image_generation_agent as agent_mod

    monkeypatch.setattr(agent_mod, "_get_llm", lambda: _FakeLLM())


@pytest.fixture
def mock_httpx_post(monkeypatch):
    """Mock httpx.AsyncClient.post，模拟 Qwen-Image API 返回。"""

    class _FakeResponse:
        status_code = 200

        def json(self):
            return {
                "output": {
                    "choices": [{
                        "finish_reason": "stop",
                        "message": {
                            "role": "assistant",
                            "content": [{"image": "https://example.com/generated.png"}],
                        },
                    }],
                },
                "usage": {"image_count": 1, "width": 2048, "height": 2048},
                "request_id": "mock-request-001",
            }

    class _FakeClient:
        def __init__(self, **_kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_a):
            pass

        async def post(self, *_a, **_kw):
            return _FakeResponse()

    monkeypatch.setattr("app.agents.image_generation_agent.AsyncClient", lambda **kw: _FakeClient())


# ── Tests: generate_image_prompt ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_image_prompt_default_type(mock_llm):
    """默认 image_type 应为 main_visual。"""
    prompt = await generate_image_prompt("测试方案内容", "main_visual")
    assert isinstance(prompt, str)
    assert len(prompt) > 10


@pytest.mark.asyncio
async def test_generate_image_prompt_truncates_long_content(mock_llm):
    """超过 3000 字符的内容应被截断。"""
    long_content = "A" * 5000
    prompt = await generate_image_prompt(long_content, "poster")
    assert isinstance(prompt, str)
    assert len(prompt) > 0


@pytest.mark.asyncio
async def test_generate_image_prompt_all_types(mock_llm):
    """所有 image_type 都能生成 prompt。"""
    for image_type in ("main_visual", "poster", "social_media", "scene"):
        prompt = await generate_image_prompt("运动品牌营销方案", image_type)
        assert isinstance(prompt, str)
        assert len(prompt) > 10


# ── Tests: call_qwen_image_api ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_call_qwen_image_api_success(mock_httpx_post):
    """Qwen-Image API 调用成功应返回 image_url 和尺寸。"""
    result = await call_qwen_image_api("test prompt", api_key="sk-test")
    assert "image_url" in result
    assert result["image_url"] == "https://example.com/generated.png"
    assert result["width"] == 2048
    assert result["height"] == 2048


@pytest.mark.asyncio
async def test_call_qwen_image_api_with_custom_size(mock_httpx_post):
    """自定义 size 参数应生效。"""
    result = await call_qwen_image_api("test prompt", api_key="sk-test", size="2688*1536")
    assert result["image_url"] is not None


@pytest.mark.asyncio
async def test_call_qwen_image_api_empty_prompt(monkeypatch):
    """空的 prompt 应触发 API 调用（由服务端校验，不在此处校验）。"""

    class _FakeErrorResponse:
        status_code = 400
        text = '{"code": "InvalidParameter", "message": "prompt is empty"}'

        def json(self):
            return {"code": "InvalidParameter", "message": "prompt is empty"}

    class _FakeErrorClient:
        def __init__(self, **_kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_a):
            pass

        async def post(self, *_a, **_kw):
            return _FakeErrorResponse()

    monkeypatch.setattr("app.agents.image_generation_agent.AsyncClient", lambda **kw: _FakeErrorClient())

    with pytest.raises(RuntimeError, match="Qwen-Image API"):
        await call_qwen_image_api("", api_key="sk-test")


# ── Tests: run_image_generation (Agent 入口) ────────────────────────────

@pytest.mark.asyncio
async def test_run_image_generation_missing_plan_content():
    """缺少 plan_content 应抛 ValueError。"""
    with pytest.raises(ValueError, match="缺少必填字段"):
        await run_image_generation({})


@pytest.mark.asyncio
async def test_run_image_generation_empty_plan_content():
    """空的 plan_content 应抛 ValueError。"""
    with pytest.raises(ValueError, match="缺少必填字段"):
        await run_image_generation({"plan_content": ""})


@pytest.mark.asyncio
async def test_run_image_generation_missing_api_key(monkeypatch):
    """没有配置 API Key 应抛 ValueError。"""
    from app.config.settings import settings

    monkeypatch.setattr(settings, "dashscope_api_key", "")
    monkeypatch.setattr(settings, "myself_api_key", "")
    with pytest.raises(ValueError, match="缺少 API Key"):
        await run_image_generation({
            "plan_content": "一个运动品牌营销方案",
        })


@pytest.mark.asyncio
async def test_run_image_generation_success(mock_llm, mock_httpx_post):
    """完整的成功路径：生成 prompt → 调 API → 返回 image_url。"""
    monkeypatch = pytest.MonkeyPatch()
    from app.config.settings import settings

    monkeypatch.setattr(settings, "dashscope_api_key", "sk-test")

    try:
        result = await run_image_generation({
            "plan_content": "Nike 在上海的营销方案，目标人群为18-35岁运动爱好者",
        })

        assert "image_url" in result
        assert "prompt_used" in result
        assert len(result["prompt_used"]) > 0
        assert result["image_url"] == "https://example.com/generated.png"
        assert result["width"] == 2048
        assert result["height"] == 2048
        assert result["image_type"] == "main_visual"
    finally:
        monkeypatch.undo()


@pytest.mark.asyncio
async def test_run_image_generation_custom_type(mock_llm, mock_httpx_post):
    """自定义 image_type 应正确传递。"""
    monkeypatch = pytest.MonkeyPatch()
    from app.config.settings import settings

    monkeypatch.setattr(settings, "dashscope_api_key", "sk-test")

    try:
        result = await run_image_generation({
            "plan_content": "Adidas 营销方案",
            "image_type": "poster",
        })
        assert result["image_type"] == "poster"
    finally:
        monkeypatch.undo()
