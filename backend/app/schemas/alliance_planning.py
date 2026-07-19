"""Alliance planning schemas.

Corresponding OpenSpec: docs/api/paths/alliance-planning.yaml
Corresponding in_scope ID: alliance-planning
"""

from pydantic import BaseModel, Field


class AlliancePlanningRequest(BaseModel):
    category: str = Field(..., description="品类")
    city: str = Field(..., description="目标城市")


class RecruitmentItem(BaseModel):
    title: str = Field(..., description="招募/合作标题")
    type: str = Field(..., description="类型，如代理商招募/达人招募")
    target_count: int = Field(default=0, description="目标招募数量")
    requirements: list[str] = Field(default_factory=list, description="招募要求")


class LeaguesSummary(BaseModel):
    count: int = Field(..., description="盟域数量")
    top_leagues: list[str] = Field(default_factory=list, description="头部盟域名称")
    avg_members: int = Field(..., description="平均成员数")


class InfluencerSummary(BaseModel):
    count: int = Field(..., description="达人总数")
    tiers: dict[str, int] = Field(default_factory=dict, description="分层 {至尊/大师: n, ...}")
    avg_quote: str = Field(..., description="平均报价")


class AlliancePlanningResult(BaseModel):
    category: str = Field(..., description="品类")
    city: str = Field(..., description="城市")
    leagues: LeaguesSummary | None = Field(default=None)
    recruitments: list[RecruitmentItem] = Field(default_factory=list)
    influencers: InfluencerSummary | None = Field(default=None)
    suggestion: str = Field(..., description="一句话建议（LLM 生成）")
