from collections.abc import AsyncGenerator

from fastapi import APIRouter, HTTPException, status
from sse_starlette.sse import EventSourceResponse

from app.schemas.common import APIError
from app.schemas.product_info import ProductInfoRequest, ProductInfoResponse
from app.services.product_info_service import get_product_info, stream_product_info

router = APIRouter(tags=["product-info"])


@router.post("/product-info", response_model=ProductInfoResponse)
async def product_info_endpoint(request: ProductInfoRequest):
    """接收产品名称，返回结构化的产品基础信息（非流式，等待完整结果）。"""
    try:
        return await get_product_info(request.product_name)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=APIError(detail=str(exc), code="llm_error", errors=None).model_dump(),
        )


@router.post("/product-info/stream")
async def product_info_stream_endpoint(request: ProductInfoRequest):
    """接收产品名称，SSE 流式返回调研进度和结果。"""
    return EventSourceResponse(stream_product_info_r(request.product_name))


async def stream_product_info_r(product_name: str) -> AsyncGenerator[str, None]:
    try:
        async for event in stream_product_info(product_name):
            yield event
    except Exception as exc:
        yield f"event: error\ndata: {str(exc)}\n\n"
