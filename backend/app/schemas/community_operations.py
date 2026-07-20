"""Community operations schemas.

Corresponding OpenSpec: openspec/changes/community-operations
Corresponding in_scope ID: community-operations
"""

from pydantic import BaseModel, Field


class ContentPlanItem(BaseModel):
    """内容规划条目。"""

    content_type: str = Field(..., description="内容类型，如运动技巧图文/产品测评短视频")
    description: str = Field(..., description="内容描述")
    frequency: str = Field(..., description="发布频次，如每周2次/双周")


class OperationActivity(BaseModel):
    """运营活动条目。"""

    activity_name: str = Field(..., description="活动名称")
    goal: str = Field(..., description="活动目标，如拉新200人/活跃提升30%")
    description: str = Field(..., description="活动说明")


class CommunityOperationsRequest(BaseModel):
    """社群运营规划请求。"""

    category: str = Field(..., description="品类，如瑜伽服/运动鞋")
    city: str = Field(..., description="目标城市")


class CommunityOperationsResult(BaseModel):
    """社群运营规划结果。"""

    category: str = Field(..., description="品类")
    city: str = Field(..., description="城市")
    community_positioning: str = Field(..., description="社群定位")
    target_members: str = Field(..., description="目标人群")
    content_plan: list[ContentPlanItem] = Field(default_factory=list, description="内容规划")
    operation_activities: list[OperationActivity] = Field(default_factory=list, description="运营活动")
    kpi_targets: dict[str, str] = Field(default_factory=dict, description="KPI 目标")
    suggestion: str = Field(default="", description="一句话建议（LLM 生成）")
