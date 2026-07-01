"""测试产品信息调研 Agent。

测试策略：mock _graph.ainvoke，验证 service 层的缓存逻辑和 router 响应。
"""

import json
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import create_app
from app.schemas.product_info import (SourcedStr, SourcedStrList, SourcedDict,
                                      BasicInfo, ProductInfo, ProductInfoResponse)


# ── Fixtures ────────────────────────────────────────────────


@pytest.fixture
def mock_graph():
    with patch("app.agents.product_research_agent._graph") as m:
        m.ainvoke = AsyncMock()
        yield m


@pytest.fixture
def sample_product_info() -> ProductInfo:
    return ProductInfo(
        basic=BasicInfo(
            product_name=SourcedStr(value="iPhone 16", sources=["https://apple.com"]),
            brand=SourcedStr(value="Apple", sources=["https://apple.com"]),
            manufacturer=SourcedStr(value="Apple Inc.", sources=["https://apple.com"]),
            industry=SourcedStr(value="消费电子", sources=["https://zol.com.cn"]),
            category=SourcedStr(value="手机", sources=["https://zol.com.cn"]),
            subcategory=SourcedStr(value="智能手机", sources=["https://zol.com.cn"]),
            description=SourcedStr(value="苹果公司2025年发布的旗舰智能手机", sources=["https://apple.com"]),
            launch_date=SourcedStr(value="2025-09", sources=["https://zol.com.cn"]),
            status=SourcedStr(value="在售", sources=["https://zol.com.cn"]),
            official_website=SourcedStr(value="https://www.apple.com/iphone-16", sources=["https://apple.com"]),
            available_regions=SourcedStrList(value=["中国大陆", "美国"], sources=["https://apple.com"]),
            specifications=SourcedDict(value={"芯片": "A18", "屏幕": "6.1英寸"}, sources=["https://apple.com"]),
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
    """Agent 调研返回结构化 ProductInfo。"""
    from app.agents.product_research_agent import research_product

    expected = ProductInfo(basic=BasicInfo(product_name=SourcedStr(value="Test Product")))
    mock_graph.ainvoke.return_value = {"output": expected}

    result = await research_product("Test Product")
    assert result.basic.product_name.value == "Test Product"
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
async def test_product_info_endpoint_success(client, mock_graph, sample_product_info):
    """POST /api/v1/product-info 返回调研结果。"""
    mock_graph.ainvoke.return_value = {"output": sample_product_info}

    # 用随机名避免端到端测试生成的缓存文件干扰
    import uuid
    unique_name = f"UTEST_{uuid.uuid4().hex[:8]}"
    resp = await client.post("/api/v1/product-info", json={"product_name": unique_name})
    assert resp.status_code == 200
    data = resp.json()
    assert data["product_info"]["basic"]["product_name"]["value"] == "iPhone 16"
    assert data["product_info"]["basic"]["product_name"]["sources"] == ["https://apple.com"]
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
async def test_cache_hit_returns_without_agent(tmp_path, monkeypatch, sample_product_info):
    """缓存命中时直接返回，不调用 Agent。"""
    from app.services.product_info_service import get_product_info, MOCK_DATA_DIR

    # 将缓存目录指向 tmp_path
    cache_dir = tmp_path / "product_info"
    cache_dir.mkdir()
    monkeypatch.setattr("app.services.product_info_service.MOCK_DATA_DIR", cache_dir)

    # 写入缓存文件
    cache_file = cache_dir / "iphone_16.json"
    cache_file.write_text(sample_product_info.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8")

    with patch("app.agents.product_research_agent.research_product") as mock_research:
        result = await get_product_info("iPhone 16")
        assert result.from_cache is True
        assert result.product_info.basic.product_name.value == "iPhone 16"
        mock_research.assert_not_awaited()


@pytest.mark.asyncio
async def test_cache_miss_invokes_agent(monkeypatch, sample_product_info):
    """缓存未命中时调用 Agent 并保存。"""
    import tempfile
    tmp_dir = Path(tempfile.mkdtemp())
    cache_dir = tmp_dir / "product_info"
    cache_dir.mkdir()
    monkeypatch.setattr("app.services.product_info_service.MOCK_DATA_DIR", cache_dir)

    from app.services.product_info_service import get_product_info

    with patch("app.services.product_info_service.research_product") as mock_research:
        mock_research.return_value = sample_product_info
        result = await get_product_info("New Product")
        assert result.from_cache is False
        assert result.product_info.basic.product_name.value == "iPhone 16"
        mock_research.assert_awaited_once()

    # 验证缓存文件已创建
    assert (cache_dir / "new_product.json").exists()
