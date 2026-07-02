"""Tests for product research agent internals.

Corresponding OpenSpec: (legacy feature, tests added to meet coverage threshold)
"""

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.product_research_agent import (
    FetchedPage,
    SearchResult,
    _build_model,
    _domain_priority,
    _extract_text_from_html,
    _load_prompt,
    extract_node,
    fetch_node,
    search_node,
)
from app.config.settings import settings
from app.schemas.product_info import BasicInfo, ProductInfo, SourcedStr


@pytest.mark.asyncio
async def test_search_node__returns_results(monkeypatch):
    fake_result = {
        "href": "https://apple.com/iphone-16",
        "title": "iPhone 16",
        "body": "Apple flagship phone",
    }
    mock_ddgs = MagicMock()
    mock_ddgs.__enter__ = MagicMock(return_value=mock_ddgs)
    mock_ddgs.__exit__ = MagicMock(return_value=False)
    mock_ddgs.text.return_value = [fake_result]

    monkeypatch.setattr(
        "app.agents.product_research_agent.DDGS",
        lambda: mock_ddgs,
    )

    state = MagicMock()
    state.product_name = "iPhone 16"
    result = await search_node(state)

    assert len(result["search_results"]) == 1
    assert result["search_results"][0].url == "https://apple.com/iphone-16"


@pytest.mark.asyncio
async def test_fetch_node__returns_fetched_pages():
    html = "<html><head><title>iPhone 16</title></head><body><p>Specs here</p></body></html>"

    mock_resp = AsyncMock()
    mock_resp.headers = {"content-type": "text/html"}
    mock_resp.text = html
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get.return_value = mock_resp

    with patch("app.agents.product_research_agent.AsyncClient", return_value=mock_client):
        state = MagicMock()
        state.search_results = [SearchResult(url="https://apple.com", title="Apple", snippet="")]
        result = await fetch_node(state)

    assert len(result["fetched_pages"]) == 1
    assert "Specs here" in result["fetched_pages"][0].content
    assert result["fetched_pages"][0].title == "iPhone 16"


@pytest.mark.asyncio
async def test_fetch_node__non_html__skips():
    mock_resp = AsyncMock()
    mock_resp.headers = {"content-type": "application/pdf"}
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.get.return_value = mock_resp

    with patch("app.agents.product_research_agent.AsyncClient", return_value=mock_client):
        state = MagicMock()
        state.search_results = [SearchResult(url="https://example.com/file.pdf", title="PDF", snippet="")]
        result = await fetch_node(state)

    assert result["fetched_pages"][0].fetched is False


@pytest.mark.asyncio
async def test_extract_node__no_valid_pages__returns_minimal():
    state = MagicMock()
    state.product_name = "iPhone 16"
    state.fetched_pages = [FetchedPage(url="https://example.com", title=None, content="[页面读取失败]", fetched=False)]

    result = await extract_node(state)

    assert result["output"].basic.product_name.value == "iPhone 16"


@pytest.mark.asyncio
async def test_extract_node__valid_pages__extracts_info():
    state = MagicMock()
    state.product_name = "iPhone 16"
    state.fetched_pages = [
        FetchedPage(url="https://apple.com", title="iPhone 16", content="Apple iPhone 16 flagship phone")
    ]

    expected = ProductInfo(basic=BasicInfo(product_name=SourcedStr(value="iPhone 16")))
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value.ainvoke = AsyncMock(return_value=expected)

    with patch("app.agents.product_research_agent._build_model", return_value=mock_llm):
        result = await extract_node(state)

    assert result["output"].basic.product_name.value == "iPhone 16"
    assert "https://apple.com" in result["output"].basic.product_name.sources


def test_domain_priority__priority_domain__returns_higher():
    assert _domain_priority("https://apple.com/iphone") == 2
    assert _domain_priority("https://example.com/item") == 1


def test_extract_text_from_html__removes_scripts():
    html = "<html><script>alert('x')</script><body><p>Hello</p></body></html>"
    text = _extract_text_from_html(html)
    assert "alert" not in text
    assert "Hello" in text


def test_load_prompt__renders_template():
    prompt = _load_prompt("iPhone 16", [])
    assert "iPhone 16" in prompt


def test_build_model__uses_provider(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "agnes")
    monkeypatch.setattr(settings, "agnes_api_key", "test-key")
    monkeypatch.setattr(settings, "agnes_model", "agnes-2.0-flash")

    with patch("app.agents.product_research_agent.init_chat_model") as mock_init:
        _build_model()

    mock_init.assert_called_once()
    _, kwargs = mock_init.call_args
    assert kwargs["model"] == "agnes-2.0-flash"
    assert kwargs["api_key"] == "test-key"
