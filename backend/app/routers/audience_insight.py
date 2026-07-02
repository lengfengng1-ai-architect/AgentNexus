from collections.abc import AsyncGenerator

from fastapi import APIRouter, HTTPException, status
from sse_starlette.sse import EventSourceResponse

from app.schemas.audience_insight import (
    AudienceInsightRequest,
    AudienceInsightResponse,
)
from app.schemas.common import APIError
from app.services.audience_insight_service import (
    get_audience_insight,
    stream_audience_insight,
)

router = APIRouter(tags=["audience-insight"])


@router.post("/audience-insight", response_model=AudienceInsightResponse)
async def audience_insight_endpoint(request: AudienceInsightRequest):
    """接收产品名称，返回人群洞察数据和用户画像。"""
    try:
        return await get_audience_insight(request.product_name)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIError(detail=str(exc), code="llm_error").model_dump(),
        )


@router.post("/audience-insight/stream")
async def audience_insight_stream_endpoint(request: AudienceInsightRequest):
    """接收产品名称，SSE 流式返回调研进度和结果。"""
    return EventSourceResponse(stream_audience_insight_r(request.product_name))


async def stream_audience_insight_r(product_name: str) -> AsyncGenerator[str, None]:
    try:
        async for event in stream_audience_insight(product_name):
            yield event
    except Exception as exc:
        yield f"event: error\ndata: {str(exc)}\n\n"
