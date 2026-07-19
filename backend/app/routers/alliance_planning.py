"""Alliance planning HTTP router.

Corresponding OpenSpec: docs/api/paths/alliance-planning.yaml
Corresponding in_scope ID: alliance-planning
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.schemas.alliance_planning import AlliancePlanningRequest
from app.schemas.common import APIError
from app.services import alliance_planning_service

router = APIRouter(tags=["alliance-planning"])


@router.post("/alliance-planning/stream")
async def alliance_planning_stream(request: AlliancePlanningRequest):
    try:
        return StreamingResponse(
            alliance_planning_service.analyze_stream(category=request.category, city=request.city),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=APIError(detail=str(exc), code="alliance_stream_error", errors=None).model_dump())


@router.get("/alliance-planning/results/{alliance_id}")
def alliance_planning_result_get(alliance_id: str):
    try:
        result = alliance_planning_service.get_alliance_result(alliance_id)
        if result is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=APIError(detail="盟域规划结果不存在或已过期", code="result_not_found", errors=None).model_dump())
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=APIError(detail=str(exc), code="result_read_error", errors=None).model_dump())
