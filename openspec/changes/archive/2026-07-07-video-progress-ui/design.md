## Context

当前视频生成页面（`VideoTestPage.tsx`）的进度区域使用简单的日志列表叠加显示，每次轮询追加一条日志行，占据大量空间且不直观。后端 `stream_video_generation()` 的轮询间隔固定为 5 秒。

OpenSpec 主 spec `openspec/specs/video-generation/spec.md` 已有进度推送需求，但缺少 `progress_pct` 和动态轮询间隔要求。

关联 API: `POST /video/generate`（无独立 OpenAPI YAML，挂载在 router 中）

## Goals / Non-Goals

**Goals:**
- progress SSE event 增加 `progress_pct`（0-100 整数）和 `elapsed` 字段
- 轮询间隔改为动态：前 30s 每 5s，之后每 10s
- 前端进度区改为单行状态 + 进度条 + 折叠日志布局

**Non-Goals:**
- 不改变 SSE event 结构兼容性或删除已有字段（仅新增）
- 不修改视频创建/结果返回逻辑
- 不修改 `poll_video_task()` 函数（仅 `stream_video_generation()` 需要动态间隔）

## Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| progress_pct 计算公式 | `min(90, int(elapsed / 600 * 90))` | DashScope 不返回百分比，无法获知实际进度。最大 90% 留 10% 给完成态（100%） |
| 动态轮询阈值 | 前 30s 每 5s，之后每 10s | 30s 后任务大概率已进入 RUNNING，降低轮询频率减少 SSE 消息数 |
| 前端状态面板 | 单 `<div>` 含脉冲圆点 + 消息 + 已等时间 → 进度条 → 折叠 `<details>` | 垂直紧凑布局，不占额外空间，折叠日志保留可查历史 |

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 进度百分比是估算值，可能跳变 | 告诉用户是"估算"，前端用 `transition-all duration-500` 平滑过渡 |
| 折叠日志内容过多 | `max-h-[200px] overflow-y-auto` 限制高度 |
