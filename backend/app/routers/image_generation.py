"""图片生成 HTTP 路由。

对应 OpenSpec: openspec/changes/image-test-page/
"""

import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.agents.image_generation_agent import run_image_generation
from app.schemas.common import APIError, APIResponse, ErrorCode

router = APIRouter(tags=["image"])
logger = logging.getLogger(__name__)


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(..., description="文生图正向提示词")
    size: str = Field(default="2048*2048", description="分辨率，如 2048*2048、2688*1536")


class ImageGenerateData(BaseModel):
    image_url: str = Field(..., description="图片 URL（24 小时有效）")
    width: int = Field(default=0, description="图片宽度")
    height: int = Field(default=0, description="图片高度")


@router.post("/image/generate")
async def image_generate(body: ImageGenerateRequest) -> APIResponse:
    """直通 Qwen-Image API 生成图片。"""
    try:
        result = await run_image_generation({
            "plan_content": body.prompt,
            "image_type": "main_visual",
            "size": body.size,
            "negative_prompt": "",
        })

        image_url = result.get("image_url", "")
        if not image_url:
            return APIResponse(
                success=False,
                error=APIError(detail="图片生成返回了空 URL", code=ErrorCode.BAD_REQUEST, errors=None),
            )

        return APIResponse(data=ImageGenerateData(
            image_url=image_url,
            width=result.get("width", 0),
            height=result.get("height", 0),
        ).model_dump())
    except ValueError as e:
        return APIResponse(
            success=False,
            error=APIError(detail=str(e), code=ErrorCode.BAD_REQUEST, errors=None),
        )
    except Exception as e:
        logger.exception("image generation failed")
        return APIResponse(
            success=False,
            error=APIError(detail=str(e), code=ErrorCode.INTERNAL_ERROR, errors=None),
        )
