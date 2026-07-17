"""Prompt 优化 HTTP 路由。

预设场景：video（视频）、image（图片）、brand（品牌文案）
"""
import logging
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.schemas.common import APIError, APIResponse, ErrorCode
from app.services.prompt_optimizer import optimize_prompt

router = APIRouter(tags=["prompt"])
logger = logging.getLogger(__name__)


class PromptOptimizeRequest(BaseModel):
    prompt: str = Field(..., description="原始提示词", max_length=10000)
    type: Literal["video", "image", "brand"] = Field(..., description="优化场景类型")
    image_context: str | None = Field(
        default=None,
        description="参考图片内容描述（可选），优化结果须与其主体一致",
        max_length=500,
    )


class PromptOptimizeData(BaseModel):
    optimized: str = Field(..., description="优化后的提示词")
    reason: str = Field(default="", description="优化说明")


@router.post("/prompt/optimize")
async def prompt_optimize(body: PromptOptimizeRequest) -> APIResponse:
    """AI 优化提示词，支持视频/图片/品牌文案三种场景。"""
    try:
        result = await optimize_prompt(body.prompt, body.type, body.image_context)
        return APIResponse(data=PromptOptimizeData(
            optimized=result.optimized,
            reason=result.reason,
        ).model_dump())
    except ValueError as e:
        return APIResponse(
            success=False,
            error=APIError(detail=str(e), code=ErrorCode.BAD_REQUEST, errors=None),
        )
    except Exception as e:
        logger.exception("prompt optimize failed")
        return APIResponse(
            success=False,
            error=APIError(detail="提示词优化失败，请稍后重试", code=ErrorCode.INTERNAL_ERROR, errors=None),
        )
