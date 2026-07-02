"""Additional coverage tests for product research agent helpers and nodes."""
from unittest.mock import MagicMock, patch

import pytest

from app.agents.product_research_agent import (
    FetchedPage,
    ProductResearchState,
    SearchResult,
    _domain_priority,
    _extract_text_from_html,
    _fill_sourced_fields,
    extract_node,
    fetch_node,
    search_node,
)
from app.schemas.product_info import (
    Identity,
    OfficialDescription,
    ProductResearchResult,
    SourcedDict,
    SourcedStr,
    SourcedStrList,
)


def test_domain_priority_for_known_domain():
    assert _domain_priority("https://www.apple.com/iphone") == 2


def test_domain_priority_for_unknown_domain():
    assert _domain_priority("https://example.com/product") == 1


def test_extract_text_from_html_strips_noise():
    html = "<html><head><script>alert(1)</script></head><body><p>  hello  </p><span>world</span></body></html>"
    text = _extract_text_from_html(html)
    assert "alert" not in text
    assert "hello" in text
    assert "world" in text


def test_fill_sourced_fields_sets_sources():
    result = ProductResearchResult(
        identity=Identity(product_name=SourcedStr(value="Test")),
        official_description=OfficialDescription(
            description=SourcedStr(value="desc"),
        ),
        specifications=SourcedDict(data={"k": "v"}),
    )
    urls = ["https://a.com", "https://b.com"]
    _fill_sourced_fields(result, urls)
    assert result.identity.product_name.sources == urls
    assert result.specifications.sources == urls
    assert result.availability.available_regions.sources == urls


@pytest.mark.asyncio
async def test_search_node_sorts_and_dedupes():
    raw = [
        {"href": "https://a.com", "title": "A", "body": "snippet"},
        {"href": "https://a.com", "title": "A2", "body": "dup"},
        {"href": "https://apple.com", "title": "Official", "body": "official"},
    ]
    with patch("app.agents.product_research_agent.DDGS") as mock_ddgs:
        instance = MagicMock()
        instance.__enter__.return_value = instance
        instance.text.return_value = raw
        mock_ddgs.return_value = instance

        result = await search_node(ProductResearchState(product_name="iPhone"))
        assert len(result["search_results"]) == 2
        assert result["search_results"][0].url == "https://apple.com"


@pytest.mark.asyncio
async def test_fetch_node_returns_dict_with_keys():
    """验证 fetch_node 返回的结构——网络层由 httpx 单元保证。"""
    state = ProductResearchState(product_name="iPhone", search_results=[])
    result = await fetch_node(state)
    assert "fetched_pages" in result
    assert isinstance(result["fetched_pages"], list)


@pytest.mark.asyncio
async def test_extract_node_empty_pages_returns_default():
    state = ProductResearchState(product_name="iPhone", fetched_pages=[])
    result = await extract_node(state)
    assert result["output"] == ProductResearchResult()
