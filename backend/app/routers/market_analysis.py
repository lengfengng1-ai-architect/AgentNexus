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
            detail=APIError(detail=str(exc), code="analysis_error", errors=None).model_dump(),
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
            detail=APIError(detail=str(exc), code="analysis_stream_error", errors=None).model_dump(),
        )


@router.get("/market-analysis/results/{research_id}")
def market_analysis_result_get(research_id: str):
    """按 research_id 拉取已持久化的调研结果（供移动端结果页刷新后重新获取）。

    同步 def（非 async）：内部是文件 IO，FastAPI 会放进线程池执行，不阻塞事件循环。
    """
    try:
        result = market_analysis_service.get_research_result(research_id)
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=APIError(detail="调研结果不存在或已过期", code="result_not_found", errors=None).model_dump(),
            )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIError(detail=str(exc), code="result_read_error", errors=None).model_dump(),
        )
