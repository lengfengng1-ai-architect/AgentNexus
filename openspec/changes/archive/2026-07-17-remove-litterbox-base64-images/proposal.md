## Why

当前以图生图（qwen-image）和图生视频（HappyHorse r2v）通过 litterbox 公网图床传图，但 DashScope 服务器位于国内、跨境访问 litterbox（海外 Cloudflare 节点）不稳定，导致 `Failed to download image from [litterbox URL]` 400 错误。任何免费海外图床都有同样风险。

经查阅 `docs/references/qwen-image-api.md` 与 `docs/references/image2video.md`：qwen-image 与 HappyHorse r2v 的图像输入**均支持 Base64 内联**（`data:{MIME};base64,{data}`），图片随请求体直接发给模型，无需公网 URL。本地 `/uploads/` 已保存图片，可直接读文件转 Base64。因此可整体移除 litterbox，模型传图改 Base64 内联，气泡展示改用本地 `/uploads/` URL（同域，浏览器稳定可看）。

## What Changes

- 后端新增图片转 Base64 data URI 的工具（读 `/uploads/` 文件 → `data:{mime};base64,...`）。
- 以图生图（`image_generation_agent.py`）：`image_url` 为参考图时，先转 Base64 内联再放进 `content[].image`，不再依赖公网 URL 或 `X-DashScope-OssResourceResolve`。
- 图生视频（`video_generation_agent.py`）：`image_urls` 为参考图时，`media[].url` 填 Base64 内联；移除 `oss://` 的 `X-DashScope-OssResourceResolve` 头逻辑。
- 上传接口（`upload.py`）：移除 litterbox 同步上传，`oss_url` 不再返回（或恒为 null）；气泡展示与模型推理统一用本地 `/uploads/` URL。
- 前端 `ScreenChat.handleFileSelect`：上传后统一使用本地 `/uploads/` URL（`BACKEND_ORIGIN + url`），不再取 `oss_url`。
- 删除 `litterbox_upload.py` 及其测试。
- 更新 `docs/api/paths/upload.yaml`：移除 `oss_url` 字段或标记废弃。

## Capabilities

### New Capabilities

（无新增 capability，为现有能力的实现方式调整）

### Modified Capabilities

- `inline-image-gen`（以图生图）：参考图输入由公网 URL 改为 Base64 内联。
- `inline-video-gen`（图生视频）：参考图输入由公网 URL 改为 Base64 内联，移除 oss:// 解析头。
- `chat-attachment-file-upload`（后端文件上传接口）：不再同步到第三方图床，返回本地 URL 供展示与推理。
- `image-temp-hosting`（图片临时公网托管）：**移除**——不再使用第三方图床。

## Impact

- 后端：`app/agents/image_generation_agent.py`、`app/agents/video_generation_agent.py`、`app/routers/upload.py`；删除 `app/services/litterbox_upload.py`、`tests/test_services/test_litterbox_upload.py`；新增 Base64 工具（可放 `app/services/` 或 agent 内）。
- 前端：`frontend/src/pages/mobile-workbench/ScreenChat.tsx`。
- 配置：上传链路不再依赖 litterbox。
- API 契约：`upload.yaml` 移除/废弃 `oss_url`。
- Mock 数据：无需新增。

## Non-goals

- 不改变文生视频（HappyHorse t2v，无图片输入）与文生图（无参考图）逻辑。
- 不引入新的第三方图床或对象存储。
- 不处理超过模型 Base64 大小限制的超大图（qwen-image ≤10MB、HappyHorse ≤20MB，MVP 依赖现有 `max_upload_size` 限制）。
