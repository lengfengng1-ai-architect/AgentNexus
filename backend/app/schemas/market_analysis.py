"""Market research schemas V2 — structured research result model.

Corresponding OpenSpec: docs/api/paths/market-analysis.yaml
Corresponding in_scope ID: market-analysis
"""

from pydantic import BaseModel, Field
from typing import Literal


# ── 请求 ──

class MarketResearchRequest(BaseModel):
    """市场研究请求"""
    market_name: str = Field(..., min_length=1, max_length=200, description="市场/赛道名称")
    category: str = Field(..., min_length=1, max_length=100, description="行业分类")


# ── 引用类型 ──

ConfidenceLevel = Literal["high", "medium", "low"]


class EvidenceItem(BaseModel):
    """证据条目"""
    evidence_id: str = Field(..., description="证据 ID")
    claim: str = Field(..., description="被支持的结论或数据点")
    source_type: str = Field(..., description="来源类型：官方统计/上市公司公告/研报/媒体报道/用户上传/模型推断")
    source_name: str = Field(..., description="来源名称")
    source_url: str = Field(default="", description="来源链接")
    publish_time: str = Field(default="", description="发布时间")
    retrieved_at: str = Field(default="", description="检索时间")
    original_excerpt: str = Field(default="", description="原文摘录")
    confidence_level: ConfidenceLevel = Field(default="medium")
    cross_validated: bool = Field(default=False)
    conflict_notes: str = Field(default="", description="冲突说明")


# ── 1. market_definition ──

class MarketDefinition(BaseModel):
    """市场定义与边界"""
    included_scope: list[str] = Field(default_factory=list, description="纳入统计的产品/服务/场景")
    excluded_scope: list[str] = Field(default_factory=list, description="明确不纳入的边界")
    upstream: list[str] = Field(default_factory=list, description="上游环节")
    downstream: list[str] = Field(default_factory=list, description="下游客户或渠道")
    substitute_solutions: list[str] = Field(default_factory=list, description="替代方案")
    definition_notes: str = Field(default="", description="市场边界说明")


# ── 2. market_size ──

class MarketSizeSegment(BaseModel):
    """市场规模分段（TAM/SAM/SOM）"""
    value: float | None = Field(default=None, description="规模数值")
    unit: str = Field(default="亿元人民币")
    year: int | None = Field(default=None, description="数据年份")
    calculation_method: str = Field(default="", description="测算方法")
    confidence_level: ConfidenceLevel = Field(default="medium")
    evidence_ids: list[str] = Field(default_factory=list)


class MarketSize(BaseModel):
    """市场规模"""
    tam: MarketSizeSegment = Field(default_factory=MarketSizeSegment)
    sam: MarketSizeSegment = Field(default_factory=MarketSizeSegment)
    som: MarketSizeSegment = Field(default_factory=MarketSizeSegment)
    cagr: float | None = Field(default=None, description="复合年增长率")
    cagr_period: str = Field(default="", description="CAGR 覆盖年份")
    cagr_confidence: ConfidenceLevel = Field(default="medium")
    cagr_evidence_ids: list[str] = Field(default_factory=list)
    conflict_notes: str = Field(default="", description="不同来源数据冲突说明")


# ── 3. trend_signals ──

class TrendSignalItem(BaseModel):
    """趋势信号"""
    signal_type: str = Field(..., description="信号类型：政策/技术/消费行为/投融资/搜索热度/媒体热度")
    title: str = Field(..., description="趋势标题")
    summary: str = Field(..., description="趋势说明")
    impact: Literal["positive", "negative", "neutral"] = Field(...)
    confidence_level: ConfidenceLevel = Field(default="medium")
    evidence_ids: list[str] = Field(default_factory=list)


# ── 4. target_users ──

class TargetUserSegment(BaseModel):
    """用户分群"""
    segment_name: str = Field(..., description="用户分群名称")
    user_profile: str = Field(default="", description="人群画像")
    core_scenarios: list[str] = Field(default_factory=list, description="使用场景")
    pain_points: list[str] = Field(default_factory=list, description="核心痛点")
    purchase_drivers: list[str] = Field(default_factory=list, description="购买动因")
    purchase_barriers: list[str] = Field(default_factory=list, description="购买阻力")
    willingness_to_pay: str = Field(default="", description="付费意愿描述")
    evidence_ids: list[str] = Field(default_factory=list)


# ── 5. competitors ──

