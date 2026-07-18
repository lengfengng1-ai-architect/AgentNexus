"""Budget analysis schemas.

Corresponding OpenSpec: docs/api/paths/budget-analysis.yaml
Corresponding in_scope ID: budget-analysis
"""

from pydantic import BaseModel, Field


class BudgetAssessmentRequest(BaseModel):
    """预算评估请求。"""

    category: str = Field(..., description="品类/产品，如运动鞋、饮料等")
    budget: int = Field(..., gt=0, description="预算（万元）")
    period: int = Field(..., gt=0, description="周期（月）")
    city: str = Field(..., description="目标城市")


class BudgetAllocation(BaseModel):
    """预算分配条目。"""

    category: str = Field(..., description="预算类别，如达人合作/内容制作/活动执行/平台投放/运营资源")
    amount: int = Field(..., description="金额（万元）")
    percentage: int = Field(..., description="占比（%，整数）")


class BudgetAssessmentResult(BaseModel):
    """预算评估结果。"""

    category: str = Field(..., description="品类")
    city: str = Field(..., description="城市")
    total_budget: int = Field(..., description="总预算（万元）")
    period_months: int = Field(..., description="周期（月）")
    allocations: list[BudgetAllocation] = Field(default_factory=list, description="5 类预算分配")
    kpis: dict[str, str] = Field(default_factory=dict, description="KPI 预估，如 {曝光量: 500万+}")
    timeline: list[str] = Field(default_factory=list, description="按月的时间线")
    suggestion: str = Field(..., description="一句话建议（LLM 基于 allocations 数据生成）")
