"""Workflow orchestration HTTP router.

Corresponding OpenSpec: docs/api/workflows.yaml
"""

from fastapi import APIRouter, HTTPException, status

from app.schemas.common import APIError
from app.schemas.workflow import (
    WorkflowDefinition,
    WorkflowListResponse,
    WorkflowRunRequest,
    WorkflowRunResponse,
)
from app.services import workflow_service

router = APIRouter(tags=["workflows"])


@router.get("/workflows", response_model=WorkflowListResponse)
async def workflows_list():
    """列出已注册工作流。"""
    try:
        return workflow_service.list_workflows()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIError(detail=str(exc), code="workflow_list_error").model_dump(),
        ) from exc


@router.get("/workflows/{workflow_id}", response_model=WorkflowDefinition)
async def workflows_get(workflow_id: str):
    """获取工作流定义。"""
    try:
        return workflow_service.get_workflow(workflow_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIError(detail=str(exc), code="not_found").model_dump(),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIError(detail=str(exc), code="workflow_get_error").model_dump(),
        ) from exc


@router.post("/workflows/{workflow_id}/run", response_model=WorkflowRunResponse)
async def workflows_run(workflow_id: str, request: WorkflowRunRequest):
    """运行指定工作流。"""
    try:
        result = await workflow_service.run_workflow(workflow_id, request.input)
        return WorkflowRunResponse.model_validate(result)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIError(detail=str(exc), code="not_found").model_dump(),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=APIError(detail=str(exc), code="workflow_validation_error").model_dump(),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIError(detail=str(exc), code="workflow_run_error").model_dump(),
        ) from exc
