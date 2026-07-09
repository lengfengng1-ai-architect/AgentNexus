"""测试人群洞察 Agent。"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, ToolMessage

from app.agents.audience_insight_agent import State


@pytest.mark.asyncio
async def test_agent_returns_audience_and_persona():
    """Agent 返回人群数据和用户画像。"""
    from app.agents.audience_insight_agent import run_audience_insight
    from app.schemas.audience_insight import AudienceRawData, UserPersona

    with patch("app.agents.audience_insight_agent._graph") as mock:
        mock.ainvoke = AsyncMock(return_value={
            "audience_data": AudienceRawData(),
            "persona": UserPersona(),
        })
        audience, persona = await run_audience_insight("Test Product")
        assert isinstance(audience, AudienceRawData)
        assert isinstance(persona, UserPersona)
        mock.ainvoke.assert_awaited_once()


@pytest.mark.asyncio
async def test_agent_raises_on_none():
    """Agent 返回 None 时抛出 ValueError。"""
    from app.agents.audience_insight_agent import run_audience_insight

    with patch("app.agents.audience_insight_agent._graph") as mock:
        mock.ainvoke = AsyncMock(return_value={"audience_data": None, "persona": None})
        with pytest.raises(ValueError, match="did not return"):
            await run_audience_insight("Test")


# ── ReAct 路由逻辑测试 ──


def _make_state(messages=None, tool_call_count=0):
    return State(
        product_name="Test",
        messages=messages or [],
        tool_call_count=tool_call_count,
    )


def test_route_no_tool_calls():
    """最后一条消息无 tool_calls → extract_audience。"""
    from app.agents.audience_insight_agent import _route_after_agent
    state = _make_state(messages=[AIMessage(content="done")])
    assert _route_after_agent(state) == "extract_audience"


def test_route_empty_messages():
    """messages 为空 → extract_audience。"""
    from app.agents.audience_insight_agent import _route_after_agent
    state = _make_state()
    assert _route_after_agent(state) == "extract_audience"


def test_route_has_tool_calls_under_limit():
    """有 tool_calls 且未超 3 轮 → tools。"""
    from app.agents.audience_insight_agent import _route_after_agent
    msg = AIMessage(content="", tool_calls=[{"name": "web_search", "args": {}, "id": "1"}])
    state = _make_state(messages=[msg], tool_call_count=1)
    assert _route_after_agent(state) == "tools"


def test_route_reached_limit():
    """tool_call_count >= 3 → extract_audience。"""
    from app.agents.audience_insight_agent import _route_after_agent
    msg = AIMessage(content="", tool_calls=[{"name": "web_search", "args": {}, "id": "1"}])
    state = _make_state(messages=[msg], tool_call_count=3)
    assert _route_after_agent(state) == "extract_audience"

    state2 = _make_state(messages=[msg], tool_call_count=5)
    assert _route_after_agent(state2) == "extract_audience"


@pytest.mark.asyncio
async def test_agent_node_increments_count_on_tool_message():
    """上一条是 ToolMessage → tool_call_count +1。"""
    from app.agents.audience_insight_agent import _build_model, agent_node

    tool_msg = ToolMessage(content='{"result": "ok"}', tool_call_id="1")
    state = _make_state(messages=[tool_msg], tool_call_count=2)

    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content="done"))

    with patch.object(_build_model().__class__, "bind_tools", return_value=mock_llm):
        result = await agent_node(state)

    assert result["tool_call_count"] == 3
    assert len(result["messages"]) == 1


@pytest.mark.asyncio
async def test_agent_node_no_increment_on_non_tool_message():
    """上一条不是 ToolMessage → tool_call_count 不变。"""
    from app.agents.audience_insight_agent import _build_model, agent_node

    state = _make_state(messages=[AIMessage(content="hi")], tool_call_count=1)

    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content="done"))

    with patch.object(_build_model().__class__, "bind_tools", return_value=mock_llm):
        result = await agent_node(state)

    assert result["tool_call_count"] == 1
