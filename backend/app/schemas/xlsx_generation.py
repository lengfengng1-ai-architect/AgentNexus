"""方案 XLSX 表格生成 — 结构化数据模型

LLM 用 with_structured_output 输出 XlsxData，
generate_plan_xlsx tool 直接消费并组装 xlsx。

参考格式：娃哈哈营销方案_预算流程回报分析.xlsx
对应 OpenSpec: docs/superpowers/specs/2026-07-09-xlsx-generation-design.md
"""

from pydantic import BaseModel, Field


# ── Sheet 1: 预算总览对比 ───────────────────────────────────


class BudgetOverviewRow(BaseModel):
    """预算总览对比单行。"""

    category: str = Field(..., description="费用项目类别名称")
    amount_version_a: float = Field(
        ..., description="A版本（完整版/汇总版）金额（万元）"
    )
    pct_version_a: str = Field(..., description="A版本占比字符串，如'20.0%'")
    amount_version_b: float | None = Field(
        None,
        description="B版本（单城市版）金额（万元），单版本时为 None",
    )
    pct_version_b: str | None = Field(
        None, description="B版本占比字符串，单版本时为 None"
    )
    diff: str = Field(default="", description="版本间差异说明")


class BudgetOverviewSheet(BaseModel):
    """预算总览对比工作表数据。"""

    rows: list[BudgetOverviewRow] = Field(
        ..., description="预算对比行列表，顺序即为表格显示顺序"
    )
    total_a: float = Field(..., description="A版本总预算（万元）")
    total_b: float | None = Field(
        None, description="B版本总预算（万元），单版本时为 None"
    )
    note: str = Field(default="", description="备注说明")


# ── Sheet 2: 预算明细 ──────────────────────────────────────


class BudgetDetailItem(BaseModel):
    """预算明细单行。"""

    category: str = Field(..., description="费用大类，如'赛事/活动费用'")
    sub: str = Field(..., description="子项明细名称")
    desc: str = Field(..., description="用途说明")
    amount_a: float = Field(..., description="A版本金额（万元）")
    amount_b: float | None = Field(
        None, description="B版本金额（万元），单版本时为 None"
    )
    note: str = Field(default="", description="备注")


class BudgetDetailSheet(BaseModel):
    """预算明细工作表数据。"""

    items: list[BudgetDetailItem] = Field(
        ..., description="预算明细行列表"
    )


# ── Sheet 3: 活动流程时间线 ────────────────────────────────


class TimelineItem(BaseModel):
    """时间线条目。"""

    phase: str = Field(..., description="阶段名称，如'筹备期'/'预热期'/'爆发期'/'收割期'")
    week: str = Field(..., description="时间范围，如'第1-2周'")
    goal: str = Field(..., description="阶段目标")
    task: str = Field(..., description="核心任务")
    action: str = Field(..., description="具体动作描述")
    owner: str = Field(..., description="负责方")
    deliverable: str = Field(..., description="阶段产出")


class GanttItem(BaseModel):
    """甘特图阶段汇总。"""

    phase: str = Field(..., description="阶段名称")
    start_week: int = Field(..., description="起始周")
    duration_weeks: int = Field(..., description="持续周数")


class TimelineSheet(BaseModel):
    """活动流程时间线工作表数据。"""

    items: list[TimelineItem] = Field(
        ..., description="时间线条目列表"
    )
    gantt: list[GanttItem] = Field(
        ..., description="甘特图阶段汇总"
    )


# ── Sheet 4: 预期效果KPI ───────────────────────────────────


class KPIRow(BaseModel):
    """KPI 单行。"""

    dim: str = Field(..., description="指标维度，如'品牌传播'/'用户增长'/'销售转化'/'渠道建设'")
    metric: str = Field(..., description="指标名称")
    definition: str = Field(..., description="指标定义")
    target_a: str = Field(..., description="A版本目标值字符串，如'≥ 1亿次'")
    target_b: str | None = Field(
        None, description="B版本目标值字符串，单版本时为 None"
    )
    target_a_num: float = Field(..., description="A版本数值（用于图表绘制）")
    target_b_num: float | None = Field(
        None, description="B版本数值（用于图表绘制），单版本时为 None"
    )
    path: str = Field(..., description="达成路径")


class ROIRow(BaseModel):
    """ROI 分析单行。"""

    type: str = Field(
        ..., description="类型，如'投入'/'产出'/'ROI'/'效率'"
    )
    metric: str = Field(..., description="指标名称")
    definition: str = Field(..., description="指标定义")
    value_a: str = Field(..., description="A版本值")
    value_b: str | None = Field(
        None, description="B版本值，单版本时为 None"
    )
    note: str = Field(default="", description="备注说明")


class ROIChartPoint(BaseModel):
    """ROI 图表数据点。"""

    name: str = Field(..., description="项目名称")
    value_a: float = Field(..., description="A版本数值")
    value_b: float | None = Field(
        None, description="B版本数值，单版本时为 None"
    )


class RadarScore(BaseModel):
    """雷达图维度评分。"""

    dim: str = Field(..., description="维度名称")
    score_a: float = Field(..., description="A版本评分")
    score_b: float | None = Field(
        None, description="B版本评分，单版本时为 None"
    )


class KPISheet(BaseModel):
    """预期效果 KPI 工作表数据。"""

    kpis: list[KPIRow] = Field(..., description="KPI 指标列表")
    roi: list[ROIRow] = Field(..., description="ROI 分析列表")
    roi_chart: list[ROIChartPoint] = Field(
        ..., description="ROI 图表数据（预算 vs 营收对比）"
    )
    radar_chart: list[RadarScore] = Field(
        ..., description="雷达图维度评分"
    )


# ── 顶层模型 ────────────────────────────────────────────────


class BrandInfo(BaseModel):
    """品牌/方案基本信息。"""

    brand_name: str = Field(..., description="品牌名称")
    subtitle: str = Field(..., description="副标题，包含版本信息和执行周期")
    duration_months: int = Field(..., description="执行周期（月）")
    version_a_name: str = Field(..., description="A版本名称，如'完整版'/'汇总版'")
    version_a_budget: float = Field(
        ..., description="A版本总预算（万元）"
    )
    version_b_name: str | None = Field(
        None,
        description="B版本名称，如'上海版'，单版本时为 None",
    )
    version_b_budget: float | None = Field(
        None, description="B版本总预算（万元），单版本时为 None"
    )


class XlsxData(BaseModel):
    """全部工作表数据聚合模型。

    LLM 用 with_structured_output 输出此模型，
    generate_plan_xlsx tool 直接消费。
    """

    brand_info: BrandInfo = Field(..., description="品牌/方案基本信息")
    budget_overview: BudgetOverviewSheet = Field(
        ..., description="Sheet 1: 预算总览对比"
    )
    budget_detail: BudgetDetailSheet = Field(
        ..., description="Sheet 2: 预算明细"
    )
    timeline: TimelineSheet = Field(
        ..., description="Sheet 3: 活动流程时间线"
    )
    kpi: KPISheet = Field(..., description="Sheet 4: 预期效果KPI")
