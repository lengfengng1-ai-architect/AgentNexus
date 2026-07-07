"""Video generation SSE streaming endpoint.

调用 HappyHorse 文生视频模型（阿里云百炼），SSE 流式返回进度和最终结果。

Corresponding in_scope ID: video-generation
"""

import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agents.video_generation_agent import stream_video_generation

logger = logging.getLogger(__name__)

router = APIRouter(tags=["video"])


class VideoGenerateRequest(BaseModel):
    prompt: str = Field(..., description="文本提示词，用于描述期望生成的视频内容", max_length=2500)
    resolution: str = Field(default="720P", description="分辨率：720P / 1080P")
    ratio: str = Field(default="16:9", description="宽高比：16:9 / 9:16 / 1:1 / 4:3 / 3:4 / 4:5 / 5:4 / 9:21 / 21:9")
    duration: int = Field(default=5, ge=3, le=15, description="视频时长（秒），3-15")
    seed: int | None = Field(default=None, ge=0, le=2147483647, description="随机数种子（可选）")


@router.post("/video/generate")
async def video_generate(body: VideoGenerateRequest):
    """文生视频，SSE 流式返回任务进度和最终视频 URL。

    SSE events:
      - progress: 任务状态更新（task_created / polling / completed）
      - result:   生成完成，包含 video_url
      - error:    错误信息
    """

    async def event_stream():
        async for frame in stream_video_generation(
            body.prompt,
            resolution=body.resolution,
            ratio=body.ratio,
            duration=body.duration,
            seed=body.seed,
        ):
            yield frame

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
