"""Tests for market research agent in plan generation pipeline.

Corresponding OpenSpec: openspec/changes/insight-market-react-research/
"""

import os
from unittest.mock import AsyncMock, patch

import pytest

from app.agents.market_research_agent import run_market_research
from app.schemas.plan_generation import MarketResearchOutput

from langchain_core.messages import AIMessage, ToolMessage


def _make_state(messages=None, tool_call_count=0):
    from app.agents.market_research_agent import State
    return State(
        brand_name="Nike",
        category="运动服装",
        messages=messages or [],
        tool_call_count=tool_call_count,
    )


@pytest.mark.asyncio
async def test_missing_category_raises():
    """Missing category should raise ValueError."""
    with pytest.raises(ValueError, match="Missing required inputs"):
        await run_market_research({"brand_name": "Nike"})


@pytest.mark.asyncio
async def test_graph_returns_empty_output():
    """When graph returns no output, should not error."""
    from app.agents.market_research_agent import _graph

    with patch.object(_graph, "ainvoke", new_callable=AsyncMock, return_value={"output": None}):
        with pytest.raises(ValueError, match="did not return structured output"):
            await run_market_research({"brand_name": "Nike", "category": "运动服装"})


@pytest.mark.asyncio
async def test_normal_mode_extracts_structured_data():
    """Full flow: graph returns structured output."""
    mock_output = MarketResearchOutput(
        market_summary="Nike 所在的运动服装市场：运动服饰市场规模持续增长，年增长率10%。",
        trends=[
            {"title": "健康生活方式常态化", "description": "运动场景从专业健身房扩展到日常社交场合。"},
            {"title": "女性运动市场快速增长", "description": "瑜伽、普拉提等品类增速领先。"},
        ],
        opportunities=["城市运动社群渗透带来精准触达机会", "女性细分品类增长空间显著"],
    )
    from app.agents.market_research_agent import _graph

    with patch.object(_graph, "ainvoke", new_callable=AsyncMock, return_value={"output": mock_output}):
        result = await run_market_research({"brand_name": "Nike", "category": "运动服装"})

    output = MarketResearchOutput.model_validate(result)
    assert output.market_summary.startswith("Nike")
    assert len(output.trends) == 2
    assert len(output.opportunities) == 2
    assert "健康生活方式" in output.trends[0].title


@pytest.mark.asyncio
async def test_mock_mode_loads_preset_data(tmp_path, monkeypatch):
    """USE_MOCK_DATA=true loads from file, skips web."""
    monkeypatch.setenv("USE_MOCK_DATA", "true")

    mock_dir = tmp_path / "market_research"
    mock_dir.mkdir()
    mock_file = mock_dir / "运动服装.json"
    mock_file.write_text('{"market_summary":"mock summary","trends":[],"opportunities":[]}', encoding="utf-8")

    with patch("app.agents.market_research_agent.Path", return_value=mock_dir.parent):
        # Apply mock at the right level: _load_mock_data uses Path("mock_data")
        with patch("pathlib.Path.exists", return_value=True):
            with patch("pathlib.Path.read_text", return_value='{"market_summary":"mock summary","trends":[{"title":"T1","description":"D1"}],"opportunities":["O1"]}'):
                result = await run_market_research({"brand_name": "Nike", "category": "运动服装"})

    output = MarketResearchOutput.model_validate(result)
    assert output.market_summary == "mock summary"
    assert len(output.trends) == 1
    assert output.trends[0].title == "T1"


@pytest.mark.asyncio
async def test_mock_mode_no_file_returns_default(tmp_path, monkeypatch):
    """USE_MOCK_DATA=true but no file → empty output, not crash."""
    monkeypatch.setenv("USE_MOCK_DATA", "true")

    with patch("app.agents.market_research_agent._load_mock_data", return_value=None):
        result = await run_market_research({"brand_name": "Nike", "category": "运动服装"})

    output = MarketResearchOutput.model_validate(result)
    assert "未配置 mock 数据" in output.market_summary


@pytest.mark.asyncio
async def test_extract_empty_pages_returns_default():
    """_extract with no valid pages returns empty MarketResearchOutput."""
    from app.agents.market_research_agent import _extract
    result = await _extract("Nike", "运动服装", [])
    assert isinstance(result, MarketResearchOutput)
    assert "未找到市场信息" in result.market_summary


# ── ReAct 路由逻辑测试 ──


def test_route_no_tool_calls():
    """最后一条消息无 tool_calls → extract。"""
    from app.agents.market_research_agent import _route_after_agent
    state = _make_state(messages=[AIMessage(content="done")])
    assert _route_after_agent(state) == "extract"


def test_route_empty_messages():
    """messages 为空 → extract。"""
    from app.agents.market_research_agent import _route_after_agent
    state = _make_state()
    assert _route_after_agent(state) == "extract"


def test_route_has_tool_calls_under_limit():
    """有 tool_calls 且未超 3 轮 → tools。"""
    from app.agents.market_research_agent import _route_after_agent
    msg = AIMessage(content="", tool_calls=[{"name": "web_search", "args": {}, "id": "1"}])
    state = _make_state(messages=[msg], tool_call_count=1)
    assert _route_after_agent(state) == "tools"


def test_route_reached_limit():
    """tool_call_count >= 3 → extract。"""
    from app.agents.market_research_agent import _route_after_agent
    msg = AIMessage(content="", tool_calls=[{"name": "web_search", "args": {}, "id": "1"}])
    state = _make_state(messages=[msg], tool_call_count=3)
    assert _route_after_agent(state) == "extract"

    state2 = _make_state(messages=[msg], tool_call_count=5)
    assert _route_after_agent(state2) == "extract"
