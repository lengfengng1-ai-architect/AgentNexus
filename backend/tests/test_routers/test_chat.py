import pytest
from unittest.mock import patch

from app.schemas.chat import BrandInput, ChatResponse


@pytest.fixture
def mock_chat():
    with patch("app.routers.chat.chat") as mock:
        yield mock


@pytest.mark.asyncio
async def test_chat_endpoint__complete_input__returns_brand_input(client, mock_chat):
    # Arrange
    mock_chat.return_value = ChatResponse(
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

    # Act
    response = await client.post("/api/v1/chat", json={"message": "我们是 Nike，想在上海做跑步活动，预算 50 万，周期 3 个月"})

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["is_complete"] is True
    assert data["brand_input"]["brand_name"] == "Nike"
    assert data["brand_input"]["budget"] == 50


@pytest.mark.asyncio
async def test_chat_endpoint__incomplete_input__returns_clarifying_response(client, mock_chat):
    # Arrange
    mock_chat.return_value = ChatResponse(
        reply="请问您的目标城市和预算是多少？",
        brand_input=BrandInput(brand_name="Nike"),
        is_complete=False,
    )

    # Act
    response = await client.post("/api/v1/chat", json={"message": "我们是 Nike"})

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["is_complete"] is False
    assert data["brand_input"]["brand_name"] == "Nike"
    assert data["brand_input"].get("city") is None


@pytest.mark.asyncio
async def test_chat_endpoint__missing_message__returns_422(client):
    # Act
    response = await client.post("/api/v1/chat", json={})

    # Assert
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_endpoint__llm_failure__returns_500(client, mock_chat):
    # Arrange
    mock_chat.side_effect = RuntimeError("LLM invocation failed")

    # Act
    response = await client.post("/api/v1/chat", json={"message": "我们是 Nike"})

    # Assert
    assert response.status_code == 500
