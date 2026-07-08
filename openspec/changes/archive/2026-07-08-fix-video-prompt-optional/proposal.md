## Why

视频生成端点 `POST /api/v1/video/generate` 的 `prompt` 字段为必填，导致纯图生视频（只传 image_url 不传 prompt）返回 422 错误。同时前端 VideoTestPage 和 ChatBubble 的按钮守卫以 `!prompt.trim()` 为首要条件，纯图片场景无法触发生成。需要支持三种模式：文生视频（仅 prompt）、图生视频（仅 image_url）、图+文生成视频（prompt + image_url）。

## What Changes

- **后端 `VideoGenerateRequest`**：`prompt` 改为可选（`str | None`），校验 `prompt` 或 `image_url` 至少一个
- **后端 `docs/api/paths/video.yaml`**：新建 OpenAPI YAML，描述修改后的端点契约
- **后端 `video_generation_agent.py`**：`_build_create_body` 中 T2V 分支也需要适配 prompt 为 None 的情况
- **前端 `VideoTestPage.tsx`**：按钮守卫改为 `!prompt.trim() && !imageUrl.trim()`；自触发逻辑也检查 image_url
- **前端 `ChatBubble.tsx`**：`generate_video` 的 `hasValidPrompt` 已检查 `imageUrl`，不需改

## Capabilities

### New Capabilities
无

### Modified Capabilities
- `video-generation`: 视频生成端点支持纯图生视频模式（prompt 可选），前端子触发条件和按钮守卫适配

## Impact

- 后端：`backend/app/routers/video.py`（~5 行改动）、`backend/app/agents/video_generation_agent.py`（~5 行改动）
- 前端：`frontend/src/pages/VideoTestPage.tsx`（~5 行改动）
- 文档：新建 `docs/api/paths/video.yaml`
- 测试：无存量测试需修改
