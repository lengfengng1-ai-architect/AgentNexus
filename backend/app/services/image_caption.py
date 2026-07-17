"""图片理解服务：调用视觉模型生成图片内容描述（caption）。

上传图片后同步生成 1-2 句中文客观描述，供意图识别预填、
卡片 AI 优化等纯文本 LLM 环节"读懂"图片内容。
失败/超时降级为 None，不阻塞主流程。

Corresponding OpenSpec: openspec/changes/image-understanding-caption
Corresponding in_scope ID: video-generation（图/视频生成链路）
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

import openai

from app.config.settings import settings
from app.services.image_base64 import to_data_uri

logger = logging.getLogger(__name__)

_VL_MODEL = "qwen-vl-plus"
# ponytail: 7MB 产品图 base64 约 10MB，弱网下 5s 会超时；放宽到 20s。
# 上传接口内并发等待，天花板是用户多等几秒；升级路径：caption 异步化+轮询。
_TIMEOUT_SECONDS = 20.0

# ponytail: caption prompt 约束客观描述、禁编造品牌名（数据引用规则）。
# 文案策略如需调整由人来改，AI 仅接线。
_CAPTION_INSTRUCTION = (
    "请用 1-2 句中文客观描述这张图片，包括：主体（产品类型/颜色/材质）、"
    "构图视角、背景、风格。禁止猜测或编造品牌名。只输出描述文字，不带任何格式。"
)


async def generate_caption(image_path: Path) -> str | None:
    """为本地图片生成中文描述 caption。

    Args:
        image_path: 已保存到 uploads 目录的图片文件路径。

    Returns:
        描述文本；视觉模型调用失败/超时返回 None。
    """
    def _call_vl() -> str:
        # to_data_uri 读文件+base64 编码是 CPU/IO 操作，放线程内避免阻塞事件循环。
        # to_data_uri 只识别 /uploads/ 前缀的本地引用（含路径穿越防护）。
        data_uri = to_data_uri(f"/uploads/{image_path.name}")
        # ponytail: 与图/视频生成 agent 同款回退——dashscope_api_key 未配时
        # 用 myself_api_key（当前 .env 只配了后者，其网关代理 dashscope 系模型）
        api_key = settings.dashscope_api_key or settings.myself_api_key
        base_url = settings.dashscope_base_url if settings.dashscope_api_key else settings.myself_base_url
        client = openai.OpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=_TIMEOUT_SECONDS,
        )
        resp = client.chat.completions.create(
            model=_VL_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": data_uri}},
                        {"type": "text", "text": _CAPTION_INSTRUCTION},
                    ],
                }
            ],
            max_tokens=120,
        )
        return (resp.choices[0].message.content or "").strip()

    try:
        caption = await asyncio.wait_for(asyncio.to_thread(_call_vl), timeout=_TIMEOUT_SECONDS + 1)
        if not caption:
            logger.warning("caption: VL 返回空内容 %s", image_path.name)
            return None
        return caption
    except (asyncio.TimeoutError, openai.OpenAIError, ValueError, OSError) as exc:
        logger.warning("caption: VL 调用失败 %s: %r", image_path.name, exc)
        return None
