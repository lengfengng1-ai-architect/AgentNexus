"""Additional coverage tests for market analysis service streaming helpers."""
from unittest.mock import patch

import pytest

from app.schemas.market_analysis import MarketResearchResponse, MarketResearchResult
from app.services import market_analysis_service as service


def test_progress_helper_returns_value():
    """Verify progress percent mapping still works."""
    from app.schemas.market_analysis import RESEARCH_NODES
    for k, v in RESEARCH_NODES:
        assert k in ("define", "size", "trends", "users", "competitors", "assess", "synthesize")
        assert v in (14, 28, 42, 57, 71, 85, 100)


def test_sse_event_helpers_emit_valid_events():
    """Verify SSE error helper works."""
    err = service._sse_error("oops")
    assert "failed" in err
    assert "oops" in err


@pytest.mark.asyncio
async def test_analyze_stream_non_mock_returns_sse():
    """Verify analyze_stream returns an async generator."""
    # Patch the agent graph's astream_events to return a controlled sequence
    async def fake_astream(*args, **kwargs):
        yield {"event": "on_chain_start", "name": "define", "data": {}}
        yield {"event": "on_chain_end", "name": "define", "data": {"output": {}}}
        yield {"event": "on_chain_start", "name": "size", "data": {}}
        yield {"event": "on_chain_end", "name": "size", "data": {"output": {}}}
        yield {"event": "on_chain_end", "name": "LangGraph", "data": {"output": {"result": {"market_name": "test"}}}}

    with patch.object(service, "_graph") as mock_graph:
        mock_graph.astream_events = fake_astream

        events = []
        async for event in service.analyze_stream("test", "cat"):
            events.append(event)

        assert len(events) > 0
        assert any("event: progress" in e for e in events)
        assert any("event: data" in e for e in events)
