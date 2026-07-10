"""方案摘要提炼 schema。

Corresponding OpenSpec: openspec/changes/plan-summary-endpoint
Corresponding in_scope ID: plan-generation
"""

from pydantic import BaseModel, Field


class PlanSummaryRequest(BaseModel):
    """方案摘要请求。"""

    run_id: str = Field(..., description="运行实例 ID")


class KpiItem(BaseModel):
    """KPI 条目。"""

    name: str = Field(default="", description="KPI 名称，如'曝光量'")
    target: str = Field(default="", description="KPI 目标值，如'≥1亿'")
    unit: str = Field(default="", description="单位，如'次'/'人'/'万元'")


class AllocationItem(BaseModel):
    """预算分配条目。"""

    category: str = Field(default="", description="费用类别，如'达人合作'")
    percentage: float = Field(default=0, description="占比 0-100")
    amount: int = Field(default=0, description="金额（万元）")


class ExecutionItem(BaseModel):
    """执行规划条目。"""

    label: str = Field(default="", description="执行维度，如'赛事'/'达人'")
    description: str = Field(default="", description="执行描述摘要")


class ActionItem(BaseModel):
    """行动建议条目。"""

    title: str = Field(default="", description="行动标题")
    description: str = Field(default="", description="行动描述")


class StrategyCard(BaseModel):
    """策略定位卡片。"""

    positioning: str = Field(default="", description="核心定位")
    key_messages: list[str] = Field(default_factory=list, description="核心传播信息")


class PlanSummary(BaseModel):
    """方案摘要（LLM 结构化提炼输出）。"""

    strategy: StrategyCard = Field(default_factory=StrategyCard, description="策略定位")
    kpis: list[KpiItem] = Field(default_factory=list, description="KPI 列表")
    allocations: list[AllocationItem] = Field(default_factory=list, description="预算分配")
    execution: list[ExecutionItem] = Field(default_factory=list, description="执行规划摘要")
    actions: list[ActionItem] = Field(default_factory=list, description="行动建议")
