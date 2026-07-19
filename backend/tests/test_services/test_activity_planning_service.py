"""活动规划 service 测试：过滤逻辑 + 持久化 + SSE 携带 activity_planning_id。

Corresponding OpenSpec: openspec/changes/activity-planning
Corresponding in_scope ID: activity-planning
"""
import json

import pytest

from app.schemas.activity_planning import ActivityPlanningResult
from app.services import activity_planning_service as svc


@pytest.fixture()
def tmp_results_dir(tmp_path, monkeypatch):
    target = tmp_path / "results"
    monkeypatch.setattr(svc, "_RESULTS_DIR", target)
    return target


class TestFilterCandidates:
    def test_exact_match(self):
        """羽毛球 + 上海 → 精确匹配赛事"""
        candidates = svc.filter_candidates("羽毛球", "上海")
        assert len(candidates) >= 1
        assert all(c.exact_match for c in candidates)
        assert any("羽毛球" in c.name for c in candidates)

    def test_degradation_no_match(self):
        """不存在的运动类型 → 降级返回城市 top 3（exact_match=False）"""
        candidates = svc.filter_candidates("桌球", "上海")
        assert len(candidates) >= 1
        assert all(not c.exact_match for c in candidates)

    def test_nonexistent_city(self):
        """不存在的城市 → 空列表"""
        candidates = svc.filter_candidates("羽毛球", "不存在的城市")
        assert candidates == []

    def test_summary_builders(self):
        """events_summary + venues_summary 从 mock 读取"""
        events = svc.build_events_summary("上海")
        assert events is not None
        assert events.monthly > 0
        assert len(events.categories) > 0

        venues = svc.build_venues_summary("上海")
        assert venues is not None
        assert venues.count > 0
        assert len(venues.types) > 0


class TestSaveAndGet:
    def test_save_then_get_roundtrip(self, tmp_results_dir):
        result = ActivityPlanningResult(
            sport_type="羽毛球",
            city="上海",
            candidates=[],
            suggestion="测试建议",
        )
        aid = svc.save_activity_result(result)
        assert aid.startswith("ap-") and len(aid) == 11

        loaded = svc.get_activity_result(aid)
        assert loaded is not None
        assert loaded.sport_type == "羽毛球"
        assert loaded.suggestion == "测试建议"

    def test_save_twice_distinct_ids(self, tmp_results_dir):
        r = ActivityPlanningResult(sport_type="羽毛球", city="上海", suggestion="x")
        a1 = svc.save_activity_result(r)
        a2 = svc.save_activity_result(r)
        assert a1 != a2

    @pytest.mark.parametrize("bad_id", ["../etc/passwd", "ap-XYZ12345", "ap-123", "abc", ""])
    def test_invalid_id_returns_none(self, tmp_results_dir, bad_id):
        assert svc.get_activity_result(bad_id) is None

    def test_missing_file_returns_none(self, tmp_results_dir):
        assert svc.get_activity_result("ap-deadbeef") is None


class TestStreamCarriesId:
    @pytest.mark.asyncio
    async def test_result_event_carries_id(self, tmp_results_dir, monkeypatch):
        async def fake_suggestion(_result):
            return "测试活动建议"
        monkeypatch.setattr(svc, "generate_suggestion", fake_suggestion)

        frames = [f async for f in svc.analyze_stream("羽毛球", "上海")]
        result_frames = [f for f in frames if f.startswith("event: result")]
        assert len(result_frames) == 1

        payload = json.loads(result_frames[0].split("data: ", 1)[1])
        aid = payload.get("activity_planning_id", "")
        assert aid.startswith("ap-") and len(aid) == 11
        assert payload["sport_type"] == "羽毛球"
        assert payload["suggestion"] == "测试活动建议"
        assert len(payload["candidates"]) > 0
        assert (tmp_results_dir / f"{aid}.json").exists()
