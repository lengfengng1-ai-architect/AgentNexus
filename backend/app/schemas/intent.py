"""Intent recognition schemas.

Corresponding OpenSpec: docs/api/paths/intent.yaml
Corresponding in_scope ID: workflow-orchestration
"""

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.chat import BrandInput


class IntentRecognitionOutput(BaseModel):
    """意图识别节点的结构化输出"""

    intent: str = Field(
        ...,
        description="用户意图",
        pattern="^(generate_plan|query_data|chat|clarify|update_context)$",
    )
    confidence: float = Field(..., ge=0.0, le=1.0, description="意图置信度")
    reply: str = Field(..., description="给用户的直接回复文案")
    brand_input: BrandInput = Field(
        default_factory=BrandInput, description="提取或更新后的品牌需求字段"
    )
    missing_fields: list[str] = Field(
        default_factory=list, description="缺失字段列表，用于 clarify 意图"
    )
    updated_fields: dict[str, Any] = Field(
        default_factory=dict, description="update_context 时更新的字段"
    )


class IntentRecognitionRequest(BaseModel):
    """意图识别节点的输入"""

    message: str = Field(..., min_length=1, description="用户输入消息")
    context: dict[str, Any] = Field(
        default_factory=dict, description="当前对话上下文，如已确认的 brand_input"
    )
