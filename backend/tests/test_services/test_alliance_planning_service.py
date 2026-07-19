"""盟域规划 service 测试。
Corresponding in_scope ID: alliance-planning
"""
import json
import pytest
from app.schemas.alliance_planning import AlliancePlanningResult
from app.services import alliance_planning_service as svc

@pytest.fixture()
def tmp_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(svc, "_RESULTS_DIR", tmp_path / "results")
    return tmp_path / "results"

class TestData:
    def test_build_leagues(self):
        lg = svc.build_leagues("上海")
        assert lg is not None and lg.count > 0

    def test_build_recruitments(self):
        rc = svc.build_recruitments("上海")
        assert len(rc) >= 2

    def test_build_influencers(self):
        inf = svc.build_influencers("上海")
        assert inf is not None and inf.count > 0

class TestPersist:
    def test_save_get_roundtrip(self, tmp_dir):
        r = AlliancePlanningResult(category="运动鞋", city="上海", suggestion="测试")
        aid = svc.save_alliance_result(r)
        assert aid.startswith("al-")
        assert svc.get_alliance_result(aid) is not None

    def test_invalid_id(self, tmp_dir):
        assert svc.get_alliance_result("al-bad") is None
        assert svc.get_alliance_result("../etc") is None

    def test_missing(self, tmp_dir):
        assert svc.get_alliance_result("al-deadbeef") is None

class TestStream:
    @pytest.mark.asyncio
    async def test_carries_id(self, tmp_dir, monkeypatch):
        async def fake(_): return "测试盟域建议"
        monkeypatch.setattr(svc, "generate_suggestion", fake)
        frames = [f async for f in svc.analyze_stream("运动鞋", "上海")]
        result = [f for f in frames if f.startswith("event: result")]
        assert len(result) == 1
        p = json.loads(result[0].split("data: ")[1])
        assert p.get("alliance_planning_id", "").startswith("al-")
