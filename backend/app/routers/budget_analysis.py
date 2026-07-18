"""Budget analysis HTTP router.

Corresponding OpenSpec: docs/api/paths/budget-analysis.yaml
Corresponding in_scope ID: budget-analysis
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.schemas.budget_analysis import BudgetAssessmentRequest
from app.schemas.common import APIError
from app.services import budget_analysis_service

router = APIRouter(tags=["budget-analysis"])


@router.post("/budget-analysis/stream")
async def budget_analysis_stream(request: BudgetAssessmentRequest):
    """SSE 流式推送预算评估进度和结果。"""
    try:
        return StreamingResponse(
            budget_analysis_service.analyze_stream(
                category=request.category,
                budget=request.budget,
                period=request.period,
                city=request.city,
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
            detail=APIError(detail=str(exc), code="budget_stream_error", errors=None).model_dump(),
        )


@router.get("/budget-analysis/results/{budget_id}")
def budget_analysis_result_get(budget_id: str):
    """按 budget_assessment_id 拉取已持久化的预算评估结果。

    同步 def（非 async）：内部是文件 IO，FastAPI 会放进线程池执行，不阻塞事件循环。
    """
    try:
        result = budget_analysis_service.get_budget_result(budget_id)
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=APIError(detail="预算评估结果不存在或已过期", code="result_not_found", errors=None).model_dump(),
            )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIError(detail=str(exc), code="result_read_error", errors=None).model_dump(),
        )
