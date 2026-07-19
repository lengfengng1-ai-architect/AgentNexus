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
        pattern="^(generate_plan|query_data|chat|clarify|update_context|generate_video|text_to_video|text_to_image|market_research|budget_assessment|activity_planning|alliance_planning)$",
    )
    confidence: float = Field(..., ge=0.0, le=1.0, description="意图置信度")
    reply: str = Field(..., description="给用户的直接回复文案")
    market_name: str | None = Field(
        default=None,
        description="市场调研的研究目标（品牌名/赛道名），仅在 market_research 意图时使用",
    )
    sport_type: str | None = Field(
        default=None,
        description="活动规划的运动类型（如羽毛球/跑步/瑜伽），仅在 activity_planning 意图时使用，LLM 从用户输入提取",
    )
    brand_input: BrandInput = Field(
        default_factory=BrandInput, description="提取或更新后的品牌需求字段"  # type: ignore[arg-type]
    )
    missing_fields: list[str] = Field(
        default_factory=list, description="缺失字段列表，用于 clarify / generate_video 反问"
    )
    updated_fields: dict[str, Any] = Field(
        default_factory=dict, description="update_context 时更新的字段"
    )
    reasoning: str = Field(
        default="", description="模型思考过程，用于聊天框展示"
    )
    confirmed: bool = Field(
        default=False, description="用户是否已确认该操作"
    )
    gate: str | None = Field(
        default=None, description="需要确认的门类型，如 'generate_plan'"
    )
    image_url: str | None = Field(
        default=None,
        description="图生视频的图片 URL，从附件元数据传递",
    )
    video_prompt: str | None = Field(
        default=None,
        description="视频内容的文字描述（可选），从用户输入提取",
    )
    generation_prompt: str | None = Field(
        default=None,
        description="用户输入的生成描述，对 text_to_video / text_to_image 从用户消息中提取",
    )


class IntentRecognitionRequest(BaseModel):
    """意图识别节点的输入"""

    message: str = Field(..., min_length=1, description="用户输入消息")
    context: dict[str, Any] = Field(
        default_factory=dict, description="当前对话上下文，如已确认的 brand_input"
    )
