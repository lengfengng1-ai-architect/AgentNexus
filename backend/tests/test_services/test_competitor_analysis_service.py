"""竞品分析 service 测试：持久化 + intent normalize。
Corresponding OpenSpec: openspec/changes/competitor-analysis
Corresponding in_scope ID: competitor-analysis
"""
import json
import pytest

from app.schemas.competitor_analysis import CompetitorAnalysisResult, CompetitorItem
from app.services import competitor_analysis_service as svc


def _sample_result() -> CompetitorAnalysisResult:
    return CompetitorAnalysisResult(
        category="运动鞋",
        brand_name="安踏",
        competitors=[
            CompetitorItem(name="Nike", product_matrix=["Air Max"], price_range="400-1500元", positioning="高端专业运动", sources=["https://example.com/nike"]),
        ],
        market_overview="运动鞋市场竞争激烈",
        suggestion="建议以中端性价比切入",
    )


@pytest.fixture()
def tmp_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(svc, "_RESULTS_DIR", tmp_path / "results")
    return tmp_path / "results"


class TestPersist:
    def test_save_get_roundtrip(self, tmp_dir):
        r = _sample_result()
        ca_id = svc.save_competitor_result(r)
        assert ca_id.startswith("ca-")
        retrieved = svc.get_competitor_result(ca_id)
        assert retrieved is not None
        assert retrieved.category == "运动鞋"
        assert retrieved.brand_name == "安踏"
        assert len(retrieved.competitors) == 1

    def test_invalid_id(self, tmp_dir):
        assert svc.get_competitor_result("ca-bad") is None
        assert svc.get_competitor_result("../etc") is None

    def test_missing(self, tmp_dir):
        assert svc.get_competitor_result("ca-deadbeef") is None

    def test_json_structure(self, tmp_dir):
        r = _sample_result()
        ca_id = svc.save_competitor_result(r)
        raw = json.loads((tmp_dir / f"{ca_id}.json").read_text(encoding="utf-8"))
        assert raw["category"] == "运动鞋"
        assert raw["brand_name"] == "安踏"

    def test_brand_name_none(self, tmp_dir):
        r = CompetitorAnalysisResult(category="智能手表", brand_name=None, competitors=[], suggestion="测试")
        ca_id = svc.save_competitor_result(r)
        retrieved = svc.get_competitor_result(ca_id)
        assert retrieved is not None
        assert retrieved.brand_name is None


class TestIntentNormalize:
    """测试意图归一化逻辑（直接从业务规则验证，不启动 Agent）"""

    def test_competitor_analysis_is_independent(self):
        """competitor_analysis 必须在 INDEPENDENT 元组中，防止被翻转为 clarify"""
        from app.agents.intent_recognition_agent import _normalize_intent_output
        from app.schemas.intent import IntentRecognitionOutput
        from app.schemas.chat import BrandInput

        output = IntentRecognitionOutput(
            intent="competitor_analysis",
            confidence=0.9,
            reply="测试回复",
            brand_input=BrandInput(category="运动鞋", brand_name="安踏"),
        )
        result = _normalize_intent_output(output)
        assert result.intent == "competitor_analysis"

    def test_missing_category_keeps_intent(self):
        """缺 category 时保持 competitor_analysis + 标记 missing_fields"""
        from app.agents.intent_recognition_agent import _normalize_intent_output
        from app.schemas.intent import IntentRecognitionOutput
        from app.schemas.chat import BrandInput

        output = IntentRecognitionOutput(
            intent="competitor_analysis",
            confidence=0.85,
            reply="",
            brand_input=BrandInput(),
        )
        result = _normalize_intent_output(output)
        assert result.intent == "competitor_analysis"
        assert "category" in result.missing_fields
        assert result.reply != ""

    def test_full_fields_no_missing(self):
        """category 齐全时 missing_fields 为空，reply 为确认"""
        from app.agents.intent_recognition_agent import _normalize_intent_output
        from app.schemas.intent import IntentRecognitionOutput
        from app.schemas.chat import BrandInput

        output = IntentRecognitionOutput(
            intent="competitor_analysis",
            confidence=0.95,
            reply="",
            brand_input=BrandInput(category="运动鞋"),
        )
        result = _normalize_intent_output(output)
        assert result.intent == "competitor_analysis"
        assert len(result.missing_fields) == 0
        assert result.reply != ""
