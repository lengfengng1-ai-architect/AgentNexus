## 1. 后端 — 动态轮询 + progress_pct

- [x] 1.1 将 `POLL_INTERVAL` 替换为 `POLL_INTERVAL_FAST=5`、`POLL_INTERVAL_SLOW=10`、`FAST_PHASE_DURATION=30`
- [x] 1.2 `stream_video_generation()` 轮询循环使用动态间隔（前 30s 每 5s，之后每 10s）
- [x] 1.3 所有 progress event 增加 `progress_pct` 字段（非终态 `min(90, int(elapsed/600*90))`，完成时 100）
- [x] 1.4 网络抖动 yield progress 时也携带 `progress_pct`

## 2. 前端 — 类型更新

- [x] 2.1 `api/video.ts` 的 `VideoStreamEvent.progress` 增加 `elapsed?: number; progress_pct?: number`

## 3. 前端 — 进度面板 UI

- [x] 3.1 添加 `currentStatus` 状态 + `ProgressEvent` 接口增加 `elapsed` 和 `progress_pct` 字段
- [x] 3.2 原来的日志列表改为单行状态面板：脉冲圆点 + 消息 + 已等时间 → 进度条（百分比宽度 `transition-all`）→ 折叠 `<details>` 详细日志
- [x] 3.3 修复图生视频只填 URL 不填 prompt 时按钮 disabled 问题

## 4. 测试

- [x] 4.1 后端测试增加 `progress_pct` 字段断言
- [x] 4.2 后端测试验证动态轮询间隔

## 5. 文档

- [x] 5.1 更新 `openspec/specs/video-generation/spec.md` 主 spec 同步 delta spec
