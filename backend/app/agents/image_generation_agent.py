"""Agent: 图片生成（Image Generation）。

注册名称: image_generation
对应 in_scope ID: （新增，待补充）
用途: 根据营销方案文本内容生成高质量图片，对接阿里云百炼 Qwen-Image API
输入:
  - plan_content: str (必填) — 营销方案文本
  - image_type: str (可选, 默认 main_visual) — 图片类型: main_visual / poster / social_media / scene
  - size: str (可选, 默认 2048*2048) — 分辨率
  - negative_prompt: str (可选) — 反向提示词
输出: { image_url, prompt_used, width, height, image_type }
"""

from __future__ import annotations

import logging
from typing import Any

from httpx import AsyncClient
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.llm_utils import build_chat_model
from app.agents.registry import register
from app.config.settings import settings

logger = logging.getLogger(__name__)

# ── 默认常量 ──────────────────────────────────────────────

# Qwen-Image 同步接口地址（北京地域）
# 如果需要使用工作空间专属域名，替换 {WorkspaceId} 并更新 URL
_IMAGE_GEN_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"

_DEFAULT_MODEL = settings.image_gen_model
_DEFAULT_SIZE = "2048*2048"
_DEFAULT_NEGATIVE_PROMPT = (
    "低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，"
    "蜡像感，人脸无细节，过度光滑，画面具有AI感。构图混乱。文字模糊，扭曲。"
)

_IMAGE_TYPE_DEFAULTS: dict[str, dict[str, str]] = {
    "main_visual": {
        "size": "2688*1536",
        "desc": "主视觉图，16:9横版，大气、品牌感强，适合封面/首页大图",
    },
    "poster": {
        "size": "1536*2688",
        "desc": "海报，9:16竖版，信息层次清晰，视觉冲击力强",
    },
    "social_media": {
        "size": "2048*2048",
        "desc": "社交媒体配图，1:1方形，轻松、有话题感",
    },
    "scene": {
        "size": "2368*1728",
        "desc": "场景图，4:3，展示活动/赛事/场馆的真实场景感",
    },
}

_MODEL = None


def _get_llm():
    global _MODEL
    if _MODEL is None:
        _MODEL = build_chat_model()
    return _MODEL


async def generate_image_prompt(plan_content: str, image_type: str) -> str:
    """使用 LLM 将方案文本转化为详细的 Qwen-Image 正向提示词。

    Args:
        plan_content: 营销方案文本（最长取前 3000 字符）
        image_type: 图片类型，参考 _IMAGE_TYPE_DEFAULTS

    Returns:
        str: 生成的 image prompt（中文，300-800 字）
    """
    type_info = _IMAGE_TYPE_DEFAULTS.get(image_type, _IMAGE_TYPE_DEFAULTS["main_visual"])
    llm = _get_llm()

    system_msg = (
        "你是一个专业的设计师，擅长为营销方案生成高质量的文生图提示词(Prompt)。\n"
        "你需要根据营销方案文本和指定的图片类型，生成一段详细、富有画面感的中文Prompt。\n\n"
        "规则：\n"
        "1. Prompt 必须用中文，详细描述画面构图、色调、氛围、元素\n"
        "2. 包含具体的视觉细节：光影、材质、色彩、人物表情/动作\n"
        "3. 如果方案中提到了品牌名称、赛事名称等，应合理融入画面描述\n"
        "4. 适合 Qwen-Image 模型生成，注重真实质感\n"
        "5. 不包含文字/水印要求（模型会自动处理）\n"
        "6. 长度控制在 300-800 字之间\n\n"
        f"当前图片类型：{image_type} — {type_info['desc']}\n"
        f"推荐分辨率：{type_info['size']}"
    )

    user_msg = f"营销方案内容：\n{plan_content[:3000]}\n\n图片类型：{image_type}\n请为以上营销方案生成一段高质量的文生图Prompt。"

    response = await llm.ainvoke([
        SystemMessage(content=system_msg),
        HumanMessage(content=user_msg),
    ])

    prompt = (response.content or "").strip()
    if not prompt:
        raise RuntimeError("LLM returned empty image prompt")
    return prompt


async def call_qwen_image_api(
    prompt: str,
    *,
    api_key: str,
    size: str = _DEFAULT_SIZE,
    negative_prompt: str = _DEFAULT_NEGATIVE_PROMPT,
) -> dict[str, Any]:
    """调用 Qwen-Image API 生成图片。

    Args:
        prompt: 正向提示词
        api_key: DashScope API Key
        size: 分辨率，如 "2048*2048"
        negative_prompt: 反向提示词

    Returns:
        { image_url, width, height }
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    payload = {
        "model": _DEFAULT_MODEL,
        "input": {
            "messages": [{
                "role": "user",
                "content": [{"text": prompt}],
            }],
        },
        "parameters": {
            "negative_prompt": negative_prompt,
            "size": size,
            "prompt_extend": True,
            "watermark": False,
        },
    }

    async with AsyncClient(timeout=120) as client:
        response = await client.post(_IMAGE_GEN_API_URL, headers=headers, json=payload)

    if response.status_code != 200:
        raise RuntimeError(
            f"Qwen-Image API 调用失败 (HTTP {response.status_code}): {response.text}"
        )

    result = response.json()
    try:
        choice = result["output"]["choices"][0]
        image_url = choice["message"]["content"][0]["image"]
        usage = result.get("usage", {})
        width = usage.get("width", 0)
        height = usage.get("height", 0)
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Qwen-Image API 返回格式异常: {result}") from e

    return {"image_url": image_url, "width": width, "height": height}


async def run_image_generation(state: dict[str, Any]) -> dict[str, Any]:
    """图片生成 Agent 入口——接收方案文本，生成图片并返回 URL。

    流程:
      1. LLM 根据方案内容生成详细的 image prompt
      2. 调用 Qwen-Image API 生成图片
      3. 返回图片 URL 及元信息

    期望 state 字段:
      - plan_content (必填): 方案文本内容
      - image_type (可选): 图片类型，默认 main_visual
      - size (可选): 分辨率，默认根据 image_type 自动选择
      - negative_prompt (可选): 反向提示词
      - api_key (可选): 覆盖 settings.dashscope_api_key
    """
    plan_content = state.get("plan_content", "")
    if not plan_content or not plan_content.strip():
        raise ValueError("缺少必填字段: plan_content")

    image_type = state.get("image_type", "main_visual")
    size = state.get("size") or _IMAGE_TYPE_DEFAULTS.get(image_type, {}).get("size", _DEFAULT_SIZE)
    negative_prompt = state.get("negative_prompt", _DEFAULT_NEGATIVE_PROMPT)
    api_key = state.get("api_key") or settings.dashscope_api_key or settings.myself_api_key

    if not api_key:
        raise ValueError(
            "缺少 API Key。请在环境变量设置 DASHSCOPE_API_KEY "
            "或 MYSELF_API_KEY。"
        )

    # Step 1: LLM 生成 image prompt
    image_prompt = await generate_image_prompt(plan_content, image_type)
    logger.info("已生成 image prompt (type=%s, %d chars)", image_type, len(image_prompt))

    # Step 2: 调用 Qwen-Image API
    api_result = await call_qwen_image_api(
        image_prompt,
        api_key=api_key,
        size=size,
        negative_prompt=negative_prompt,
    )

    return {
        "image_url": api_result["image_url"],
        "prompt_used": image_prompt,
        "width": api_result["width"],
        "height": api_result["height"],
        "image_type": image_type,
    }


register("image_generation", run_image_generation)
