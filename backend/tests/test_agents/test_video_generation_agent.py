"""Tests for video generation agent SSE streaming.

验证关键修复:轮询期间每次循环都 yield progress,避免 SSE 长连接空闲超时。
"""
from __future__ import annotations

import asyncio
import json
from typing import Any

import pytest

from app.agents.video_generation_agent import (
    _build_create_body,
    _estimate_max_poll_seconds,
    stream_video_generation,
    POLL_INTERVAL_FAST,
    POLL_INTERVAL_SLOW,
    FAST_PHASE_DURATION,
)


def _parse_sse_events(raw: str) -> list[dict[str, Any]]:
    """Parse concatenated SSE blocks (event + data lines) into list of dicts."""
    events: list[dict[str, Any]] = []
    for block in raw.strip().split("\n\n"):
        block = block.strip()
        if not block:
            continue
        ev_name = None
        data = None
        for line in block.split("\n"):
            s = line.strip()
            if s.startswith("event:"):
                ev_name = s[len("event:"):].strip()
            elif s.startswith("data:"):
                data = s[len("data:"):].strip()
        if ev_name and data:
            try:
                events.append({"event": ev_name, "data": json.loads(data)})
            except json.JSONDecodeError:
                pass
    return events


@pytest.mark.asyncio
async def test_stream_yields_polling_progress_during_long_running_task(monkeypatch):
    """关键修复:轮询期间应持续 yield progress,而不是一次性 yield 终结状态。"""

    # mock create_video_task: 立即返回一个 PENDING 任务
    async def fake_create(prompt, **kwargs):
        return {
            "task_id": "mock-task-123",
            "task_status": "PENDING",
            "request_id": "mock-req",
        }

    # mock httpx 调用:前 2 次返回 PENDING/RUNNING,第 3 次返回 SUCCEEDED
    call_count = {"n": 0}

    class _FakeResponse:
        def __init__(self, status_code, payload):
            self.status_code = status_code
            self._payload = payload

        def json(self):
            return self._payload

    class _FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return None

        async def get(self, url, headers=None):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _FakeResponse(200, {"output": {"task_status": "PENDING"}})
            if call_count["n"] == 2:
                return _FakeResponse(200, {"output": {"task_status": "RUNNING"}})
            return _FakeResponse(200, {"output": {
                "task_status": "SUCCEEDED",
                "video_url": "https://example.com/video.mp4",
                "task_id": "mock-task-123",
                "orig_prompt": "测试 prompt",
                "duration": 5,
                "output_video_duration": 5,
                "SR": "720P",
                "ratio": "16:9",
            }})

    # 把 asyncio.sleep 加速,避免真实等待
    async def fast_sleep(s):
        return None

    monkeypatch.setattr("app.agents.video_generation_agent.create_video_task", fake_create)
    monkeypatch.setattr("app.agents.video_generation_agent.httpx.AsyncClient", _FakeAsyncClient)
    monkeypatch.setattr("app.agents.video_generation_agent.asyncio.sleep", fast_sleep)

    raw = "".join([chunk async for chunk in stream_video_generation("test prompt")])
    events = _parse_sse_events(raw)

    # 关键断言:有 task_created → 至少 2 个 polling progress → completed → result
    stages = [e["data"].get("stage") for e in events]
    assert "task_created" in stages, f"缺 task_created: {stages}"
    polling_count = stages.count("polling")
    assert polling_count >= 2, f"轮询期间至少 yield 2 次 polling progress,实际 {polling_count}"
    assert "completed" in stages, f"缺 completed: {stages}"

    # progress_pct 字段存在且为整数
    for ev in events:
        if ev["event"] == "progress":
            assert "progress_pct" in ev["data"], f"progress event 缺 progress_pct: {ev['data']}"
            assert isinstance(ev["data"]["progress_pct"], int), f"progress_pct 应为整数: {ev['data']['progress_pct']}"

    # 必须有 result event 且包含 video_url
    result_events = [e for e in events if e["event"] == "result"]
    assert len(result_events) == 1
    assert result_events[0]["data"]["video_url"] == "https://example.com/video.mp4"


@pytest.mark.asyncio
async def test_stream_emits_error_on_failed_task(monkeypatch):
    """任务 FAILED 时应发 error event。"""

    async def fake_create(prompt, **kwargs):
        return {"task_id": "task-fail", "task_status": "PENDING", "request_id": "r"}

    class _FakeResponse:
        status_code = 200

        def json(self):
            return {"output": {
                "task_status": "FAILED",
                "message": "内容违规",
                "code": "InvalidParameter",
            }}

    class _FakeAsyncClient:
        def __init__(self, *a, **kw): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return None
        async def get(self, url, headers=None): return _FakeResponse()

    async def fast_sleep(s): return None

    monkeypatch.setattr("app.agents.video_generation_agent.create_video_task", fake_create)
    monkeypatch.setattr("app.agents.video_generation_agent.httpx.AsyncClient", _FakeAsyncClient)
    monkeypatch.setattr("app.agents.video_generation_agent.asyncio.sleep", fast_sleep)

    raw = "".join([chunk async for chunk in stream_video_generation("test prompt")])
    events = _parse_sse_events(raw)

    error_events = [e for e in events if e["event"] == "error"]
    assert len(error_events) == 1
    assert "视频生成失败" in error_events[0]["data"]["detail"]


