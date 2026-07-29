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


class TournamentItem(BaseModel):
    """赛事/活动条目（与你争锋系列）。"""

    name: str = Field(..., description="赛事名称")
    sport_type: str = Field(..., description="运动类型，如羽毛球/网球/篮球")
    scale: str = Field(..., description="规模，如'100人/场'")
    frequency: str = Field(..., description="频率，如'月度'/'季度'")
    available_cities: list[str] = Field(default_factory=list, description="可落地城市")
    trophy_customization: bool = Field(default=False, description="是否支持奖杯定制")
    sponsorship_options: list[str] = Field(default_factory=list, description="赞助权益选项")


class TournamentData(BaseModel):
    """赛事数据。"""

    available_tournaments: list[TournamentItem] = Field(default_factory=list, description="可用赛事列表")


class TrophyData(BaseModel):
    """奖杯定制数据。"""

    trophy_types: list[str] = Field(default_factory=list, description="奖杯定制类型，如水晶奖杯/金属纪念奖杯")
    avg_lead_time_days: int = Field(default=15, description="奖杯定制提前期（天）")


class CooperationCenterItem(BaseModel):
    """合作中心条目。"""

    title: str = Field(..., description="招募/合作标题")
    type: str = Field(..., description="类型，如'代理商招募'/'达人招募'/'联盟合作'")
    target_count: int = Field(default=0, description="目标招募数量")
    requirements: list[str] = Field(default_factory=list, description="招募要求列表")


class CooperationCenterData(BaseModel):
    """合作中心数据。"""

    recruitments: list[CooperationCenterItem] = Field(default_factory=list, description="招募合作列表")


class LeaderboardData(BaseModel):
    """排行榜数据。"""

    available: bool = Field(default=True, description="排行榜功能是否可用")
    leaderboard_types: list[str] = Field(default_factory=list, description="排行榜类型，如'经营号排行'/'达人带货榜'/'联盟活跃榜'")
    reward_mechanism: str = Field(default="", description="激励机制描述")


class GroupBuyItem(BaseModel):
    """拼团条目。"""

    type: str = Field(..., description="促销类型")
    description: str = Field(..., description="促销描述")
    min_participants: int = Field(default=2, description="拼团最少人数")
    platform_close: bool = Field(default=True, description="是否在平台内闭环")


class GroupBuyData(BaseModel):
    """拼团数据。"""

    available_types: list[GroupBuyItem] = Field(default_factory=list, description="可用拼团类型")


class SaleItem(BaseModel):
    """促销条目。"""

    type: str = Field(..., description="促销类型，如'限时折扣'/'满减'/'秒杀'")
    description: str = Field(..., description="促销描述")
    platform_close: bool = Field(default=True, description="是否在平台内闭环")


class SaleData(BaseModel):
    """促销数据。"""

    available_types: list[SaleItem] = Field(default_factory=list, description="可用促销类型")
    platform_commission_rate: str = Field(default="", description="平台佣金比例")
    settlement_cycle: str = Field(default="", description="结算周期")


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
    tournament: TournamentData = Field(
        default_factory=lambda: TournamentData(),
        description="赛事数据",
    )
    trophy: TrophyData = Field(
        default_factory=lambda: TrophyData(),
        description="奖杯定制数据",
    )
    cooperation_center: CooperationCenterData = Field(
        default_factory=lambda: CooperationCenterData(),
        description="合作中心数据",
    )
    leaderboard: LeaderboardData = Field(
        default_factory=lambda: LeaderboardData(),
        description="排行榜数据",
    )
    group_buy: GroupBuyData = Field(
        default_factory=lambda: GroupBuyData(),
        description="拼团数据",
    )
    sale: SaleData = Field(
        default_factory=lambda: SaleData(),
        description="促销数据",
    )


class MultiCityDataOutput(BaseModel):
    """多城数据查询节点输出（多城联动方案）。

    各城 CityDataOutput 按 brand_input 城市输入顺序聚合，主城在首位。
    单城场景下 cities 长度为 1，行为等价旧的单城 CityDataOutput。
    """

    cities: list[CityDataOutput] = Field(
        default_factory=list,
        description="多城数据列表，顺序与输入城市一致，主城首位",
    )


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


class CityRole(BaseModel):
    """城市差异化角色定位（多城联动）。"""

    city: str = Field(..., description="城市")
    role: str = Field(
        ...,
        description="角色枚举：flagship_launch 旗舰首发 / experience_cultivation 体验深耕 / channel_conversion 渠道转化 / community_growth 社群裂变",
    )
    rationale: str = Field(..., description="角色分配依据，须引用该城市数据")


class StrategyOutput(BaseModel):
    """策略生成节点输出。"""

    positioning: str = Field(..., description="核心传播主张")
    marketing_goal: str = Field(..., description="营销目标")
    strategy_framework: str = Field(..., description="4M+1C 策略框架描述")
    key_messages: list[str] = Field(default_factory=list, description="核心传播信息")
    city_roles: list[CityRole] = Field(
        default_factory=list,
        description="多城差异化角色定位，主城 flagship_launch；单城可空",
    )


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


class CityBudgetWeight(BaseModel):
    """城市预算权重（多城联动）。"""

    city: str = Field(..., description="城市")
    weight: float = Field(..., description="权重百分比 0-100，各城之和 100")
    rationale: str = Field(..., description="分配依据，须引用该城市数据")


class BudgetKpiOutput(BaseModel):
    """预算与 KPI 节点输出。"""

    total_budget: int = Field(..., description="总预算（万元）")
    period_months: int = Field(..., description="执行周期（月）")
    allocations: list[BudgetAllocation] = Field(default_factory=list, description="预算分配")
    kpis: dict[str, str] = Field(default_factory=dict, description="KPI 指标")
    timeline: list[str] = Field(default_factory=list, description="关键里程碑")
    city_weights: list[CityBudgetWeight] = Field(
        default_factory=list,
        description="多城预算权重（和=100，单城下限 10%、5 城放宽至 8%，上限 70%）；单城可空",
    )


class ActionRecommendation(BaseModel):
    """行动建议条目。"""

    title: str = Field(..., description="行动标题")
    description: str = Field(default="", description="行动描述（100字以内）")
    start_date: str = Field(default="", description="开始日期，如'7月25日'")
    end_date: str = Field(default="", description="结束日期，如'8月5日'")
    priority: str = Field(default="中", description="优先级：高/中/普通")
    category: str = Field(default="", description="分类：达人合作/赛事活动/内容制作/平台投放/运营资源")


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
    xlsx_path: str = Field(
        default="", description="预算流程回报分析 XLSX 文件路径（可选）"
    )


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
