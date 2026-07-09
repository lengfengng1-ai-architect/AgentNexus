## Why

聊天中识别到 `text_to_image` 意图后，当前仅返回文字回复（"已收到您的图片生成请求"），但实际没有调用图片生成 API，用户看不到任何执行反馈，也不会生成图片。需要将图片生成从独立页面融合进对话中，与 InlineVideoCard 同等体验。

## What Changes

- **NEW**: InlineImageCard 组件 — Prompt 预览 → [生成图片] 按钮 → 加载中状态 → 图片展示 → 全屏查看 → 错误重试
- **MODIFIED**: ChatBubble 收到 `text_to_image` intent 时渲染 InlineImageCard 替代空回复
- **MODIFIED**: `ChatMessage` 类型新增 `imageResult` 持久化字段
- **NO CHANGE**: 后端 `/api/v1/image/generate` 接口不变

## Capabilities

### New Capabilities

- `inline-image-gen`: 对话内嵌图片生成，支持 Prompt 预览、一键生成、加载状态、图片展示、全屏查看

### Modified Capabilities

- 无（`video-generation` 已覆盖 SSE 流式能力，图片使用同步 POST 无 delta）

## Impact

- `frontend/src/types/chat.ts` — ChatMessage 新增 `imageResult` 字段
- `frontend/src/components/InlineImageCard.tsx` — 新组件
- `frontend/src/components/ChatBubble.tsx` — text_to_image 时渲染 InlineImageCard
- `frontend/src/hooks/useChat.ts` — 新增 IMAGE_RESULT action + updateImageResult
- `frontend/src/components/ChatContainer.tsx` — 透传 onImageResult
