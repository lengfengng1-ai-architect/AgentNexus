## Why

当前聊天附件上传后将图片同步到 DashScope 临时存储，返回 `oss://` URL 用于模型推理。但 DashScope instant 存储经实测为私有 ACL（getPolicy policy 写死 `x-oss-object-acl: private`），无法生成公网可访问的 https URL，导致：用户上传的图片在消息气泡中无法显示（`oss://` 浏览器打不开），且必须区分"展示 URL"和"模型 URL"，增加复杂度。本项目为本地项目、不公网部署，后端本地 `/uploads/` 静态路径也不能作为模型推理的公网图源。

需要替换为免费、免鉴权、返回公网直链的临时图床。经实测 litterbox（catbox.moe 临时存储）返回图片直链、72h 过期、免 API key、qwen-image 可直接拉取，完全满足需求。

## What Changes

- 新增后端服务 `litterbox_upload.py`：上传图片到 litterbox，返回公网直链（`https://litter.catbox.moe/xxx.png`）。
- 修改 `upload.py` 路由：`oss_url` 字段改填 litterbox 公网直链（复用字段，前端无需改动取 URL 逻辑）。
- 移除 `dashscope_upload.py` 及其在上传链路中的调用；`dashscope_api_key` 在上传链路不再使用（生成模型本身的 key 保留）。
- 前端 `ScreenChat.handleFileSelect` 拿到的 URL 同时作为展示与模型推理 URL（一张图一个 URL），移除对 `oss://` 的特殊偏好处理。
- 以图生图/生视频将公网直链传给模型；移除 `X-DashScope-OssResourceResolve` 依赖（公网 URL 无需解析头）。
- 更新 `docs/api/paths/upload.yaml` 中 `oss_url` 字段语义为"公网可访问的临时图片直链（litterbox，72h 有效）"。

## Capabilities

### New Capabilities

- `image-temp-hosting`: 聊天附件图片上传到免费临时图床 litterbox，生成公网可访问的图片直链，供前端展示与 qwen-image / 视频模型推理使用。

### Modified Capabilities

- `chat-attachment-file-upload`（后端文件上传接口）：上传后同步到临时图床，`oss_url` 语义由"DashScope oss:// URL"改为"公网临时图片直链"。
- `inline-image-gen` / `inline-video-gen`：模型输入图片改为公网直链，移除 oss:// 解析头依赖。

## Impact

- 后端：新增 `app/services/litterbox_upload.py`；修改 `app/routers/upload.py`、`app/schemas/upload.py`；删除 `app/services/dashscope_upload.py`。
- 前端：`frontend/src/pages/mobile-workbench/ScreenChat.tsx` 上传 URL 处理简化。
- 配置：上传链路不再依赖 `dashscope_api_key`。
- Mock 数据：无需新增。
- API 契约：`upload.yaml` 中 `oss_url` 字段语义更新（字段名保留，description 更新）。

## Non-goals

- 不引入自建图床或付费对象存储（OSS/COS）。
- 不改变生成模型本身的鉴权配置（`dashscope_api_key`/`myself_api_key` 在生成链路保留）。
- 不实现图片永久存储（litterbox 72h 过期已满足推理窗口）。
