## Why

当前视频生成页面的进度展示占用大量纵向空间，每条轮询日志叠加显示，不直观也不专业。用户无法一眼看到生成进度百分比和已等待时间。同时后端轮询间隔固定为 5s，轮询频率过高时产生过多 SSE 消息噪音。

本次改动将进度展示改为**单行状态 + 进度条 + 折叠日志**，后端增加动态轮询间隔和 `progress_pct` 估算百分比，提升用户体验。

## What Changes

- **后端**：`stream_video_generation()` 每次 progress event 增加 `progress_pct` 字段（0-100），轮询间隔从固定 5s 改为动态（前 30s 每 5s，之后每 10s）
- **前端**：视频生成进度区改为专业状态面板：脉冲圆点 + 单行消息 + 已等时间 → 进度条（百分比） → 折叠详细日志
- **前端修复**：图生视频只填写图片 URL 不填 prompt 时，生成按钮应可点击

## Capabilities

### New Capabilities
无新增 capability

### Modified Capabilities
- `video-generation`: progress SSE event 新增 `progress_pct` 字段；轮询间隔改为动态；前端进度 UI 重构

## Impact

| 影响范围 | 具体内容 |
|---------|---------|
| 后端 API 输出 | progress event 新增 `elapsed`、`progress_pct` 字段，前端可消费 |
| 前端组件 | `VideoTestPage.tsx` 进度展示区重写，`api/video.ts` 类型更新 |
| 测试 | 后端 `test_video_generation_agent.py` 需增加 `progress_pct` 断言 |
| spec 文档 | `video-generation/spec.md` 补充 `progress_pct` 和动态轮询需求 |
