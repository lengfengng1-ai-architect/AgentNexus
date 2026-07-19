import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from fastapi.staticfiles import StaticFiles

from app.config.settings import settings
from app.routers import (
    activity_planning,
    alliance_planning,
    audience_insight,
    budget_analysis,
    chat,
    health,
    image_generation,
    market_analysis,
    plan,
    product_info,
    prompt_optimizer,
    upload,
    video,
)
from app.schemas.common import APIError, APIResponse, ErrorCode

logger = logging.getLogger(__name__)


def _configure_logging() -> None:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    fmt = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    # 控制台输出
    root = logging.getLogger()
    root.setLevel(level)
    if not root.handlers:
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(fmt)
        root.addHandler(stream_handler)

    # 文件落盘：logs/app.log，单文件 5MB，保留 5 份轮转
    log_dir = Path(settings.log_file).parent
    log_dir.mkdir(parents=True, exist_ok=True)
    file_handler = RotatingFileHandler(
        settings.log_file, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8",
    )
    file_handler.setFormatter(fmt)
    root.addHandler(file_handler)

    # 压制第三方库的 DEBUG 噪音，让 app 自身日志可读
    for noisy in ("aiosqlite", "httpx", "httpcore", "openai", "urllib3", "watchfiles.main"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def create_app() -> FastAPI:
    _configure_logging()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
    )

    origins = ["*"]
    if settings.cors_origins:
        origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Run-Id"],
    )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content=APIResponse(
                success=False,
                error=APIError(detail=str(exc), code=ErrorCode.INTERNAL_ERROR, errors=None),
            ).model_dump(),
        )

    app.include_router(health.router, prefix="/api/v1")
    app.include_router(chat.router, prefix="/api/v1")
    app.include_router(image_generation.router, prefix="/api/v1")
    app.include_router(market_analysis.router, prefix="/api/v1")
    app.include_router(budget_analysis.router, prefix="/api/v1")
    app.include_router(activity_planning.router, prefix="/api/v1")
    app.include_router(alliance_planning.router, prefix="/api/v1")
    app.include_router(plan.router, prefix="/api/v1")
    app.include_router(product_info.router, prefix="/api/v1")
    app.include_router(audience_insight.router, prefix="/api/v1")
    app.include_router(video.router, prefix="/api/v1")
    app.include_router(upload.router, prefix="/api/v1")
    app.include_router(prompt_optimizer.router, prefix="/api/v1")

    # 挂载上传文件目录为静态资源
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

    # 挂载生成的 XLSX 文件目录
    xlsx_dir = Path("generated_xlsx")
    xlsx_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/xlsx", StaticFiles(directory=str(xlsx_dir)), name="xlsx")

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug, reload_excludes=["*.log", "logs/*"])
