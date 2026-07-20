"""社群运营 service 测试：持久化 + intent normalize。
Corresponding OpenSpec: openspec/changes/community-operations
Corresponding in_scope ID: community-operations
"""
import json
import pytest

from app.schemas.community_operations import CommunityOperationsResult, ContentPlanItem, OperationActivity
from app.services import community_operations_service as svc


@pytest.fixture()
def tmp_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(svc, "_RESULTS_DIR", tmp_path / "results")
    return tmp_path / "results"


class TestPersist:
    def test_save_get_roundtrip(self, tmp_dir):
        r = CommunityOperationsResult(
            category="瑜伽服", city="上海",
            community_positioning="专注都市女性瑜伽爱好者的品牌社群",
            target_members="25-35岁女性",
            content_plan=[ContentPlanItem(content_type="运动技巧", description="瑜伽技巧分享", frequency="每周2次")],
            operation_activities=[OperationActivity(activity_name="21天打卡", goal="拉新200人", description="瑜伽打卡挑战")],
            kpi_targets={"active_rate": "40%"},
            suggestion="测试建议",
        )
        co_id = svc.save_community_result(r)
        assert co_id.startswith("co-")
        retrieved = svc.get_community_result(co_id)
        assert retrieved is not None
        assert retrieved.category == "瑜伽服"
        assert retrieved.city == "上海"

    def test_invalid_id(self, tmp_dir):
        assert svc.get_community_result("co-bad") is None
        assert svc.get_community_result("../etc") is None

    def test_missing(self, tmp_dir):
        assert svc.get_community_result("co-deadbeef") is None


class TestIntentNormalize:
    def test_community_is_independent(self):
        from app.agents.intent_recognition_agent import _normalize_intent_output
        from app.schemas.intent import IntentRecognitionOutput
        from app.schemas.chat import BrandInput

        output = IntentRecognitionOutput(
            intent="community_operations",
            confidence=0.9,
            reply="测试",
            brand_input=BrandInput(category="瑜伽服", city="上海"),
        )
        result = _normalize_intent_output(output)
        assert result.intent == "community_operations"

    def test_missing_category(self):
        from app.agents.intent_recognition_agent import _normalize_intent_output
        from app.schemas.intent import IntentRecognitionOutput
        from app.schemas.chat import BrandInput

        output = IntentRecognitionOutput(
            intent="community_operations",
            confidence=0.85,
            reply="",
            brand_input=BrandInput(),
        )
        result = _normalize_intent_output(output)
        assert result.intent == "community_operations"
        assert "category" in result.missing_fields

    def test_full_fields(self):
        from app.agents.intent_recognition_agent import _normalize_intent_output
        from app.schemas.intent import IntentRecognitionOutput
        from app.schemas.chat import BrandInput

        output = IntentRecognitionOutput(
            intent="community_operations",
            confidence=0.95,
            reply="",
            brand_input=BrandInput(category="运动鞋", city="上海"),
        )
        result = _normalize_intent_output(output)
        assert len(result.missing_fields) == 0
        assert result.reply != ""
