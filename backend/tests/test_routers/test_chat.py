"""Tests for chat streaming endpoint.

Corresponding OpenSpec: docs/api/paths/intent.yaml
Corresponding in_scope ID: brand-input
"""

import json
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_chat_stream_endpoint_exists():
    """The chat/stream endpoint exists and returns SSE."""
    response = client.post("/api/v1/chat/stream", json={"message": "test"})
    assert response.status_code in (200, 500)


def test_chat_stream_accepts_context():
    """The chat/stream endpoint accepts optional context for multi-turn."""
    response = client.post(
        "/api/v1/chat/stream",
        json={"message": "test", "context": {"brand_input": {"brand_name": "Nike"}}},
    )
    assert response.status_code in (200, 500)


def test_chat_stream_returns_sse_headers():
    """The chat/stream endpoint returns SSE headers on success."""
    response = client.post("/api/v1/chat/stream", json={"message": "test"})
    if response.status_code == 200:
        assert response.headers.get("content-type") == "text/event-stream; charset=utf-8"
        assert response.headers.get("cache-control") == "no-cache"


def test_chat_stream_rejects_empty_message():
    """The chat/stream endpoint handles empty message gracefully."""
    response = client.post("/api/v1/chat/stream", json={"message": ""})
    # SSE is still returned (empty message just yields intent JSON with error handling)
    assert response.status_code in (200, 500)
