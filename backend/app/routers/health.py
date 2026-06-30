from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """服务健康检查端点。"""
    return {"status": "ok"}
