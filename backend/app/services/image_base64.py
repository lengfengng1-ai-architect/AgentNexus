"""图片转 Base64 data URI 工具。

用于以图生图 / 图生视频：读取本地上传的图片并编码为
`data:{mime};base64,{data}` 内联形式，随请求体直接发送给模型，
模型端无需公网下载，避免依赖第三方图床。

Corresponding OpenSpec: openspec/changes/remove-litterbox-base64-images
Corresponding in_scope ID: inline-image-gen / inline-video-gen
"""

from __future__ import annotations

import base64
import logging
from pathlib import Path

from app.config.settings import settings

logger = logging.getLogger(__name__)

_EXT_TO_MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".gif": "image/gif",
}

# 模型对单图的大小限制（取较严的 qwen-image 10MB 作为默认上限）
_MAX_IMAGE_BYTES = 10 * 1024 * 1024


def _extract_local_name(image_ref: str) -> str | None:
    """从图片引用中解析本地上传文件名。

    支持两种形态：
      - /uploads/xxx.png
      - http(s)://host/uploads/xxx.png
    非本服务 uploads 路径返回 None。
    """
    ref = image_ref.strip()
    # 完整 URL 形态：剥掉 scheme://host 前缀
    if ref.startswith("http://") or ref.startswith("https://"):
        idx = ref.find("/uploads/")
        if idx == -1:
            return None
        ref = ref[idx:]
    if ref.startswith("/uploads/"):
        return ref[len("/uploads/"):]
    return None


def to_data_uri(image_ref: str, *, max_bytes: int = _MAX_IMAGE_BYTES) -> str:
    """将本地图片引用转为 Base64 data URI；非本地 URL 原样透传。

    Args:
        image_ref: 本地 `/uploads/xxx` 路径、完整 `http(s)://host/uploads/xxx`，
                   或已是 data: URI / 外部 http(s) URL。
        max_bytes: 允许的最大图片字节数，超出抛 ValueError。

    Returns:
        str: `data:{mime};base64,{data}`，或非本地引用原样返回。

    Raises:
        ValueError: 路径非法（穿越 uploads 目录）、文件不存在、或超出大小限制。
    """
    ref = image_ref.strip()
    # 已是 data URI 直接返回
    if ref.startswith("data:"):
        return ref

    local_name = _extract_local_name(ref)
    if local_name is None:
        # ponytail: 非本服务 uploads 的外部 URL 原样透传，保持向后兼容。
        # 实际上游链路不会再产生外部 URL；历史消息中的旧链接无法转 Base64。
        return ref

    # 防路径穿越：解析后的绝对路径必须仍位于 uploads 目录内
    base = Path(settings.upload_dir).resolve()
    path = (base / local_name).resolve()
    if not path.is_relative_to(base):
        logger.warning("拒绝非法参考图路径（疑似路径穿越）: %r", local_name)
        raise ValueError("非法的参考图路径")

    try:
        data = path.read_bytes()
    except (FileNotFoundError, OSError) as exc:
        raise ValueError(f"参考图不存在或不可读: {local_name}") from exc

    if len(data) > max_bytes:
        raise ValueError(
            f"参考图 {local_name} 超过大小限制（{max_bytes // 1024 // 1024}MB），请压缩后重试"
        )

    mime = _EXT_TO_MIME.get(path.suffix.lower(), "image/png")
    encoded = base64.b64encode(data).decode("ascii")
    logger.debug("参考图转 Base64: %s (%d bytes, %s)", local_name, len(data), mime)
    return f"data:{mime};base64,{encoded}"
