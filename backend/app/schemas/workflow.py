"""Workflow orchestration schemas.

Corresponding OpenSpec: docs/api/workflows.yaml
"""

from pydantic import BaseModel, ConfigDict, Field


class WorkflowRunRequest(BaseModel):
    """工作流运行请求"""

    input: dict = Field(..., description="工作流初始输入，会写入 state.input")


class WorkflowSummary(BaseModel):
    """工作流摘要"""

    id: str = Field(..., description="工作流唯一标识")
    name: str = Field(..., description="工作流中文名称")
    version: str = Field(..., description="工作流版本号")


class WorkflowListResponse(BaseModel):
    """工作流列表响应"""

    items: list[WorkflowSummary] = Field(..., description="工作流摘要列表")


class WorkflowNode(BaseModel):
    """工作流节点定义"""

    id: str = Field(..., description="节点唯一标识")
    agent: str = Field(..., description="节点使用的已注册 Agent 名称")
    depends_on: list[str] | None = Field(None, description="前置节点 ID 列表")
    input_mapping: dict[str, str] | None = Field(None, description="输入映射，JSONPath 风格")
    output_mapping: dict[str, str] | None = Field(None, description="输出映射，JSONPath 风格")


class WorkflowEdge(BaseModel):
    """工作流边定义"""

    model_config = ConfigDict(populate_by_name=True)

    from_: str = Field(..., alias="from", description="起始节点 ID")
    to: str = Field(..., description="目标节点 ID，__end__ 表示结束")


class WorkflowDefinition(BaseModel):
    """工作流完整定义"""

    id: str = Field(..., description="工作流唯一标识")
    name: str = Field(..., description="工作流中文名称")
    version: str = Field(..., description="工作流版本号")
    nodes: list[WorkflowNode] = Field(..., description="工作流节点列表")
    edges: list[WorkflowEdge] = Field(..., description="工作流边列表")


class WorkflowRunResponse(BaseModel):
    """工作流运行响应"""

    workflow_id: str = Field(..., description="工作流唯一标识")
    status: str = Field(..., description="执行状态", pattern="^(completed|failed)$")
    outputs: dict = Field(..., description="各节点输出字典，key 为节点 ID")
