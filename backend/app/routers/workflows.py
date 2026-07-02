"""Workflow orchestration HTTP router.

Corresponding OpenSpec: docs/api/paths/workflows.yaml
"""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse

from app.schemas.common import APIError
from app.schemas.workflow import (
    WorkflowDefinition,
    WorkflowListResponse,
    WorkflowRunControlRequest,
    WorkflowRunControlResponse,
    WorkflowRunRequest,
    WorkflowRunResponse,
    WorkflowRunStatusResponse,
)
from app.services import workflow_service

router = APIRouter(tags=["workflows"])


def _error_response(detail: str, code: str, status_code: int) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail=APIError(detail=detail, code=code).model_dump(),
    )


@router.get("/workflows", response_model=WorkflowListResponse)
async def workflows_list():
    """列出已注册工作流。"""
    try:
        return workflow_service.list_workflows()
    except Exception as exc:
        raise _error_response(str(exc), "workflow_list_error", status.HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/workflows/{workflow_id}", response_model=WorkflowDefinition)
async def workflows_get(workflow_id: str):
    """获取工作流定义。"""
    try:
        return workflow_service.get_workflow(workflow_id)
    except KeyError as exc:
        raise _error_response(str(exc), "not_found", status.HTTP_404_NOT_FOUND) from exc
    except Exception as exc:
        raise _error_response(str(exc), "workflow_get_error", status.HTTP_500_INTERNAL_SERVER_ERROR) from exc


async def _event_stream(run_id: str, stream):
    """Yield SSE formatted events from a workflow run stream."""
    async for event in stream:
        event_id = event.get("id", "")
        event_name = event.get("event", "message")
        data = event.get("data", "")
        yield f"id: {event_id}\nevent: {event_name}\ndata: {data}\n\n"


@router.post("/workflows/{workflow_id}/run")
async def workflows_run(
    workflow_id: str,
    request: Request,
    request_body: WorkflowRunRequest,
    stream: Annotated[bool, Query(description="是否以 SSE 流式返回")] = False,
):
    """运行指定工作流，同步返回或 SSE 流式返回。"""
    if not stream:
        try:
            result = await workflow_service.run_workflow(workflow_id, request_body.input)
            return WorkflowRunResponse.model_validate(result)
        except KeyError as exc:
            raise _error_response(str(exc), "not_found", status.HTTP_404_NOT_FOUND) from exc
        except ValueError as exc:
            raise _error_response(str(exc), "workflow_validation_error", status.HTTP_400_BAD_REQUEST) from exc
        except Exception as exc:
            raise _error_response(str(exc), "workflow_run_error", status.HTTP_500_INTERNAL_SERVER_ERROR) from exc

    try:
        run_id, stream_iter = await workflow_service.create_run(workflow_id, request_body.input)
    except KeyError as exc:
        raise _error_response(str(exc), "not_found", status.HTTP_404_NOT_FOUND) from exc
    except ValueError as exc:
        raise _error_response(str(exc), "workflow_validation_error", status.HTTP_400_BAD_REQUEST) from exc
    except Exception as exc:
        raise _error_response(str(exc), "workflow_run_error", status.HTTP_500_INTERNAL_SERVER_ERROR) from exc

    # Support reconnect via Last-Event-ID header.
    last_event_id_header = request.headers.get("last-event-id")
    if last_event_id_header is not None:
        try:
            last_event_id = int(last_event_id_header)
            stream_iter = await workflow_service.resume_run(run_id, last_event_id)
        except (KeyError, ValueError):
            pass

    return StreamingResponse(
        _event_stream(run_id, stream_iter),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/workflows/runs/{run_id}/control", response_model=WorkflowRunControlResponse)
async def workflows_run_control(run_id: str, request: WorkflowRunControlRequest):
    """对运行中的工作流执行控制操作。"""
    try:
        result = workflow_service.control_run(run_id, request.action, request.node_id)
        return WorkflowRunControlResponse.model_validate(result)
    except KeyError as exc:
        raise _error_response(str(exc), "not_found", status.HTTP_404_NOT_FOUND) from exc
    except ValueError as exc:
        raise _error_response(str(exc), "bad_request", status.HTTP_400_BAD_REQUEST) from exc
    except Exception as exc:
        raise _error_response(str(exc), "workflow_control_error", status.HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/workflows/runs/{run_id}/status", response_model=WorkflowRunStatusResponse)
async def workflows_run_status(run_id: str):
    """查询工作流运行状态。"""
    try:
        result = workflow_service.get_run_status(run_id)
        return WorkflowRunStatusResponse.model_validate(result)
    except KeyError as exc:
        raise _error_response(str(exc), "not_found", status.HTTP_404_NOT_FOUND) from exc
    except Exception as exc:
        raise _error_response(str(exc), "workflow_status_error", status.HTTP_500_INTERNAL_SERVER_ERROR) from exc
