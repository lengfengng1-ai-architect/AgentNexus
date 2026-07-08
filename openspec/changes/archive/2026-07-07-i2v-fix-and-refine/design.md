## Context

当前 `video_generation_agent.py` 中 `progress_pct` 使用固定 `MAX_POLL_SECONDS=600` 作为分母。实测 1.5s 视频 2-3 分钟完成，进度条跑得太慢。前端 VideoTestPage 是 T2V 为主的布局，不符合纯 I2V 需求。

## Goals / Non-Goals

**Goals:**
- progress_pct 根据 `duration` 参数动态计算分母
- VideoTestPage 转为纯 I2V 页面（image_url 必填，prompt 可选）
- 导航标签"文生视频"→"图生视频"

**Non-Goals:**
- 不改接口签名和 SSE event 结构
- 不改 `poll_video_task()` 函数（它只被其他工具使用）

## Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| 动态分母公式 | `clamp(120 + duration × 40, 180, 600)` | `120` 为基础启动时间，`×40` 为每秒视频对应额外秒数。1.5s→180s，5s→320s，10s→520s，15s→600s+clamp 到 600 |
| 页面布局 | image_url 放上方做主输入，prompt 放下方做可选 | 用户打开页面第一眼看到的是图片 URL 输入，符合 I2V 使用场景 |

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| duration 为 3s 极端时分母可能不准 | 公式有 clamp 兜底，180s 下限保证至少显示 3 分钟进度 |
| 页面改为 I2V 后如果有 T2V 测试需求 | T2V 路径仍可通过直接 curl 调用后端，路由没改 |
