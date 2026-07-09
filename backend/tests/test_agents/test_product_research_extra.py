"""Additional coverage tests for product research agent helpers and nodes."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.agents.product_research_agent import (
    FetchedPage,
    ProductResearchState,
    SearchResult,
    _collect_tool_fetch_urls,
    _domain_priority,
    _fill_sourced_fields,
    _route_after_agent,
    agent_node,
    batch_search_fetch_node,
    fetch_node,
    finalize_node,
    search_node,
)
from app.utils import extract_text_from_html
from app.schemas.product_info import (
    Identity,
    OfficialDescription,
    ProductResearchResult,
    SourcedDict,
    SourcedStr,
)


def _ai_with_tools() -> AIMessage:
    return AIMessage(
        content="",
        tool_calls=[{"name": "web_search", "args": {"query": "x"}, "id": "1", "type": "tool_call"}],
    )


def test_domain_priority_for_known_domain():
    assert _domain_priority("https://www.apple.com/iphone") == 2


def test_domain_priority_for_unknown_domain():
    assert _domain_priority("https://example.com/product") == 1


def test_extract_text_from_html_strips_noise():
    html = "<html><head><script>alert(1)</script></head><body><p>  hello  </p><span>world</span></body></html>"
    text = extract_text_from_html(html)
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
    with patch("app.agents.product_research_agent.searxng_search") as mock_search:
        mock_search.return_value = raw

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
async def test_batch_search_fetch_node_combines_search_and_fetch():
    """batch_search_fetch_node 复用 search_node + fetch_node，输出 initial_pages + seen_urls，并初始化 ReAct 对话。"""
    page = FetchedPage(url="https://a.com", title="A", content="content-a", fetched=True)
    state = ProductResearchState(product_name="iPhone")
    with patch(
        "app.agents.product_research_agent.search_node",
        new=AsyncMock(return_value={"search_results": [SearchResult(url="https://a.com", title="A", snippet="s")]}),
    ), patch(
        "app.agents.product_research_agent.fetch_node",
        new=AsyncMock(return_value={"fetched_pages": [page]}),
    ):
        result = await batch_search_fetch_node(state)

    assert result["initial_pages"] == [page]
    assert result["seen_urls"] == ["https://a.com"]
    assert result["tool_call_count"] == 0
    # ReAct 对话被初始化：系统 prompt + 用户任务
    assert len(result["messages"]) == 2
    assert isinstance(result["messages"][0], SystemMessage)
    assert isinstance(result["messages"][1], HumanMessage)


@pytest.mark.asyncio
async def test_agent_node_binds_tools_and_appends_response():
    """agent_node 绑定 web_search/web_fetch 工具，并把 LLM 响应追加到 messages。"""
    state = ProductResearchState(
        product_name="iPhone",
        messages=[SystemMessage(content="sys"), HumanMessage(content="hi")],
    )
    fake_resp = AIMessage(content="done")
    fake_bound = MagicMock()
    fake_bound.ainvoke = AsyncMock(return_value=fake_resp)
    fake_model = MagicMock()
    fake_model.bind_tools = MagicMock(return_value=fake_bound)

    with patch("app.agents.product_research_agent._build_model", return_value=fake_model):
        result = await agent_node(state)

    assert result["messages"] == [fake_resp]
    assert result["tool_call_count"] == 0
    fake_model.bind_tools.assert_called_once()


@pytest.mark.asyncio
async def test_agent_node_increments_count_returning_from_tools():
    """从 tools 返回（上一条为 ToolMessage）时，tool_call_count +1。"""
    state = ProductResearchState(
        product_name="iPhone",
        messages=[
            SystemMessage(content="sys"),
            HumanMessage(content="hi"),
            _ai_with_tools(),
            ToolMessage(content="result", tool_call_id="1"),
        ],
        tool_call_count=0,
    )
    fake_resp = AIMessage(content="ok")
    fake_bound = MagicMock()
    fake_bound.ainvoke = AsyncMock(return_value=fake_resp)
    fake_model = MagicMock()
    fake_model.bind_tools = MagicMock(return_value=fake_bound)

    with patch("app.agents.product_research_agent._build_model", return_value=fake_model):
        result = await agent_node(state)

    assert result["tool_call_count"] == 1


def test_route_after_agent_no_tool_calls_returns_finalize():
    state = ProductResearchState(
        product_name="iPhone",
        messages=[SystemMessage(content="sys"), AIMessage(content="info sufficient")],
    )
    assert _route_after_agent(state) == "finalize"


def test_route_after_agent_with_tool_calls_returns_tools():
    state = ProductResearchState(
        product_name="iPhone",
        messages=[SystemMessage(content="sys"), _ai_with_tools()],
        tool_call_count=1,
    )
    assert _route_after_agent(state) == "tools"


def test_route_after_agent_over_limit_returns_finalize():
    state = ProductResearchState(
        product_name="iPhone",
        messages=[SystemMessage(content="sys"), _ai_with_tools()],
        tool_call_count=3,
    )
    assert _route_after_agent(state) == "finalize"


def test_collect_tool_fetch_urls_returns_urls_from_messages():
    """_collect_tool_fetch_urls 从 AIMessage tool_calls 中提取 web_fetch 的 url 参数。"""
    msgs = [
        AIMessage(
            content="",
            tool_calls=[
                {"name": "web_search", "args": {"query": "test"}, "id": "1", "type": "tool_call"},
            ],
        ),
        AIMessage(
            content="",
            tool_calls=[
                {"name": "web_fetch", "args": {"url": "https://a.com"}, "id": "2", "type": "tool_call"},
                {"name": "web_fetch", "args": {"url": "https://b.com"}, "id": "3", "type": "tool_call"},
            ],
        ),
        HumanMessage(content="done"),
    ]
    urls = _collect_tool_fetch_urls(msgs)
    assert urls == ["https://a.com", "https://b.com"]


@pytest.mark.asyncio
async def test_finalize_node_no_data_returns_default():
    """无批量页面且未调用工具时，finalize 返回空 ProductResearchResult。"""
    state = ProductResearchState(product_name="iPhone", initial_pages=[], tool_call_count=0)
    result = await finalize_node(state)
    assert result["output"] == ProductResearchResult()
