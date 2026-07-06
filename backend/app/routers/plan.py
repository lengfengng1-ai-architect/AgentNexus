"""Plan generation HTTP router.

Corresponding OpenSpec: docs/api/paths/plan.yaml
Corresponding in_scope ID: plan-generation
"""

import logging
import uuid

from fastapi import APIRouter, Path, Request
from fastapi.responses import JSONResponse, StreamingResponse

from app.schemas.common import APIError, APIResponse, ErrorCode
from app.schemas.plan_run import ApproveRequest, PlanRunRequest, RejectRequest
from app.services.plan_generation_service import (
    approve_run,
    delete_run,
    get_status,
    list_runs,
    reject_run,
    run_exists,
    start_run,
)

router = APIRouter(tags=["plan"])
logger = logging.getLogger(__name__)


def _sse_headers(run_id: str | None = None) -> dict[str, str]:
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Content-Type": "text/event-stream; charset=utf-8",
    }
    if run_id:
        headers["X-Run-Id"] = run_id
    return headers


def _error_response(status_code: int, detail: str, code: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=APIError(detail=detail, code=code, errors=None).model_dump(),
    )


async def _require_run(run_id: str) -> JSONResponse | None:
    """Return a 404 response if the run_id has no checkpoint; otherwise None."""
    if not await run_exists(run_id):
        return _error_response(
            404,
            f"Run {run_id} not found",
            ErrorCode.NOT_FOUND,
        )
    return None


@router.post("/plan/run")
async def plan_run(request: Request, body: PlanRunRequest):
    """方案生成，SSE 流式返回每节点进度和最终结果。"""
    run_id = body.brand_input.get("run_id") if isinstance(body.brand_input, dict) else None
    if run_id is not None and (not isinstance(run_id, str) or not run_id.strip()):
        return _error_response(
            400,
            "run_id must be a non-empty string",
            ErrorCode.BAD_REQUEST,
        )
    run_id = run_id or str(uuid.uuid4())

    async def event_stream():
        async for frame in start_run(body.brand_input, run_id=run_id):
            yield frame

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers=_sse_headers(run_id),
    )


@router.post("/plan/runs/{run_id}/approve")
async def plan_run_approve(
    run_id: str = Path(..., description="运行实例 ID"),
    body: ApproveRequest = ApproveRequest(),  # type: ignore[call-arg]
):
    """通过当前审核检查点并继续执行。"""
    if not_found := await _require_run(run_id):
        return not_found
    return StreamingResponse(
        approve_run(run_id, edited_input=body.edited_input),
        media_type="text/event-stream",
        headers=_sse_headers(run_id),
    )


@router.post("/plan/runs/{run_id}/reject")
async def plan_run_reject(
    run_id: str = Path(..., description="运行实例 ID"),
    body: RejectRequest = ...,  # type: ignore[assignment]
):
    """驳回当前审核检查点，重新执行当前节点。"""
    if not_found := await _require_run(run_id):
        return not_found
    return StreamingResponse(
        reject_run(run_id, reason=body.reason),
        media_type="text/event-stream",
        headers=_sse_headers(run_id),
    )


@router.post("/plan/runs/{run_id}/cancel")
async def plan_run_cancel(run_id: str = Path(..., description="运行实例 ID")):
    """取消运行并删除 checkpoint。"""
    if not_found := await _require_run(run_id):
        return not_found
    await delete_run(run_id)
    return APIResponse(
        success=True,
        data={"run_id": run_id, "status": "canceled"},
    )


@router.get("/plan/runs/{run_id}/status")
async def plan_run_status(run_id: str = Path(..., description="运行实例 ID")):
    """查询运行状态与暂停快照。"""
    if not_found := await _require_run(run_id):
        return not_found
    try:
        status = await get_status(run_id)
    except Exception as exc:
        logger.exception("failed to get status for run %s", run_id)
        return _error_response(
            500,
            f"Failed to get status: {exc}",
            ErrorCode.INTERNAL_ERROR,
        )
    return APIResponse(success=True, data=status)


@router.get("/plan/runs")
async def plan_list_runs(limit: int = 20):
    """列出最近方案生成批次记录，含创建时间和状态。"""
    try:
        records = await list_runs(limit=limit)
        return APIResponse(success=True, data=records)
    except Exception as exc:
        logger.exception("failed to list plan runs")
        return _error_response(
            500,
            f"Failed to list runs: {exc}",
            ErrorCode.WORKFLOW_LIST_ERROR,
        )
