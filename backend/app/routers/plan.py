"""Plan generation HTTP router.

Corresponding OpenSpec: docs/api/paths/intent.yaml
Corresponding in_scope ID: plan-generation
"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas.chat import BrandInput
from app.services.plan_generation_service import run_pipeline, run_stream

router = APIRouter(tags=["plan"])


@router.post("/plan/run")
async def plan_run(brand_input: BrandInput):
    """方案生成，SSE 流式返回每节点进度和最终结果。"""
    return StreamingResponse(
        run_stream(brand_input.model_dump()),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
