"""Data query schemas.

Corresponding OpenSpec: docs/api/paths/intent.yaml
Corresponding in_scope ID: data-query
"""

from pydantic import BaseModel, Field


class DataQueryOutput(BaseModel):
    """数据查询 Agent 的结构化输出"""

    city: str = Field(..., description="查询目标城市")
    summary: dict = Field(default_factory=dict, description="按维度聚合的数据摘要")
    data: dict = Field(default_factory=dict, description="原始 mock 数据片段")
    reply: str = Field(..., description="用户可读的数据摘要文案")
    available_cities: list[str] = Field(
        default_factory=list, description="当城市不存在时返回的支持列表"
    )
