"""测试人群洞察 API 端点。"""

from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import create_app
from app.schemas.audience_insight import (
    AudienceInsightResponse,
    AudienceRawData,
    UserPersona,
    PersonaSource,
    AuditItem,
)


@pytest.fixture
def mock_graph():
    with patch("app.agents.audience_insight_agent._graph") as m:
        m.ainvoke = AsyncMock()
        yield m


@pytest.fixture
def sample_response():
    return AudienceInsightResponse(
        product_name="Test Product",
        audience_data=AudienceRawData(
            demographics={"age": "25-40"},
            purchase_motivations=[AuditItem(text="追求品质", source="https://example.com")],
            decision_factors=[AuditItem(text="性能", source="https://example.com")],
            usage_scenarios=[AuditItem(text="日常使用", source="https://example.com")],
            descriptions=[AuditItem(text="年轻白领", source="https://example.com")],
            sources=["https://example.com"],
        ),
        persona=UserPersona(
            profile_summary=PersonaSource(method="extracted", source="https://example.com"),
        ),
        from_cache=False,
    )


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_endpoint_success(client, mock_graph, sample_response):
    """POST /api/v1/audience-insight 返回人群洞察结果。"""
    import uuid
    unique_name = f"UTEST_{uuid.uuid4().hex[:8]}"

    mock_graph.ainvoke.return_value = {
        "audience_data": sample_response.audience_data,
        "persona": sample_response.persona,
    }

    resp = await client.post("/api/v1/audience-insight", json={"product_name": unique_name})
    assert resp.status_code == 200
    data = resp.json()
    assert "audience_data" in data
    assert "persona" in data
    assert data["from_cache"] is False


@pytest.mark.asyncio
async def test_endpoint_empty_name(client):
    """空产品名返回 422。"""
    resp = await client.post("/api/v1/audience-insight", json={"product_name": ""})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_endpoint_llm_error(client, mock_graph):
    """LLM 异常返回 500。"""
    mock_graph.ainvoke.side_effect = ValueError("LLM error")

    resp = await client.post("/api/v1/audience-insight", json={"product_name": "Test"})
    assert resp.status_code == 500
    assert resp.json()["detail"]["code"] == "llm_error"


@pytest.mark.asyncio
async def test_cache_hit(client, tmp_path, monkeypatch, sample_response):
    """缓存命中时直接返回。"""
    from app.services.audience_insight_service import AUDIENCE_DIR, PERSONA_DIR

    cache_audience = tmp_path / "audience_insight"
    cache_persona = tmp_path / "user_persona"
    cache_audience.mkdir()
    cache_persona.mkdir()
    monkeypatch.setattr("app.services.audience_insight_service.AUDIENCE_DIR", cache_audience)
    monkeypatch.setattr("app.services.audience_insight_service.PERSONA_DIR", cache_persona)

    (cache_audience / "test_product.json").write_text(
        sample_response.audience_data.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (cache_persona / "test_product.json").write_text(
        sample_response.persona.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8"
    )

    with patch("app.agents.audience_insight_agent.run_audience_insight") as mock:
        resp = await client.post("/api/v1/audience-insight", json={"product_name": "Test Product"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["from_cache"] is True
        mock.assert_not_awaited()
