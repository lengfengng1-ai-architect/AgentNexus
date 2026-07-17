## Context

以图生图（qwen-image）和图生视频（HappyHorse r2v）此前通过公网图床传参考图。先用 DashScope instant（私有 ACL，拿不到公网 URL），后改 litterbox（公网直链，但 DashScope 国内服务器跨境访问海外节点不稳定，`Failed to download image` 400）。本质问题：**任何依赖模型端公网拉取的免费图床都不可靠**。

查阅官方文档确认：qwen-image（`docs/references/qwen-image-api.md` 第 464-484 行）与 HappyHorse r2v（`docs/references/image2video.md` 第 1160 行）的图像输入均支持 **Base64 编码内联**（`data:{MIME};base64,{data}`），图片随请求体直接发送，模型端无需公网下载。本地上传图片已存于 `uploads/` 目录，可直接读取转 Base64。

## Goals / Non-Goals

**Goals:**
- 以图生图 / 图生视频的参考图统一改 Base64 内联，消除对第三方图床与公网拉取的依赖。
- 移除 litterbox 及 `oss_url` 概念，气泡展示统一用本地 `/uploads/` URL。
- 保持上传接口与前端调用方式尽量不变。

**Non-Goals:**
- 不改动文生图 / 文生视频（无参考图）逻辑。
- 不引入新图床 / 对象存储。
- 不实现超大图压缩或分片。

## Decisions

### 1. 图像输入统一改 Base64 内联

- qwen-image：`content[].image = "data:{mime};base64,{data}"`。
- HappyHorse r2v：`media[].url = "data:{mime};base64,{data}"`。
- 后端在调模型前，将参考图（本地 `/uploads/` 文件）读出并编码。

### 2. Base64 工具函数

- 新增一个工具：输入图片的字节或本地路径 + mime，返回 `data:{mime};base64,...`。
- 参考图来源是本地 `/uploads/{safe_name}`（上传时已存），按文件名读取即可；mime 从扩展名推断（`.png→image/png`、`.jpg/.jpeg→image/jpeg`、`.webp→image/webp`）。
- 放在 `app/services/` 下（如 `image_base64.py`），供两个 agent 复用，避免重复实现。

### 3. 参考图 URL 解析

- 前端传的 `image_url` / `image_urls` 现在统一是本地 `/uploads/xxx` 路径（或完整 `BACKEND_ORIGIN/uploads/xxx`）。
- 后端工具需兼容两种形态：以 `/uploads/` 开头 → 直接读本地文件；以 `http(s)://{host}/uploads/` 开头 → 剥成 `/uploads/` 再读。
- 若读到的是外部 URL（非本服务 uploads），fallback 仍按 URL 透传（保持向后兼容，但实际链路不会再出现）。

### 4. 移除 litterbox 与 oss://

- 删除 `litterbox_upload.py` 及其测试。
- `upload.py` 不再同步图床，`oss_url` 恒为 `None`；`schemas/upload.py` 移除 `oss_url` 字段（同步改 `upload.yaml`）。
- `image_generation_agent.py` 移除 `X-DashScope-OssResourceResolve` 头；`video_generation_agent.py` 移除 `oss://` 判断与对应头。
- 前端 `handleFileSelect` 不再读 `oss_url`，统一用 `BACKEND_ORIGIN + url`。

### 5. 气泡展示用本地 URL

- 用户上传后 `imageUrls` 存本地 `/uploads/xxx`（`BACKEND_ORIGIN` 拼接），同域浏览器稳定可看，替代 litterbox。

## Risks / Trade-offs

- **[Risk]** Base64 使请求体增大约 33%，超大图可能触及模型/网关体积上限。
  - **Mitigation**: qwen-image ≤10MB、HappyHorse ≤20MB，现有 `max_upload_size`（默认 50MB）已偏宽；在 Base64 工具里按目标模型上限校验，超限抛错提示，避免发出必然失败的请求。
- **[Risk]** 历史消息中残留 litterbox / oss:// URL 无法转 Base64。
  - **Mitigation**: 工具对非本服务 uploads 的 http(s) URL 直接透传（向后兼容）；这些旧链接本就无法再用于推理，属可接受的历史数据。
- **[Trade-off]** 放弃图床换取零外部依赖：实现更简单、更稳定，但图片不再具备独立公网分享链接。
  - MVP 阶段图片仅供对话内展示与推理，无需独立分享，可接受。
