"""Data query schemas.

Corresponding OpenSpec: docs/api/paths/intent.yaml
Corresponding in_scope ID: data-query
"""

from pydantic import BaseModel, Field


class DataQueryOutput(BaseModel):
    """数据查询 Agent 的结构化输出"""

    city: str = Field(..., description="查询目标城市")
    summary: dict = Field(default_factory=dict, description="按维度聚合的数据摘要，含 priority 标记")
    data: dict = Field(default_factory=dict, description="原始 mock 数据片段或实体级 records")
    reply: str = Field(..., description="用户可读的数据摘要文案")
    available_cities: list[str] = Field(
        default_factory=list, description="当城市不存在时返回的支持列表"
    )
    dimension_priorities: dict = Field(
        default_factory=dict,
        description="各维度的优先级标记，如 {盟域: high, 达人: high, 经营社: medium}",
    )
