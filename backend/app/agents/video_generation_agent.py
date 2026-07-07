"""HappyHorse 文生视频 Agent — 阿里云百炼 DashScope API 异步调用。

流程：创建任务 → 轮询获取结果。
创建任务使用 POST 异步接口，轮询使用 GET 查询接口。

Corresponding in_scope ID: video-generation
"""

import asyncio
import json
import logging
from collections.abc import AsyncGenerator
from typing import Any

import httpx

from app.config.settings import settings

logger = logging.getLogger(__name__)

# ── 默认参数 ──────────────────────────────────────────────
DEFAULT_RESOLUTION = "720P"
DEFAULT_RATIO = "16:9"
DEFAULT_DURATION = 5
POLL_INTERVAL = 5  # 轮询间隔（秒）
MAX_POLL_SECONDS = 600  # 最多等 10 分钟


def _build_base_url() -> str:
    """从现有的 MYSELF_BASE_URL 或 DASHSCOPE_BASE_URL 提取 workspace 专属域名，
    用于视频生成 API（视频 API 和 LLM API 共用同一地域端点）。

    优先用 MYSELF_BASE_URL（用户已配了 workspace 专属域名），
    兜底用 DASHSCOPE_BASE_URL 的 host。
    """
    for candidate in (settings.myself_base_url, settings.dashscope_base_url):
        if candidate and "://" in candidate:
            host = candidate.split("://")[1].split("/")[0]
            return f"https://{host}"
    # 最后兜底
    return "https://dashscope.aliyuncs.com"


def _headers() -> dict[str, str]:
    # 优先用 dashscope_api_key，如果没配则 fallback 到 myself_api_key
    # 两者都是 DashScope 体系，MYSELF 是 workspace 专属域名
    key = settings.dashscope_api_key
    if not key or key == "your-dashscope-api-key-here":
        key = settings.myself_api_key
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


async def create_video_task(
    prompt: str,
    *,
    resolution: str = DEFAULT_RESOLUTION,
    ratio: str = DEFAULT_RATIO,
    duration: int = DEFAULT_DURATION,
    seed: int | None = None,
) -> dict[str, Any]:
    """步骤 1：创建视频生成异步任务，返回 task_id。

    Raises httpx.HTTPStatusError 或 ValueError。
    """
    base = _build_base_url()
    url = f"{base}/api/v1/services/aigc/video-generation/video-synthesis"

    body: dict[str, Any] = {
        "model": settings.dashscope_video_model,
        "input": {"prompt": prompt},
        "parameters": {
            "resolution": resolution,
            "ratio": ratio,
            "duration": duration,
        },
    }
    if seed is not None:
        body["parameters"]["seed"] = seed

    headers = _headers()
    headers["X-DashScope-Async"] = "enable"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=body, headers=headers)

    if resp.status_code != 200:
        detail = resp.text
        try:
            detail = resp.json().get("message", detail)
        except Exception:
            pass
        raise httpx.HTTPStatusError(
            f"创建视频任务失败 ({resp.status_code}): {detail}",
            request=resp.request,
            response=resp,
        )

    data = resp.json()
    output = data.get("output", {})
    task_id = output.get("task_id")
    if not task_id:
        raise ValueError(f"创建任务响应缺少 task_id: {data}")

    logger.info("video task created: task_id=%s", task_id)
    return {
        "task_id": task_id,
        "task_status": output.get("task_status", "PENDING"),
        "request_id": data.get("request_id"),
    }


async def poll_video_task(task_id: str) -> dict[str, Any]:
    """步骤 2：轮询视频生成任务直到完成或失败。

    返回最终的 output dict（含 task_status / video_url 等）。
    """
    base = _build_base_url()
    url = f"{base}/api/v1/tasks/{task_id}"

    elapsed = 0
    terminal_states = {"SUCCEEDED", "FAILED", "CANCELED"}
    async with httpx.AsyncClient(timeout=15) as client:
        while elapsed < MAX_POLL_SECONDS:
            resp = await client.get(url, headers=_headers())
            if resp.status_code != 200:
                detail = resp.text
                try:
                    detail = resp.json().get("message", detail)
                except Exception:
                    pass
                raise httpx.HTTPStatusError(
                    f"查询任务失败 ({resp.status_code}): {detail}",
                    request=resp.request,
                    response=resp,
                )

            data = resp.json()
            output = data.get("output", {})
            status = output.get("task_status", "UNKNOWN")

            if status in terminal_states:
                logger.info("video task %s finished: status=%s", task_id, status)
                return output

            # 非终态 → 等一段时间再轮询
            import asyncio

            await asyncio.sleep(POLL_INTERVAL)
            elapsed += POLL_INTERVAL

    raise TimeoutError(f"视频任务 {task_id} 超过 {MAX_POLL_SECONDS}s 仍未完成，请稍后手动查询")


