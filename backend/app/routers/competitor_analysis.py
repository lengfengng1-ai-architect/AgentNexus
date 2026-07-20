"""Competitor analysis HTTP router.

Corresponding OpenSpec: openspec/changes/competitor-analysis
Corresponding in_scope ID: competitor-analysis
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.schemas.common import APIError
from app.schemas.competitor_analysis import CompetitorAnalysisRequest
from app.services import competitor_analysis_service

router = APIRouter(tags=["competitor-analysis"])


@router.post("/competitor-analysis/stream")
async def competitor_analysis_stream(request: CompetitorAnalysisRequest):
    """SSE 流式推送竞品分析进度和结果。"""
    try:
        return StreamingResponse(
            competitor_analysis_service.analyze_stream(
                category=request.category,
                brand_name=request.brand_name,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIError(detail=str(exc), code="competitor_stream_error", errors=None).model_dump(),
        )


@router.get("/competitor-analysis/results/{ca_id}")
def competitor_analysis_result_get(ca_id: str):
    """按 competitor_analysis_id 拉取已持久化的竞品分析结果。"""
    try:
        result = competitor_analysis_service.get_competitor_result(ca_id)
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=APIError(detail="竞品分析结果不存在或已过期", code="result_not_found", errors=None).model_dump(),
            )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIError(detail=str(exc), code="result_read_error", errors=None).model_dump(),
        )
