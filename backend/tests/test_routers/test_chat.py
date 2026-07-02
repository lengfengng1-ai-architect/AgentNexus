import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_chat_stream_endpoint_exists():
    """The chat/stream endpoint exists."""
    response = client.post("/api/v1/chat/stream", json={"message": "test"})
    assert response.status_code in (200, 500)
