## Why

移动端聊天页已支持 + 号面板上传图片，但当前存在两个体验缺口：用户上传图片后，自己发送的消息气泡中不显示图片缩略图；同时意图识别会退回 generic chat 介绍，而不是引导用户基于图片继续以图生图或以图生视频的多轮生成流程。本 change 修复这两个问题，使图片上传在移动端形成完整的“上传 → 展示 → 引导生成”闭环。

## What Changes

- 前端 `useChat.ts`：用户发送消息时，将附带的 `imageUrls` 保存到用户 `ChatMessage`，确保聊天记录中保留图片引用。
- 前端 `ChatBubble.tsx`：在用户消息气泡中渲染 `message.imageUrls` 缩略图，单图宽度限制并保持气泡圆角，多图垂直堆叠。
- 后端 `intent_recognition_agent.py`：
  - `_load_system_prompt` 将 `context.image_urls` 透传给 prompt 模板（当前被误清理）。
  - 当用户上传图片但文字输入为空、且 LLM 返回 `chat` / `clarify` 时，兜底纠正为 `text_to_image`，并给出引导生成宣传图的回复。
- 后端 prompt 模板 `intent_recognition.md.j2`：明确无文字输入但存在 `image_urls` 时，默认进入以图生图流程。
- 不修改 OpenAPI YAML（`imageUrls` / `image_url` 字段已存在）。

## Capabilities

### New Capabilities

- `mobile-image-upload-intent-fix`: 移动端图片上传后的缩略图展示与意图识别兜底。

### Modified Capabilities

- `workflow-orchestration`（意图识别节点）：当 `context.image_urls` 存在时，意图识别需正确进入以图生图/视频流程，不再回退为 generic chat。

## Impact

- 前端：影响 `frontend/src/hooks/useChat.ts`、`frontend/src/components/ChatBubble.tsx`。
- 后端：影响 `backend/app/agents/intent_recognition_agent.py`、`backend/app/prompt_templates/intent_recognition.md.j2`。
- Mock 数据：无需新增；沿用现有 DashScope 上传返回的 `oss_url`。
- API 契约：无变更。

## Non-goals

- 不新增图片全屏查看（超出最小修复范围）。
- 不新增独立的“上传后选择生图/生视频”的选择 UI。
- 不涉及方案自动执行、跨平台数据接入等 out_scope 能力。