async def stream_video_generation(
    prompt: str,
    *,
    resolution: str = DEFAULT_RESOLUTION,
    ratio: str = DEFAULT_RATIO,
    duration: int = DEFAULT_DURATION,
    seed: int | None = None,
) -> AsyncGenerator[str, None]:
    """流式 SSE 入口：创建任务 → 逐步推送进度 → 推送最终结果。

    关键:轮询期间每次循环都 yield progress,避免 SSE 长连接空闲超时。
    """

    def _sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

    try:
        # 创建任务
        create_result = await create_video_task(
            prompt,
            resolution=resolution,
            ratio=ratio,
            duration=duration,
            seed=seed,
        )
        yield _sse("progress", {
            "stage": "task_created",
            "task_id": create_result["task_id"],
            "status": create_result["task_status"],
            "message": "视频生成任务已创建，正在排队…",
        })

        # 流式轮询：每次循环 yield progress,避免 SSE 连接空闲超时
        task_id = create_result["task_id"]
        base = _build_base_url()
        url = f"{base}/api/v1/tasks/{task_id}"
        elapsed = 0
        poll_count = 0
        last_status = "PENDING"
        while elapsed < MAX_POLL_SECONDS:
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.get(url, headers=_headers())
            except httpx.HTTPError as exc:
                logger.warning("video poll network error (retry next cycle): %s", exc)
                yield _sse("progress", {
                    "stage": "polling",
                    "task_id": task_id,
                    "status": last_status,
                    "message": f"轮询网络抖动,稍后重试 (已等 {elapsed}s)…",
                    "elapsed": elapsed,
                })
                await asyncio.sleep(POLL_INTERVAL)
                elapsed += POLL_INTERVAL
                continue

            if resp.status_code != 200:
                detail = resp.text
                try:
                    detail = resp.json().get("message", detail)
                except Exception:
                    pass
                yield _sse("error", {
                    "detail": f"查询任务失败 ({resp.status_code}): {detail}",
                    "code": "video_poll_http_error",
                })
                return

            data = resp.json()
            output = data.get("output", {})
            status = output.get("task_status", "UNKNOWN")
            last_status = status
            poll_count += 1

            if status in ("SUCCEEDED", "FAILED", "CANCELED"):
                # 终结态:跳出循环,在外层处理 result/error
                break

            # 仍 RUNNING/PENDING → 推 progress
            yield _sse("progress", {
                "stage": "polling",
                "task_id": task_id,
                "status": status,
                "message": f"正在生成视频…(第 {poll_count} 次轮询,已等 {elapsed}s)",
                "elapsed": elapsed,
            })
            await asyncio.sleep(POLL_INTERVAL)
            elapsed += POLL_INTERVAL
        else:
            # while 条件为 False 自然结束(超时)
            yield _sse("error", {
                "detail": f"视频任务 {task_id} 超过 {MAX_POLL_SECONDS}s 仍未完成，请稍后手动查询",
                "code": "video_timeout",
            })
            return

        # 处理终结态
        if last_status == "SUCCEEDED":
            video_url = output.get("video_url")
            yield _sse("progress", {
                "stage": "completed",
                "status": "SUCCEEDED",
                "task_id": task_id,
                "message": "视频生成完成！",
                "elapsed": elapsed,
            })
            yield _sse("result", {
                "task_id": task_id,
                "video_url": video_url,
                "orig_prompt": output.get("orig_prompt"),
                "usage": {
                    "duration": output.get("duration"),
                    "output_video_duration": output.get("output_video_duration"),
                    "resolution": output.get("SR"),
                    "ratio": output.get("ratio"),
                },
            })
        elif last_status == "FAILED":
            error_msg = output.get("message", output.get("code", "未知错误"))
            yield _sse("error", {
                "detail": f"视频生成失败: {error_msg}",
                "code": "video_failed",
            })
        else:
            yield _sse("error", {
                "detail": f"视频任务状态异常: {last_status}",
                "code": "video_unknown_status",
            })

    except httpx.HTTPStatusError as exc:
        logger.exception("video generation HTTP error")
        yield _sse("error", {"detail": str(exc), "code": "video_http_error"})
    except TimeoutError as exc:
        logger.exception("video generation timeout")
        yield _sse("error", {"detail": str(exc), "code": "video_timeout"})
    except Exception as exc:
        logger.exception("video generation unexpected error")
        yield _sse("error", {"detail": f"视频生成异常: {exc}", "code": "video_internal_error"})
