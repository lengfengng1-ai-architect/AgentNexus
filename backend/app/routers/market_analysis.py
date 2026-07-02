"""Market analysis HTTP router.

Corresponding OpenSpec: docs/api/paths/market-analysis.yaml
Corresponding in_scope ID: market-analysis
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.schemas.common import APIError
from app.schemas.market_analysis import MarketAnalysisRequest, MarketAnalysisResponse
from app.services import market_analysis_service

router = APIRouter(tags=["market-analysis"])


@router.post("/market-analysis", response_model=MarketAnalysisResponse)
async def market_analysis_create(request: MarketAnalysisRequest):
    """同步返回市场分析报告。"""
    try:
        return await market_analysis_service.analyze(
            market_name=request.market_name,
            category=request.category,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIError(detail=str(exc), code="analysis_error").model_dump(),
        )


@router.post("/market-analysis/stream")
async def market_analysis_stream(request: MarketAnalysisRequest):
    """SSE 流式推送市场分析进度和结果。"""
    try:
        return StreamingResponse(
            market_analysis_service.analyze_stream(
                market_name=request.market_name,
                category=request.category,
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
            detail=APIError(detail=str(exc), code="analysis_stream_error").model_dump(),
        )
