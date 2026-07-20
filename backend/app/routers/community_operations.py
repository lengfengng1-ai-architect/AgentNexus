"""Community operations HTTP router.

Corresponding OpenSpec: openspec/changes/community-operations
Corresponding in_scope ID: community-operations
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.schemas.common import APIError
from app.schemas.community_operations import CommunityOperationsRequest
from app.services import community_operations_service

router = APIRouter(tags=["community-operations"])


@router.post("/community-operations/stream")
async def community_operations_stream(request: CommunityOperationsRequest):
    """SSE 流式推送社群运营规划进度和结果。"""
    try:
        return StreamingResponse(
            community_operations_service.analyze_stream(
                category=request.category,
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
            detail=APIError(detail=str(exc), code="community_stream_error", errors=None).model_dump(),
        )


@router.get("/community-operations/results/{co_id}")
def community_operations_result_get(co_id: str):
    """按 community_operations_id 拉取已持久化的社群运营规划结果。"""
    try:
        result = community_operations_service.get_community_result(co_id)
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=APIError(detail="社群运营结果不存在或已过期", code="result_not_found", errors=None).model_dump(),
            )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIError(detail=str(exc), code="result_read_error", errors=None).model_dump(),
        )
