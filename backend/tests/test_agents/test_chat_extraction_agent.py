import pytest
from unittest.mock import AsyncMock, patch

from app.agents.chat_extraction_agent import ChatOutput, extract_brand_input
from app.config.settings import settings
from app.schemas.chat import BrandInput


@pytest.fixture
def mock_graph():
    with patch("app.agents.chat_extraction_agent._graph") as m:
        m.ainvoke = AsyncMock()
        yield m


@pytest.mark.asyncio
async def test_extract_brand_input__complete_input__returns_brand_input(mock_graph):
    # Arrange
    mock_graph.ainvoke.return_value = {
        "output": ChatOutput(
            reply="已收到您的需求",
            brand_input=BrandInput(
                brand_name="Nike",
                category="running",
                city="上海",
                budget=50,
                period=3,
            ),
            is_complete=True,
        )
    }

    # Act
    result = await extract_brand_input("我们是 Nike，想在上海做跑步活动，预算 50 万，周期 3 个月")

    # Assert
    assert result.is_complete is True
    assert result.brand_input.brand_name == "Nike"
    assert result.brand_input.city == "上海"
    assert result.reply == "已收到您的需求"


@pytest.mark.asyncio
async def test_extract_brand_input__incomplete_input__returns_clarifying_response(mock_graph):
    # Arrange
    mock_graph.ainvoke.return_value = {
        "output": ChatOutput(
            reply="请问您的目标城市和预算范围是多少？",
            brand_input=BrandInput(brand_name="Nike"),
            is_complete=False,
        )
    }

    # Act
    result = await extract_brand_input("我们是 Nike")

    # Assert
    assert result.is_complete is False
    assert result.brand_input.brand_name == "Nike"
    assert result.brand_input.city is None
    assert "请问" in result.reply


@pytest.mark.asyncio
async def test_build_model__agnes_provider__uses_agnes_config(monkeypatch):
    # Arrange
    monkeypatch.setattr(settings, "llm_provider", "agnes")
    monkeypatch.setattr(settings, "agnes_api_key", "test-agnes-key")
    monkeypatch.setattr(settings, "agnes_model", "agnes-2.0-flash")

    with patch("app.agents.chat_extraction_agent.init_chat_model") as mock_init:
        from app.agents.chat_extraction_agent import _build_model

        _build_model()

    # Assert
    mock_init.assert_called_once_with(
        model="agnes-2.0-flash",
        model_provider="openai",
        api_key="test-agnes-key",
        base_url=settings.agnes_base_url,
    )


@pytest.mark.asyncio
async def test_build_model__dashscope_provider__uses_dashscope_config(monkeypatch):
    # Arrange
    monkeypatch.setattr(settings, "llm_provider", "dashscope")
    monkeypatch.setattr(settings, "dashscope_api_key", "test-dashscope-key")
    monkeypatch.setattr(settings, "dashscope_model", "qwen-turbo")

    with patch("app.agents.chat_extraction_agent.init_chat_model") as mock_init:
        from app.agents.chat_extraction_agent import _build_model

        _build_model()

    # Assert
    mock_init.assert_called_once_with(
        model="qwen-turbo",
        model_provider="openai",
        api_key="test-dashscope-key",
        base_url=settings.dashscope_base_url,
    )