@pytest.mark.asyncio
async def test_stream_handles_network_blip_without_crashing(monkeypatch):
    """轮询时网络抖动不应崩溃,应 yield polling progress 继续轮询。"""

    async def fake_create(prompt, **kwargs):
        return {"task_id": "task-blip", "task_status": "PENDING", "request_id": "r"}

    call_count = {"n": 0}

    class _FakeResponse:
        def __init__(self, code, payload=None, exc=None):
            self.status_code = code
            self._payload = payload
            self._exc = exc

        def json(self):
            return self._payload or {}

    class _FakeAsyncClient:
        def __init__(self, *a, **kw): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return None
        async def get(self, url, headers=None):
            call_count["n"] += 1
            if call_count["n"] == 1:
                # 模拟网络错误(ConnectionError 等会抛异常,被 stream_video_generation 捕获)
                import httpx
                raise httpx.ConnectError("模拟网络抖动", request=None)
            if call_count["n"] == 2:
                return _FakeResponse(200, {"output": {"task_status": "SUCCEEDED", "video_url": "https://x/v.mp4", "task_id": "task-blip", "SR": "720P", "ratio": "16:9", "output_video_duration": 5}})
            return _FakeResponse(200, {"output": {"task_status": "SUCCEEDED"}})

    async def fast_sleep(s): return None

    monkeypatch.setattr("app.agents.video_generation_agent.create_video_task", fake_create)
    monkeypatch.setattr("app.agents.video_generation_agent.httpx.AsyncClient", _FakeAsyncClient)
    monkeypatch.setattr("app.agents.video_generation_agent.asyncio.sleep", fast_sleep)

    raw = "".join([chunk async for chunk in stream_video_generation("test prompt")])
    events = _parse_sse_events(raw)

    # 网络抖动 + 恢复 → 应有 polling progress (network blip msg) + 最终 result
    stages = [e["data"].get("stage") for e in events]
    assert "polling" in stages  # 网络抖动时也 yield polling
    result_events = [e for e in events if e["event"] == "result"]
    assert len(result_events) == 1
    assert result_events[0]["data"]["video_url"] == "https://x/v.mp4"


# ── _estimate_max_poll_seconds 测试 ────────────────────────


def test_estimate_max_poll_seconds():
    """_estimate_max_poll_seconds 动态分母计算公式正确。"""
    # 1.5s → clamp(120+60, 180, 600) = 180
    assert _estimate_max_poll_seconds(1) == 180
    # 3s → clamp(120+120, 180, 600) = 240
    assert _estimate_max_poll_seconds(3) == 240
    # 5s → clamp(120+200, 180, 600) = 320
    assert _estimate_max_poll_seconds(5) == 320
    # 10s → clamp(120+400, 180, 600) = 520
    assert _estimate_max_poll_seconds(10) == 520
    # 15s → clamp(120+600, 180, 600) = 600
    assert _estimate_max_poll_seconds(15) == 600
    # 默认值 5s
    assert _estimate_max_poll_seconds() == 320
    # 下限 180
    assert _estimate_max_poll_seconds(0) == 180
    # 上限 600
    assert _estimate_max_poll_seconds(20) == 600


# ── _build_create_body 测试 ──────────────────────────────


def test_build_body_t2v():
    """无 image_url 时走 T2V 分支。"""
    body = _build_create_body(prompt="一只柯基犬奔跑")
    assert body["model"] == "happyhorse-1.1-t2v"
    assert body["input"] == {"prompt": "一只柯基犬奔跑"}
    assert body["parameters"]["resolution"] == "720P"
    assert body["parameters"]["ratio"] == "16:9"
    assert body["parameters"]["duration"] == 5


def test_build_body_r2v_with_prompt():
    """有 image_urls 和 prompt 时走 R2V 分支。"""
    body = _build_create_body(prompt="让图片动起来", image_urls=["https://example.com/img.png"])
    assert body["model"] == "happyhorse-1.1-r2v"
    assert body["input"] == {
        "media": [{"type": "reference_image", "url": "https://example.com/img.png"}],
        "prompt": "让图片动起来",
    }


def test_build_body_r2v_without_prompt():
    """有 image_urls 但无 prompt 时，input 只包含 media。"""
    body = _build_create_body(prompt="", image_urls=["https://example.com/img.png"])
    assert body["model"] == "happyhorse-1.1-r2v"
    assert body["input"] == {
        "media": [{"type": "reference_image", "url": "https://example.com/img.png"}],
    }


def test_build_body_r2v_multi_image():
    """多图场景：image_urls 多个 URL 时 media 包含对应数量的 reference_image。"""
    urls = ["https://example.com/img1.png", "https://example.com/img2.png", "https://example.com/img3.png"]
    body = _build_create_body(prompt="动画", image_urls=urls)
    assert body["model"] == "happyhorse-1.1-r2v"
    assert body["input"]["media"] == [
        {"type": "reference_image", "url": "https://example.com/img1.png"},
        {"type": "reference_image", "url": "https://example.com/img2.png"},
        {"type": "reference_image", "url": "https://example.com/img3.png"},
    ]
    assert body["input"]["prompt"] == "动画"


def test_build_body_custom_params():
    """自定义参数传递。"""
    body = _build_create_body(
        prompt="test",
        resolution="1080P",
        ratio="9:16",
        duration=10,
        seed=42,
    )
    assert body["parameters"]["resolution"] == "1080P"
    assert body["parameters"]["ratio"] == "9:16"
    assert body["parameters"]["duration"] == 10
    assert body["parameters"]["seed"] == 42


# ── 动态轮询间隔测试 ──────────────────────────


def test_poll_interval_constants():
    """动态轮询间隔常量正确。"""
    assert POLL_INTERVAL_FAST == 5
    assert POLL_INTERVAL_SLOW == 10
    assert FAST_PHASE_DURATION == 30