"""调研结果持久化与按 ID 拉取的测试。

Corresponding OpenSpec: openspec/changes/mobile-research-report-page/specs/market-analysis/spec.md
Corresponding in_scope ID: market-analysis
"""
import json

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.schemas.market_analysis import MarketResearchResponse
from app.services import market_analysis_service as svc


def _sample_response() -> MarketResearchResponse:
    return MarketResearchResponse(
        result={
            "market_name": "智能手表",
            "industry": "可穿戴设备",
            "category": "消费电子",
            "full_report": "# 智能手表市场调研\n内容",
        },
        confidence="medium",
    )


@pytest.fixture()
def tmp_results_dir(tmp_path, monkeypatch):
    """把结果存储目录隔离到 tmp_path，避免污染 mock_data。"""
    target = tmp_path / "results"
    monkeypatch.setattr(svc, "_RESEARCH_RESULTS_DIR", target)
    return target


class TestSaveAndGet:
    def test_save_then_get_roundtrip(self, tmp_results_dir):
        resp = _sample_response()
        rid = svc.save_research_result(resp)

        assert rid.startswith("mr-") and len(rid) == 11
        assert (tmp_results_dir / f"{rid}.json").exists()

        loaded = svc.get_research_result(rid)
        assert loaded is not None
        assert loaded.result.market_name == "智能手表"
        assert loaded.result.full_report.startswith("# 智能手表")

    def test_save_twice_generates_distinct_ids(self, tmp_results_dir):
        rid1 = svc.save_research_result(_sample_response())
        rid2 = svc.save_research_result(_sample_response())
        assert rid1 != rid2
        assert (tmp_results_dir / f"{rid1}.json").exists()
        assert (tmp_results_dir / f"{rid2}.json").exists()

    def test_save_failure_still_returns_id(self, tmp_results_dir, monkeypatch):
        # 让 mkdir 抛 OSError 模拟落盘失败
        def boom(*args, **kwargs):
            raise OSError("disk full")

        monkeypatch.setattr(type(tmp_results_dir), "mkdir", boom)
        rid = svc.save_research_result(_sample_response())
        assert rid.startswith("mr-")  # 不抛异常
        # 未写入文件 → get 返回 None（降级为 404）
        assert svc.get_research_result(rid) is None


class TestGetValidation:
    @pytest.mark.parametrize(
        "bad_id",
        [
            "../etc/passwd",          # 路径遍历
            "mr-../../x",             # 伪装前缀遍历
            "mr-XYZ12345",            # 大写非法
            "mr-123",                 # 长度不足
            "abc123",                 # 缺前缀
            "",                       # 空
        ],
    )
    def test_invalid_id_returns_none(self, tmp_results_dir, bad_id):
        assert svc.get_research_result(bad_id) is None

    def test_missing_file_returns_none(self, tmp_results_dir):
        assert svc.get_research_result("mr-deadbeef") is None

    def test_corrupted_file_raises(self, tmp_results_dir):
        # 文件存在但内容损坏 → json.loads 抛异常，由 router 层兜底 500
        tmp_results_dir.mkdir(parents=True, exist_ok=True)
        (tmp_results_dir / "mr-bad0bad0.json").write_text("not-json{", encoding="utf-8")
        with pytest.raises(json.JSONDecodeError):
            svc.get_research_result("mr-bad0bad0")


class TestGetEndpoint:
    @pytest.mark.asyncio
    async def test_get_200(self, tmp_results_dir):
        rid = svc.save_research_result(_sample_response())
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(f"/api/v1/market-analysis/results/{rid}")
        assert response.status_code == 200
        data = response.json()
        assert data["result"]["market_name"] == "智能手表"
        assert data["confidence"] == "medium"

    @pytest.mark.asyncio
    async def test_get_404_not_found(self, tmp_results_dir):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/market-analysis/results/mr-deadbeef")
        assert response.status_code == 404
        body = response.json()
        # FastAPI HTTPException detail 包装：APIError dict 在 detail 字段
        assert "调研结果不存在" in json.dumps(body, ensure_ascii=False)

    @pytest.mark.asyncio
    async def test_get_404_invalid_format(self, tmp_results_dir):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/market-analysis/results/..%2F..%2Fetc")
        assert response.status_code == 404


class TestStreamCarriesResearchId:
    @pytest.mark.asyncio
    async def test_result_event_carries_research_id(self, tmp_results_dir, monkeypatch):
        """SSE result 事件必须携带格式合法的 research_id，且文件已落盘（先写后发）。"""
        from unittest.mock import AsyncMock

        import app.services.market_analysis_service as service

        async def fake_node(*args, **kwargs):
            return {}

        resp = _sample_response()
        monkeypatch.setattr(service, "call_node_define", AsyncMock(side_effect=fake_node))
        monkeypatch.setattr(service, "call_node_size", AsyncMock(side_effect=fake_node))
        monkeypatch.setattr(service, "call_node_trends", AsyncMock(side_effect=fake_node))
        monkeypatch.setattr(service, "call_node_users", AsyncMock(side_effect=fake_node))
        monkeypatch.setattr(service, "call_node_competitors", AsyncMock(side_effect=fake_node))
        monkeypatch.setattr(service, "call_node_assess", AsyncMock(side_effect=fake_node))
        monkeypatch.setattr(service, "call_node_synthesize", AsyncMock(return_value="# 报告"))
        monkeypatch.setattr(service, "assemble_result", lambda *a, **k: resp)

        frames = [f async for f in service.analyze_stream("智能手表", "消费电子")]
        result_frames = [f for f in frames if f.startswith("event: result")]
        assert len(result_frames) == 1

        payload = json.loads(result_frames[0].split("data: ", 1)[1])
        rid = payload.get("research_id", "")
        assert rid.startswith("mr-") and len(rid) == 11
        int(rid[3:], 16)  # 8 位 hex 可解析
        assert (tmp_results_dir / f"{rid}.json").exists()
