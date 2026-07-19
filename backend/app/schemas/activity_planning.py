"""Activity planning schemas.

Corresponding OpenSpec: docs/api/paths/activity-planning.yaml
Corresponding in_scope ID: activity-planning
"""

from pydantic import BaseModel, Field


class ActivityPlanningRequest(BaseModel):
    """活动规划请求。"""

    sport_type: str = Field(..., description="运动类型，如羽毛球/跑步/瑜伽")
    city: str = Field(..., description="目标城市")


class CandidateTournament(BaseModel):
    """候选赛事条目。"""

    name: str = Field(..., description="赛事名称")
    sport_type: str = Field(..., description="运动类型")
    scale: str = Field(..., description="规模，如 200人/场")
    frequency: str = Field(..., description="频率，如 月度/季度")
    sponsorship_options: list[str] = Field(default_factory=list, description="赞助权益选项")
    exact_match: bool = Field(default=True, description="是否精确匹配 sport_type（降级时为 False）")


class EventsSummary(BaseModel):
    """城市活动热度摘要。"""

    monthly: int = Field(..., description="月均活动数")
    avg_participants: int = Field(..., description="平均单场参与人数")
    categories: list[str] = Field(default_factory=list, description="活动类型列表")


class VenuesSummary(BaseModel):
    """场馆资源摘要。"""

    count: int = Field(..., description="场馆数量")
    types: list[str] = Field(default_factory=list, description="场馆类型")
    capacity: str = Field(..., description="平均容量")


class ActivityPlanningResult(BaseModel):
    """活动规划结果。"""

    sport_type: str = Field(..., description="运动类型")
    city: str = Field(..., description="城市")
    candidates: list[CandidateTournament] = Field(default_factory=list, description="候选赛事列表")
    events_summary: EventsSummary | None = Field(default=None, description="城市活动热度")
    venues_summary: VenuesSummary | None = Field(default=None, description="场馆资源")
    suggestion: str = Field(..., description="一句话建议（LLM 基于候选赛事生成）")
