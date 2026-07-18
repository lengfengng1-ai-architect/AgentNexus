"""预算评估 service 测试：计算逻辑 + 持久化 + SSE 携带 budget_assessment_id。

Corresponding OpenSpec: openspec/changes/budget-analysis/specs/budget-analysis/spec.md
Corresponding in_scope ID: budget-analysis
"""
import json

import pytest

from app.schemas.budget_analysis import BudgetAssessmentResult
from app.services import budget_analysis_service as svc


def _sample_result(category: str = "运动鞋", budget: int = 100, period: int = 3, city: str = "上海") -> BudgetAssessmentResult:
    return BudgetAssessmentResult(
        category=category,
        city=city,
        total_budget=budget,
        period_months=period,
        allocations=svc.compute_allocations(budget),
        kpis=svc.compute_kpis(budget),
        timeline=svc.compute_timeline(period),
        suggestion="测试建议",
    )


@pytest.fixture()
def tmp_results_dir(tmp_path, monkeypatch):
    target = tmp_path / "results"
    monkeypatch.setattr(svc, "_BUDGET_RESULTS_DIR", target)
    return target


class TestCompute:
    def test_allocations_sum_equals_budget(self):
        for budget in (100, 200, 150, 1, 99):
            allocs = svc.compute_allocations(budget)
            assert sum(a.amount for a in allocs) == budget
            assert [a.percentage for a in allocs] == [30, 15, 25, 20, 10]

    def test_kpis_scale_by_budget(self):
        base = svc.compute_kpis(200)
        half = svc.compute_kpis(100)
        # 曝光 200→base, 100→half（线性缩放）
        assert base["曝光量"].startswith("500")  # base 500万
        assert half["曝光量"].startswith("250")
        assert "转化率" in half

    def test_timeline_by_months(self):
        t3 = svc.compute_timeline(3)
        assert len(t3) == 3
        assert "第1月" in t3[0] and "第3月" in t3[2]
        t1 = svc.compute_timeline(1)
        assert len(t1) == 1

    def test_timeline_empty_for_zero(self):
        assert svc.compute_timeline(0) == []


class TestSaveAndGet:
    def test_save_then_get_roundtrip(self, tmp_results_dir):
        result = _sample_result()
        bid = svc.save_budget_result(result)
        assert bid.startswith("ba-") and len(bid) == 11

        loaded = svc.get_budget_result(bid)
        assert loaded is not None
        assert loaded.category == "运动鞋"
        assert loaded.total_budget == 100
        assert loaded.suggestion == "测试建议"

    def test_save_twice_distinct_ids(self, tmp_results_dir):
        b1 = svc.save_budget_result(_sample_result())
        b2 = svc.save_budget_result(_sample_result())
        assert b1 != b2

    def test_save_failure_still_returns_id(self, tmp_results_dir, monkeypatch):
        def boom(*a, **k):
            raise OSError("disk full")
        monkeypatch.setattr(type(tmp_results_dir), "mkdir", boom)
        bid = svc.save_budget_result(_sample_result())
        assert bid.startswith("ba-")
        assert svc.get_budget_result(bid) is None


class TestGetValidation:
    @pytest.mark.parametrize("bad_id", ["../etc/passwd", "ba-../../x", "ba-XYZ12345", "ba-123", "abc123", ""])
    def test_invalid_id_returns_none(self, tmp_results_dir, bad_id):
        assert svc.get_budget_result(bad_id) is None

    def test_missing_file_returns_none(self, tmp_results_dir):
        assert svc.get_budget_result("ba-deadbeef") is None

    def test_corrupted_file_raises(self, tmp_results_dir):
        tmp_results_dir.mkdir(parents=True, exist_ok=True)
        (tmp_results_dir / "ba-bad0bad0.json").write_text("not-json{", encoding="utf-8")
        with pytest.raises(json.JSONDecodeError):
            svc.get_budget_result("ba-bad0bad0")


class TestGetEndpoint:
    @pytest.mark.asyncio
    async def test_get_200(self, tmp_results_dir):
        from httpx import ASGITransport, AsyncClient
        from app.main import app

        bid = svc.save_budget_result(_sample_result())
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(f"/api/v1/budget-analysis/results/{bid}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["category"] == "运动鞋"
        assert data["total_budget"] == 100

    @pytest.mark.asyncio
    async def test_get_404_not_found(self, tmp_results_dir):
        from httpx import ASGITransport, AsyncClient
        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/budget-analysis/results/ba-deadbeef")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_404_invalid_format(self, tmp_results_dir):
        from httpx import ASGITransport, AsyncClient
        from app.main import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/budget-analysis/results/..%2Fetc")
        assert resp.status_code == 404


class TestStreamCarriesId:
    @pytest.mark.asyncio
    async def test_result_event_carries_budget_assessment_id(self, tmp_results_dir, monkeypatch):
        """SSE result 事件必须携带格式合法的 budget_assessment_id，且文件已落盘。"""
        async def fake_suggestion(_result):
            return "测试一句话建议"
        monkeypatch.setattr(svc, "generate_suggestion", fake_suggestion)

        frames = [f async for f in svc.analyze_stream("运动鞋", 100, 3, "上海")]
        result_frames = [f for f in frames if f.startswith("event: result")]
        assert len(result_frames) == 1

        payload = json.loads(result_frames[0].split("data: ", 1)[1])
        bid = payload.get("budget_assessment_id", "")
        assert bid.startswith("ba-") and len(bid) == 11
        assert payload["category"] == "运动鞋"
        assert payload["suggestion"] == "测试一句话建议"
        # allocations 已算出且总和=预算
        assert sum(a["amount"] for a in payload["allocations"]) == 100
        assert (tmp_results_dir / f"{bid}.json").exists()