class CompetitorItem(BaseModel):
    """竞争对手"""
    company_name: str = Field(..., description="公司名称")
    brand: str = Field(default="", description="品牌名称")
    product_or_service: str = Field(default="", description="产品或服务")
    positioning: str = Field(default="", description="市场定位")
    pricing: str = Field(default="", description="价格区间或收费模式")
    channels: list[str] = Field(default_factory=list, description="销售或获客渠道")
    strengths: list[str] = Field(default_factory=list, description="优势")
    weaknesses: list[str] = Field(default_factory=list, description="劣势")
    evidence_ids: list[str] = Field(default_factory=list)


# ── 6. opportunity_assessment ──

class OpportunityAssessment(BaseModel):
    """机会评估"""
    market_attractiveness: ConfidenceLevel = Field(default="medium", description="市场吸引力")
    competition_intensity: ConfidenceLevel = Field(default="medium", description="竞争强度")
    entry_difficulty: ConfidenceLevel = Field(default="medium", description="进入难度")
    data_confidence: ConfidenceLevel = Field(default="medium", description="数据置信度")
    key_opportunities: list[str] = Field(default_factory=list, description="主要机会")
    key_risks: list[str] = Field(default_factory=list, description="主要风险")
    recommended_actions: list[str] = Field(default_factory=list, description="建议动作")
    unknowns_to_verify: list[str] = Field(default_factory=list, description="待人工核实项")


# ── 根对象 ──

class MarketResearchResult(BaseModel):
    """市场研究结果（V2 — 结构化市场/赛道研究 JSON）"""
    # 基本标识
    market_name: str = Field(..., description="官方或常用的市场/赛道名称")
    market_type: str = Field(default="消费市场", description="商业市场/产业市场/消费市场/企业服务市场等")
    industry: str = Field(..., description="所属行业")
    category: str = Field(..., description="市场类别")
    description: str = Field(default="", description="一句话描述")

    # 范围
    geo_scope: str = Field(default="中国大陆")
    time_scope_start: int = Field(default=2021)
    time_scope_end: int = Field(default=2026)
    focus_period: str = Field(default="近3年")

    # 研究属性
    research_purpose: str = Field(default="市场进入评估")
    research_depth: Literal["quick_brief", "standard_report", "deep_report"] = Field(default="standard_report")

    # 五大模块
    market_definition: MarketDefinition = Field(default_factory=MarketDefinition)
    market_size: MarketSize = Field(default_factory=MarketSize)
    trend_signals: list[TrendSignalItem] = Field(default_factory=list)
    target_users: list[TargetUserSegment] = Field(default_factory=list)
    competitors: list[CompetitorItem] = Field(default_factory=list)
    opportunity_assessment: OpportunityAssessment = Field(default_factory=OpportunityAssessment)
    evidence: list[EvidenceItem] = Field(default_factory=list)

    # 兼容字段
    full_report: str = Field(default="", description="完整分析报告（markdown，synthesize 节点拼接）")


# ── 响应包装 ──

class MarketResearchResponse(BaseModel):
    """市场研究响应"""
    result: MarketResearchResult = Field(..., description="市场研究结果")
    confidence: ConfidenceLevel = Field(default="medium")


# ── 进度事件 ──

_RESEARCH_NODES = [
    ("define", 14),
    ("size", 28),
    ("trends", 42),
    ("users", 57),
    ("competitors", 71),
    ("assess", 85),
    ("synthesize", 100),
]

RESEARCH_NODES = list(_RESEARCH_NODES)


class MarketAnalysisProgressEvent(BaseModel):
    """SSE 进度事件"""
    node: str = Field(..., description="当前节点名称")
    progress: int = Field(..., ge=0, le=100, description="进度百分比")
    stage: str = Field(..., description="阶段中文描述")


class MarketResearchDataEvent(BaseModel):
    """SSE 节点数据事件"""
    node: str = Field(..., description="节点名称")
    result: dict = Field(..., description="该节点输出的结构化数据")


class MarketResearchNodeEnd(BaseModel):
    """SSE 节点完成事件"""
    node: str = Field(..., description="节点名称")
    status: str = Field(..., description="completed 或 failed")
    error: str | None = Field(None, description="错误信息")


# ── 向后兼容别名 ──
MarketAnalysisRequest = MarketResearchRequest
MarketAnalysisResponse = MarketResearchResponse
MarketAnalysisReport = MarketResearchResult
