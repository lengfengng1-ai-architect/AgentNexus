import json
from unittest.mock import MagicMock, patch

import pytest

from app.agents.chat_extraction_agent import extract_brand_input


@pytest.fixture
def mock_llm():
    mock = MagicMock()
    with patch("app.agents.chat_extraction_agent._build_llm", return_value=mock):
        yield mock


@pytest.mark.asyncio
async def test_extract_brand_input__complete_input__returns_brand_input(mock_llm):
    # Arrange
    mock_llm.invoke.return_value = MagicMock(
        content=json.dumps({
            "reply": "已收到您的需求",
            "brand_input": {
                "brand_name": "Nike",
                "category": "running",
                "city": "上海",
                "budget": 50,
                "period": 3,
            },
            "is_complete": True,
        })
    )

    # Act
    result = await extract_brand_input("我们是 Nike，想在上海做跑步活动，预算 50 万，周期 3 个月")

    # Assert
    assert result.is_complete is True
    assert result.brand_input.brand_name == "Nike"
    assert result.brand_input.city == "上海"
    assert result.reply == "已收到您的需求"


@pytest.mark.asyncio
async def test_extract_brand_input__incomplete_input__returns_clarifying_response(mock_llm):
    # Arrange
    mock_llm.invoke.return_value = MagicMock(
        content=json.dumps({
            "reply": "请问您的目标城市和预算范围是多少？",
            "brand_input": {"brand_name": "Nike"},
            "is_complete": False,
        })
    )

    # Act
    result = await extract_brand_input("我们是 Nike")

    # Assert
    assert result.is_complete is False
    assert result.brand_input.brand_name == "Nike"
    assert result.brand_input.city is None
    assert "请问" in result.reply
