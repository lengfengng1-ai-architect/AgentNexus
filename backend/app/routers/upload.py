import asyncio
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.config.settings import settings
from app.schemas.upload import UploadFileItem, UploadResponse
from app.services.image_caption import generate_caption

logger = logging.getLogger(__name__)

router = APIRouter(tags=["upload"])

UPLOAD_DIR = Path(settings.upload_dir)


@router.post(
    "/upload",
    summary="上传文件",
    description="接受 multipart/form-data 文件上传，保存到本地 uploads/ 目录，返回本地可访问的 URL。本地图片用于消息气泡展示，并在以图生图/图生视频时由后端读取转为 Base64 内联传给模型。",
    response_model=UploadResponse,
    responses={
        400: {"description": "未检测到上传文件"},
        422: {"description": "文件超过大小限制"},
        500: {"description": "文件保存失败"},
    },
)
async def upload_files(files: list[UploadFile] = File(..., description="上传的文件列表（支持多个）")) -> UploadResponse:
    if not files:
        raise HTTPException(status_code=400, detail="未检测到上传文件")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    result: list[UploadFileItem] = []
    caption_tasks: list[tuple[int, asyncio.Task[str | None]]] = []

    for f in files:
        content = await f.read()

        if len(content) > settings.max_upload_size:
            raise HTTPException(
                status_code=422,
                detail=f"文件 {f.filename} 超过大小限制（{settings.max_upload_size // 1024 // 1024}MB）",
            )

        # 用 uuid 前缀防止重名冲突
        ext = Path(f.filename or "file").suffix
        safe_name = f"{uuid.uuid4().hex}{ext}"
        dest = UPLOAD_DIR / safe_name

        dest.write_bytes(content)

        mime = f.content_type or "application/octet-stream"
        result.append(
            UploadFileItem(
                name=f.filename or safe_name,
                url=f"/uploads/{safe_name}",
                size=len(content),
                mimeType=mime,
            )
        )
        # 图片文件并发生成 caption（失败降级 null，不阻塞上传）
        if mime.startswith("image/"):
            caption_tasks.append((len(result) - 1, asyncio.create_task(generate_caption(dest))))

    for idx, task in caption_tasks:
        # 兜底：caption 任务出现任何未预期异常都不阻塞上传响应
        try:
            result[idx].caption = await task
        except Exception:
            logger.warning("caption 任务异常，降级为 null: %s", result[idx].name, exc_info=True)
            result[idx].caption = None

    return UploadResponse(files=result)
