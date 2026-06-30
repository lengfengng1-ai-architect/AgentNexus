from pydantic import BaseModel, Field


class APIError(BaseModel):
    detail: str = Field(..., description="人类可读的错误描述")
    code: str = Field(..., description="错误码")
    errors: list[dict] | None = Field(None, description="字段级错误列表")
