"""Tests for market analysis HTTP router."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def mock_settings():
    """Force mock data mode for router tests."""
    import app.config.settings as settings_module

    original = settings_module.settings.use_mock_data
    settings_module.settings.use_mock_data = True
    yield
    settings_module.settings.use_mock_data = original


@pytest.mark.asyncio
async def test_market_analysis_sync_200(mock_settings):
    """POST /api/v1/market-analysis returns 200 with valid report."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/market-analysis",
            json={"market_name": "冰美式咖啡", "category": "咖啡饮品"},
        )
    assert response.status_code == 200
    data = response.json()
    assert "result" in data


@pytest.mark.asyncio
async def test_market_analysis_sync_422_missing_market_name():
    """POST /api/v1/market-analysis returns 422 without market_name."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/market-analysis",
            json={"category": "咖啡饮品"},
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_market_analysis_sync_422_missing_category():
    """POST /api/v1/market-analysis returns 422 without category."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/market-analysis",
            json={"market_name": "冰美式咖啡"},
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_market_analysis_sync_422_empty_market_name():
    """POST /api/v1/market-analysis returns 422 with empty market_name."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/market-analysis",
            json={"market_name": "", "category": "咖啡饮品"},
        )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_market_analysis_stream_200(mock_settings):
    """POST /api/v1/market-analysis/stream returns SSE events."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async with client.stream(
            "POST",
            "/api/v1/market-analysis/stream",
            json={"market_name": "冰美式咖啡", "category": "咖啡饮品"},
        ) as response:
            assert response.status_code == 200
            ct = response.headers.get("content-type", "")
            assert ct.startswith("text/event-stream")

            content = await response.aread()
            body = content.decode("utf-8")
            assert "event: progress" in body
            assert "event: result" in body


@pytest.mark.asyncio
async def test_market_analysis_stream_422_missing_fields():
    """POST /api/v1/market-analysis/stream returns 422 with missing fields."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/market-analysis/stream",
            json={"market_name": "冰美式咖啡"},
        )
    assert response.status_code == 422
