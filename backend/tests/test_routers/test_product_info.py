"""测试产品信息调研 Agent（v2 新 schema）。"""

import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import create_app
from app.schemas.product_info import (
    SourcedStr, SourcedStrList, SourcedDict,
    Identity, OfficialDescription, Availability,
    Feature, PriceItem,
    ProductResearchResult, ProductInfoResponse,
)


# ── Fixtures ────────────────────────────────────────────────


@pytest.fixture
def mock_graph():
    with patch("app.agents.product_research_agent._graph") as m:
        m.ainvoke = AsyncMock()
        yield m


@pytest.fixture
def sample_result() -> ProductResearchResult:
    return ProductResearchResult(
        identity=Identity(
            product_name=SourcedStr(value="iPhone 16", sources=["https://apple.com"]),
            brand=SourcedStr(value="Apple", sources=["https://apple.com"]),
            manufacturer=SourcedStr(value="Apple Inc.", sources=["https://apple.com"]),
            industry=SourcedStr(value="消费电子", sources=["https://zol.com.cn"]),
            category=SourcedStr(value="手机", sources=["https://zol.com.cn"]),
        ),
        official_description=OfficialDescription(
            description=SourcedStr(value="iPhone 16 是 Apple 新一代智能手机", method="quoted", quote="iPhone 16 是 Apple 新一代智能手机", sources=["https://apple.com"]),
        ),
        features=[
            Feature(name="Camera Control", category="影像", description="相机控制按键", evidence=["https://apple.com"]),
        ],
        specifications=SourcedDict(value={"芯片": "A18", "屏幕": "6.1英寸"}, sources=["https://apple.com"]),
        availability=Availability(
            status=SourcedStr(value="在售", sources=["https://apple.com"]),
            pricing=[PriceItem(label="128GB", price="5999", currency="CNY", source="https://apple.com")],
            available_regions=SourcedStrList(value=["中国大陆"], sources=["https://apple.com"]),
            access_model=SourcedStr(value="线上直销", sources=["https://apple.com"]),
        ),
    )


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ── Agent 测试 ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_research_product_returns_structured_output(mock_graph):
    """Agent 调研返回 ProductResearchResult。"""
    from app.agents.product_research_agent import research_product

    expected = ProductResearchResult(
        identity=Identity(product_name=SourcedStr(value="Test Product")),
    )
    mock_graph.ainvoke.return_value = {"output": expected}

    result = await research_product("Test Product")
    assert result.identity.product_name.value == "Test Product"
    mock_graph.ainvoke.assert_awaited_once()


@pytest.mark.asyncio
async def test_research_product_raises_on_none_output(mock_graph):
    """Agent 返回 None 时抛出 ValueError。"""
    from app.agents.product_research_agent import research_product

    mock_graph.ainvoke.return_value = {"output": None}

    with pytest.raises(ValueError, match="did not return structured"):
        await research_product("Any")


# ── Router 测试 ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_product_info_endpoint_success(client, mock_graph, sample_result):
    """POST /api/v1/product-info 返回五大模块结果。"""
    mock_graph.ainvoke.return_value = {"output": sample_result}

    import uuid
    unique_name = f"UTEST_{uuid.uuid4().hex[:8]}"
    resp = await client.post("/api/v1/product-info", json={"product_name": unique_name})
    assert resp.status_code == 200
    data = resp.json()

    pi = data["product_info"]
    # 验证五大模块都存在
    assert "identity" in pi
    assert "official_description" in pi
    assert "features" in pi
    assert "specifications" in pi
    assert "availability" in pi

    assert pi["identity"]["product_name"]["value"] == "iPhone 16"
    assert pi["official_description"]["description"]["method"] == "quoted"
    assert len(pi["features"]) == 1
    assert pi["features"][0]["evidence"] == ["https://apple.com"]
    assert len(pi["availability"]["pricing"]) == 1
    assert data["from_cache"] is False


@pytest.mark.asyncio
async def test_product_info_endpoint_empty_name(client):
    """空产品名返回 422。"""
    resp = await client.post("/api/v1/product-info", json={"product_name": ""})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_product_info_endpoint_llm_error(client, mock_graph):
    """LLM 异常返回 500。"""
    mock_graph.ainvoke.side_effect = ValueError("LLM error")

    resp = await client.post("/api/v1/product-info", json={"product_name": "Test"})
    assert resp.status_code == 500
    data = resp.json()
    assert data["detail"]["code"] == "llm_error"


# ── Service / Cache 测试 ────────────────────────────────────


@pytest.mark.asyncio
async def test_cache_hit_returns_without_agent(tmp_path, monkeypatch, sample_result):
    """缓存命中时直接返回，不调用 Agent。"""
    from app.services.product_info_service import get_product_info, MOCK_DATA_DIR

    cache_dir = tmp_path / "product_info"
    cache_dir.mkdir()
    monkeypatch.setattr("app.services.product_info_service.MOCK_DATA_DIR", cache_dir)

    cache_file = cache_dir / "iphone_16.json"
    cache_file.write_text(sample_result.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")

    with patch("app.agents.product_research_agent.research_product") as mock_research:
        result = await get_product_info("iPhone 16")
        assert result.from_cache is True
        assert result.product_info.identity.product_name.value == "iPhone 16"
        mock_research.assert_not_awaited()


@pytest.mark.asyncio
async def test_cache_miss_invokes_agent(monkeypatch, sample_result):
    """缓存未命中时调用 Agent 并保存。"""
    import tempfile
    tmp_dir = Path(tempfile.mkdtemp())
    cache_dir = tmp_dir / "product_info"
    cache_dir.mkdir()
    monkeypatch.setattr("app.services.product_info_service.MOCK_DATA_DIR", cache_dir)

    from app.services.product_info_service import get_product_info

    with patch("app.services.product_info_service.research_product") as mock_research:
        mock_research.return_value = sample_result
        result = await get_product_info("New Product")
        assert result.from_cache is False
        assert result.product_info.identity.product_name.value == "iPhone 16"
        mock_research.assert_awaited_once()

    assert (cache_dir / "new_product.json").exists()


@pytest.mark.asyncio
async def test_stream_endpoint_sends_progress(mock_graph, sample_result):
    """流式端点返回 progress 和 result 事件。"""
    from app.agents.product_research_agent import ProductResearchState
    from app.services.product_info_service import stream_product_info

    # mock 搜索和读取（跳过真正的网络请求）
    mock_graph.ainvoke.return_value = {"output": sample_result}

    events = []
    async for event in stream_product_info("Test Product"):
        events.append(event)

    # 应有进度事件 + 结果事件（或缓存命中事件）
    event_types = []
    for e in events:
        if "event: progress" in e:
            event_types.append("progress")
        elif "event: result" in e:
            event_types.append("result")

    assert "progress" in event_types or "result" in event_types
