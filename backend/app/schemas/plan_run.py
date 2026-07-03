"""Plan run request/response schemas.

Corresponding OpenSpec: docs/api/paths/plan.yaml
Corresponding in_scope ID: plan-generation
"""

from pydantic import BaseModel, Field


class PlanRunRequest(BaseModel):
    """启动方案生成流水线请求。

    与旧版本不同，请求体不再包装在 `input` 字段内，直接使用 brand_input。
    """

    brand_input: dict = Field(..., description="品牌输入字段集合")


class ApproveRequest(BaseModel):
    """通过审核检查点请求。"""

    edited_input: dict | None = Field(
        None,
        description="编辑后的节点输入；为空则使用当前 checkpoint 中的输入",
    )


class RejectRequest(BaseModel):
    """驳回审核检查点请求。"""

    reason: str = Field(
        ...,
        description="驳回原因，注入到重跑上下文",
        min_length=1,
        max_length=500,
    )


class CancelResponse(BaseModel):
    """取消运行响应。"""

    run_id: str = Field(..., description="运行实例 ID")
    status: str = Field(..., description="运行状态", json_schema_extra={"enum": ["canceled"]})


class PausedSnapshot(BaseModel):
    """审核检查点的快照：即将执行节点的输入视图。"""

    node_id: str = Field(
        ...,
        description="即将执行的节点 ID",
        json_schema_extra={"enum": ["strategy_generation", "execution_planning", "plan_generator"]},
    )
    node_input: dict = Field(..., description="即将执行节点的输入 payload")
    upstream_outputs: dict = Field(
        default_factory=dict, description="已完成上游节点的输出"
    )


class RunStatus(BaseModel):
    """运行状态响应。"""

    run_id: str = Field(..., description="运行实例 ID")
    status: str = Field(
        ...,
        description="运行状态",
        json_schema_extra={"enum": ["running", "paused", "completed", "failed", "canceled"]},
    )
    current_node: str | None = Field(
        None, description="当前正在执行或即将执行的节点 ID"
    )
    outputs: dict = Field(default_factory=dict, description="已完成节点的输出")
    paused_snapshot: PausedSnapshot | None = Field(
        None, description="仅当 status=paused 时存在"
    )
    error: str | None = Field(None, description="失败时的错误消息")
