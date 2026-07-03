from typing import Any

from pydantic import BaseModel, Field


class ErrorCode:
    """Centralized error code constants. Use instead of raw strings."""
    LLM_ERROR = "llm_error"
    ANALYSIS_ERROR = "analysis_error"
    ANALYSIS_STREAM_ERROR = "analysis_stream_error"
    NOT_FOUND = "not_found"
    WORKFLOW_VALIDATION_ERROR = "workflow_validation_error"
    WORKFLOW_RUN_ERROR = "workflow_run_error"
    WORKFLOW_LIST_ERROR = "workflow_list_error"
    WORKFLOW_GET_ERROR = "workflow_get_error"
    WORKFLOW_CONTROL_ERROR = "workflow_control_error"
    WORKFLOW_STATUS_ERROR = "workflow_status_error"
    BAD_REQUEST = "bad_request"
    VALIDATION_ERROR = "validation_error"
    INTERNAL_ERROR = "internal_error"


class APIError(BaseModel):
    detail: str = Field(..., description="人类可读的错误描述")
    code: str = Field(..., description="错误码")
    errors: list[dict] | None = Field(None, description="字段级错误列表")


class APIResponse(BaseModel):
    """Standard API response envelope for all non-streaming endpoints."""
    success: bool = Field(default=True, description="请求是否成功")
    data: Any = Field(default=None, description="成功时的数据负载")
    error: APIError | None = Field(default=None, description="失败时的错误信息")
    meta: dict[str, Any] | None = Field(default=None, description="分页等元数据")
