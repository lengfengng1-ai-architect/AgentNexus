## Why

HappyHorse I2V（图生视频）支持多帧图片输入（最多 9 张），以多张图片作为参考帧生成更丰富、连贯的视频内容。当前系统仅支持单张图片 URL 输入，无法利用多帧能力。需要将 `image_url` 从单值改为数组，全链路适配多图输入。

## What Changes

- **后端 API**：`POST /api/v1/video/generate` 的 `image_url: str | None` → `image_urls: list[str] | None`，`@model_validator` 校验至少提供一个 prompt 或一张图片
- **后端 Agent**：`_build_create_body` 中 `media` 数组从单元素改为多元素，映射到 HappyHorse I2V 的多帧输入
- **前端测试页**：图片输入从单 input 改为多行 textarea（按行分隔），动态渲染缩略图预览（1~9 张）
- **前端自触发**：URL query param 从单 `?image_url=` 改为逗号分隔 `?image_urls=url1,url2`
- **对话跳转**：`ChatMessage.imageUrl` 从单值改为支持多值传递
- **OpenSpec**：更新 `video-generation` spec

## Capabilities

### Modified Capabilities
- `video-generation`: 图生视频输入从单图改为多图（1~9 张），POST 请求体 `image_url` 字段改为 `image_urls`

## Impact

- `backend/app/routers/video.py` — Pydantic request schema 变更
- `backend/app/agents/video_generation_agent.py` — `_build_create_body` / `create_video_task` / `stream_video_generation` 签名变更
- `frontend/src/pages/VideoTestPage.tsx` — UI 重构 + 自触发参数解析
- `frontend/src/types/video.ts` — `VideoParams.image_url` → `image_urls`
- `frontend/src/components/ChatBubble.tsx` / `ChatContainer.tsx` — 导航参数适配
- `docs/api/paths/video.yaml` — 更新 schema 定义
