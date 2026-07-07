"""Plan generation pipeline structured output schemas.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

from pydantic import BaseModel, Field


class RequirementCollectorOutput(BaseModel):
    """需求收集节点输出：校验 brand_input 完整性。"""

    is_complete: bool = Field(..., description="字段是否完整")
    missing_fields: list[str] = Field(default_factory=list, description="缺失字段列表")
    brand_input: dict = Field(default_factory=dict, description="校验后的 brand_input")


class MarketTrend(BaseModel):
    """市场趋势条目。"""

    title: str = Field(..., description="趋势标题")
    description: str = Field(..., description="趋势描述")


class MarketResearchOutput(BaseModel):
    """市场调研节点输出。"""

    market_summary: str = Field(..., description="市场分析摘要")
    trends: list[MarketTrend] = Field(default_factory=list, description="行业趋势列表")
    opportunities: list[str] = Field(default_factory=list, description="机会点列表")


class AudienceInsightOutput(BaseModel):
    """人群洞察节点输出。"""

    city: str = Field(..., description="目标城市")
    sport_index: int = Field(..., description="运动人群指数")
    top_sports: list[str] = Field(default_factory=list, description="Top 运动项目")
    persona_summary: str = Field(..., description="人群画像摘要")
    traits: list[str] = Field(default_factory=list, description="人群特征标签")
    peak_hours: str = Field(..., description="活跃高峰时段")


class LeagueData(BaseModel):
    """盟域数据。"""

    count: int = Field(..., description="盟域数量")
    top_leagues: list[str] = Field(default_factory=list, description="头部盟域名称列表")
    avg_members: int = Field(..., description="平均成员数")


class EventData(BaseModel):
    """赛事活动数据。"""

    monthly: int = Field(..., description="月均活动数")
    avg_participants: int = Field(..., description="平均单场参与人数")
    categories: list[str] = Field(default_factory=list, description="活动类型列表")


class InfluencerTiers(BaseModel):
    """达人分层数据。"""

    supreme: int = Field(..., description="至尊/大师级数量")
    star: int = Field(..., description="明星/精英级数量")
    elite: int = Field(..., description="健将级数量")
    influencer: int = Field(..., description="达人级数量")


class InfluencerData(BaseModel):
    """达人数据。"""

    count: int = Field(..., description="认证达人总数")
    tiers: InfluencerTiers = Field(..., description="达人分层数据")
    avg_quote: str = Field(..., description="平均报价")


class StoreData(BaseModel):
    """经营社数据。"""

    count: int = Field(..., description="经营社数量")
    categories: list[str] = Field(default_factory=list, description="覆盖品类")


class VenueData(BaseModel):
    """场馆数据。"""

    count: int = Field(..., description="场馆数量")
    types: list[str] = Field(default_factory=list, description="场馆类型")
    capacity: str = Field(..., description="平均容量")


class CityDataOutput(BaseModel):
    """数据查询节点输出。"""

    city: str = Field(..., description="目标城市")
    population: str = Field(..., description="常住人口")
    sport_index: int = Field(..., description="运动人群指数")
    consumption: str = Field(..., description="消费力等级")
    weekend_active: str = Field(..., description="周末活跃占比")
    leagues: LeagueData = Field(..., description="盟域数据")
    events: EventData = Field(..., description="赛事活动数据")
    influencers: InfluencerData = Field(..., description="达人数据")
    stores: StoreData = Field(..., description="经营社数据")
    venues: VenueData = Field(..., description="场馆数据")


class SportFitnessScore(BaseModel):
    """运动场景适配度评分。"""

    sport: str = Field(..., description="运动项目")
    score: int = Field(..., description="适配度分数 0-100")
    reason: str = Field(..., description="适配理由")


class FitnessAnalysisOutput(BaseModel):
    """适配度分析节点输出。"""

    category: str = Field(..., description="品牌品类")
    city: str = Field(..., description="目标城市")
    sport_fitness_scores: list[SportFitnessScore] = Field(default_factory=list, description="运动场景适配度评分列表")
    primary_sport: str = Field(..., description="主推运动场景")
    secondary_sport: str = Field(..., description="次要运动场景")


class StrategyOutput(BaseModel):
    """策略生成节点输出。"""

    positioning: str = Field(..., description="核心传播主张")
    marketing_goal: str = Field(..., description="营销目标")
    strategy_framework: str = Field(..., description="4M+1C 策略框架描述")
    key_messages: list[str] = Field(default_factory=list, description="核心传播信息")


class ExecutionOutput(BaseModel):
    """执行规划节点输出。"""

    leagues_plan: str = Field(..., description="盟域共建计划")
    events_plan: str = Field(..., description="赛事/活动计划")
    influencer_plan: str = Field(..., description="达人合作矩阵")
    content_plan: str = Field(..., description="内容运营计划")
    store_plan: str = Field(..., description="经营社联动计划")


class BudgetAllocation(BaseModel):
    """预算分配条目。"""

    category: str = Field(..., description="费用类别")
    amount: int = Field(..., description="金额（万元）")
    percentage: float = Field(..., description="占比")


class BudgetKpiOutput(BaseModel):
    """预算与 KPI 节点输出。"""

    total_budget: int = Field(..., description="总预算（万元）")
    period_months: int = Field(..., description="执行周期（月）")
    allocations: list[BudgetAllocation] = Field(default_factory=list, description="预算分配")
    kpis: dict[str, str] = Field(default_factory=dict, description="KPI 指标")
    timeline: list[str] = Field(default_factory=list, description="关键里程碑")


class ActionRecommendation(BaseModel):
    """行动建议条目。"""

    title: str = Field(..., description="行动标题")
    description: str = Field(default="", description="行动描述")


class ActionRecommendationsOutput(BaseModel):
    """行动建议节点输出。"""

    actions: list[ActionRecommendation] = Field(default_factory=list, description="行动建议列表")


# 方案生成器章节规格：title/subtitle 固定，LLM 只生成 content。
# 顺序和文案由产品/策略团队定义，AI 禁止编造章节名称。
PLAN_CHAPTER_SPEC: tuple[tuple[str, str], ...] = (
    ("市场与用户洞察", "从市场趋势到目标人群的完整画像"),
    ("品牌与运动场景适配", "品牌调性、运动场景匹配度分析"),
    ("营销策略与核心主张", "整体策略方向与传播主张"),
    ("执行规划", "盟域/赛事/达人/内容/经营社落地计划"),
    ("时间线与关键里程碑", "分阶段节奏与重要节点"),
    ("预算与 KPI", "预算分配与效果衡量指标"),
    ("创意内容框架", "核心创意概念与内容矩阵"),
    ("达人合作矩阵", "达人分层与合作策略"),
    ("行动建议", "可立即启动的关键行动"),
)


class PlanChapter(BaseModel):
    """方案章节。"""

    title: str = Field(..., description="章节标题")
    subtitle: str = Field(..., description="章节副标题")
    content: str = Field(..., description="章节 Markdown 内容")


class PlanGeneratorOutput(BaseModel):
    """方案生成节点最终输出。"""

    chapters: list[PlanChapter] = Field(..., description="9 章方案列表")


# Union of all plan generation agent outputs for type mapping.
PlanAgentOutput = (
    RequirementCollectorOutput
    | MarketResearchOutput
    | AudienceInsightOutput
    | CityDataOutput
    | FitnessAnalysisOutput
    | StrategyOutput
    | ExecutionOutput
    | BudgetKpiOutput
    | ActionRecommendationsOutput
    | PlanGeneratorOutput
)
