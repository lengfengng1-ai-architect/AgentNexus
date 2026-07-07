## Context

图片生成 Agent（`image_generation`）后端已实现，注册名 `image_generation`，通过 `build_chat_model()` 调用 LLM 生成 prompt 并通过 DashScope SDK 调通 Qwen-Image API。当前缺少前端调试入口，需要快速验证 prompt 到出图的链路效果。

## Goals / Non-Goals

**Goals:**
- 提供一个前端页面，输入 prompt 直接调 Qwen-Image 出图（不经过 LLM 优化）
- 支持选择图片尺寸（1:1 / 16:9 / 9:16 / 4:3）
- 实时显示生成的图片和图片 URL

**Non-Goals:**
- 不做批量生成、历史记录、图片下载（MVP 阶段不需要）
- 不做图片编辑、多轮对话

## Decisions

| 决策 | 选型 | 理由 |
|------|------|------|
| 后端直通 API | 新建 `routers/image_generation.py` | 复用已注册的 `image_generation` Agent，不做额外编排 |
| API 响应格式 | 统一 `APIResponse` 信封 | 与现有 API 风格一致 |
| 前端新页面 | `pages/ImageTestPage.tsx` | 与 `IntentTestPage.tsx` 模式一致，从导航"测试"下拉进入 |
| 图片显示 | 直接 `<img>` 标签 | 简单直接，不需要额外库 |
| 请求方式 | 同步 POST | 图片生成通常几秒内返回，不需要 SSE 流式 |

## Risks / Trade-offs

- **Qwen-Image URL 24h 过期**: 测试用没问题，后续如需持久化可加入下载到 OSS/本地
- **无 API Key 报错**: 用户需配置 `DASHSCOPE_API_KEY`，否则返回清晰错误提示
