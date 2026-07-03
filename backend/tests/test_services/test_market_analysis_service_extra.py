"""Additional coverage tests for market analysis service streaming helpers."""
from unittest.mock import patch

import pytest

from app.schemas.market_analysis import MarketResearchResponse, MarketResearchResult
from app.services import market_analysis_service as service


def test_progress_helper_returns_value():
    assert service._progress("define") == 14
    assert service._progress("unknown") == 0


def test_sse_event_helpers_emit_valid_events():
    p = service._p("define")
    d = service._d("size", {"tam": 100})
    ne = service._ne("trends", "completed")
    ne_fail = service._ne("users", "failed", "oops")
    assert p.startswith("event: progress")
    assert d.startswith("event: data")
    assert ne.startswith("event: node_end")
    assert "failed" in ne_fail
    assert "oops" in ne_fail


@pytest.mark.asyncio
async def test_analyze_stream_non_mock_success():
    """覆盖非 mock 流式路径的所有节点成功分支。"""
    with patch.object(service.settings, "use_mock_data", False):
        with (
            patch.object(service, "call_node_define", return_value={}),
            patch.object(service, "call_node_size", return_value={}),
            patch.object(service, "call_node_trends", return_value=[{"title": "t"}]),
            patch.object(service, "call_node_users", return_value=[{"segment_name": "u"}]),
            patch.object(service, "call_node_competitors", return_value=[{"company_name": "c"}]),
            patch.object(service, "call_node_assess", return_value={"key_opportunities": []}),
            patch.object(service, "call_node_synthesize", return_value="# Report"),
            patch.object(service, "assemble_result") as mock_assemble,
        ):
            mock_assemble.return_value = MarketResearchResponse(
                result=MarketResearchResult(market_name="test", industry="i", category="c")
            )
            events = []
            async for event in service.analyze_stream("test", "cat"):
                events.append(event)
            assert len(events) == 22  # 7 progress + 7 data + 7 node_end + 1 result
            assert events[0].startswith("event: progress")
            assert events[-1].startswith("event: result")
            mock_assemble.assert_called_once()


@pytest.mark.asyncio
async def test_analyze_stream_non_mock_define_failure():
    """覆盖 define 节点失败早退分支。"""
    with patch.object(service.settings, "use_mock_data", False):
        with patch.object(service, "call_node_define", side_effect=RuntimeError("boom")):
            events = []
            async for event in service.analyze_stream("test", "cat"):
                events.append(event)
            assert len(events) == 2  # progress + failed node_end
            assert events[-1].startswith("event: node_end")
            assert "failed" in events[-1]


@pytest.mark.asyncio
async def test_analyze_stream_non_mock_mid_failure():
    """覆盖 size 节点失败分支。"""
    with patch.object(service.settings, "use_mock_data", False):
        with (
            patch.object(service, "call_node_define", return_value={}),
            patch.object(service, "call_node_size", side_effect=RuntimeError("boom")),
        ):
            events = []
            async for event in service.analyze_stream("test", "cat"):
                events.append(event)
            assert events[0].startswith("event: progress")
            assert events[-1].startswith("event: node_end")
            assert "failed" in events[-1]
