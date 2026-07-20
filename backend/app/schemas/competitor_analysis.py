"""Competitor analysis schemas.

Corresponding OpenSpec: openspec/changes/competitor-analysis
Corresponding in_scope ID: competitor-analysis
"""

from pydantic import BaseModel, Field


class CompetitorItem(BaseModel):
    """竞品条目。"""

    name: str = Field(..., description="竞品品牌名")
    product_matrix: list[str] | None = Field(default=None, description="产品线")
    price_range: str | None = Field(default=None, description="价格区间")
    positioning: str | None = Field(default=None, description="市场定位")
    marketing_channels: list[str] | None = Field(default=None, description="营销渠道")
    recent_moves: str | None = Field(default=None, description="近半年动态")
    sources: list[str] = Field(default_factory=list, description="信息来源 URL")


class CompetitorAnalysisRequest(BaseModel):
    """竞品分析请求。"""

    category: str = Field(..., description="品类，如运动鞋/智能手表")
    brand_name: str | None = Field(default=None, description="指定品牌名，为空则品类级分析")


class CompetitorAnalysisResult(BaseModel):
    """竞品分析结果。"""

    category: str = Field(..., description="分析品类")
    brand_name: str | None = Field(default=None, description="用户指定的品牌名")
    competitors: list[CompetitorItem] = Field(default_factory=list, description="竞品列表")
    market_overview: str | None = Field(default=None, description="品类竞争格局概述")
    suggestion: str | None = Field(default=None, description="策略建议")
