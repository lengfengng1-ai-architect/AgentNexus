"""Market analysis schemas.

Corresponding OpenSpec: docs/api/paths/market-analysis.yaml
Corresponding in_scope ID: market-analysis
"""

from pydantic import BaseModel, Field


class MarketAnalysisRequest(BaseModel):
    """市场分析请求"""

    brand_name: str = Field(..., min_length=1, max_length=100, description="品牌名称")
    category: str = Field(..., min_length=1, max_length=50, description="品牌品类，英文 snake_case")


class IndustryTrends(BaseModel):
    """行业趋势分析"""

    gdp_change: str = Field(..., description="过去 5 年 GDP/市场规模变化描述")
    market_scale: str = Field(..., description="当前市场规模描述")
    summary: str = Field(..., description="行业整体叙事总结")


class TrendSignal(BaseModel):
    """趋势信号"""

    signal: str = Field(..., description="政策/市场方向信号描述")
    assessment: str = Field(..., description="信号评估", pattern="^(positive|neutral|negative)$")
    source: str = Field(..., description="信息来源 URL 或 'LLM 推理'")


class ConsumerInsight(BaseModel):
    """消费者洞察"""

    shift: str = Field(..., description="消费行为变化描述")
    changes: list[str] = Field(..., min_length=2, description="具体变化表现（至少 2-3 条）")
    source: str = Field(..., description="信息来源 URL 或 'LLM 推理'")


class Competitor(BaseModel):
    """竞争对手"""

    brand_name: str = Field(..., description="竞争品牌名称")
    product_highlights: str = Field(..., description="产品亮点")
    pricing: str = Field(..., description="定价策略描述")
    source: str = Field(..., description="信息来源 URL 或 'LLM 推理'")


class CompetitiveLandscape(BaseModel):
    """竞争格局"""

    competitors: list[Competitor] = Field(..., min_length=2, description="竞争对手列表（至少 2-3 个品牌）")


class MarketAnalysisReport(BaseModel):
    """市场分析报告"""

    industry_trends: IndustryTrends = Field(..., description="行业趋势分析")
    trend_signals: list[TrendSignal] = Field(..., description="趋势信号列表")
    consumer_insights: list[ConsumerInsight] = Field(..., description="消费者洞察列表")
    competitive_landscape: CompetitiveLandscape = Field(..., description="竞争格局")
    full_report: str = Field(..., description="完整的市场分析报告（markdown 格式）")


class MarketAnalysisResponse(BaseModel):
    """市场分析响应"""

    report: MarketAnalysisReport = Field(..., description="市场分析报告")
    confidence: str = Field(..., description="分析置信度", pattern="^(high|medium|low)$")


class MarketAnalysisProgressEvent(BaseModel):
    """SSE 进度事件"""

    stage: str = Field(
        ...,
        description="分析阶段",
        pattern="^(searching_industry|searching_trend|searching_consumer|searching_competitive|analyzing)$",
    )
    progress: int = Field(..., ge=0, le=100, description="进度百分比")
