"""Activity planning HTTP router.

Corresponding OpenSpec: docs/api/paths/activity-planning.yaml
Corresponding in_scope ID: activity-planning
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.schemas.activity_planning import ActivityPlanningRequest
from app.schemas.common import APIError
from app.services import activity_planning_service

router = APIRouter(tags=["activity-planning"])


@router.post("/activity-planning/stream")
async def activity_planning_stream(request: ActivityPlanningRequest):
    """SSE 流式推送活动规划进度和结果。"""
    try:
        return StreamingResponse(
            activity_planning_service.analyze_stream(
                sport_type=request.sport_type,
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
            detail=APIError(detail=str(exc), code="activity_stream_error", errors=None).model_dump(),
        )


@router.get("/activity-planning/results/{activity_id}")
def activity_planning_result_get(activity_id: str):
    """按 activity_planning_id 拉取已持久化的活动规划结果（sync def，文件 IO 进线程池）。"""
    try:
        result = activity_planning_service.get_activity_result(activity_id)
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=APIError(detail="活动规划结果不存在或已过期", code="result_not_found", errors=None).model_dump(),
            )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIError(detail=str(exc), code="result_read_error", errors=None).model_dump(),
        )
