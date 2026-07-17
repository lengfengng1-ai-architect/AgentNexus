## Context

聊天附件上传后，后端会把图片同步到云端供模型推理。当前用 DashScope 临时存储，返回 `oss://` URL。经实测（getPolicy 真实返回）：DashScope instant 上传的 policy 条件写死 `x-oss-object-acl: private`，且只返回 `oss_access_key_id`（无 secret），无法生成公开签名 URL。因此 `oss://` 既不能在浏览器展示，也只能靠 DashScope 内部解析头供模型用，带来"展示/模型 URL 必须拆分"的复杂度。本项目不公网部署，后端本地 `/uploads/` 也不能作为公网图源。

经对多个免费图床实测上传：
- **litterbox**（catbox.moe 临时存储）：返回图片直链 `https://litter.catbox.moe/xxx.png`，content-type 正确，qwen-image 可拉取，72h 过期，免 API key，1GB 上限。
- catbox 永久版：被反爬（412 Invalid uploader）。
- 0x0.st：网络不通。
- tmpfiles：返回页面链接需二次转换，且只存 1h。

## Goals / Non-Goals

**Goals:**
- 上传图片后得到一个公网可访问的图片直链，同时用于前端展示和模型推理（一张图一个 URL）。
- 移除 DashScope 上传依赖及 `oss://` 特殊处理。
- 保持 `upload` 接口响应字段结构不变（`oss_url` 复用），前端改动最小。

**Non-Goals:**
- 不引入付费/自建对象存储。
- 不实现图片永久保存。
- 不改动生成模型本身的 API key 配置。

## Decisions

### 1. 选用 litterbox 作为临时图床

- 免费、免鉴权、返回直链、72h 过期、content-type 正确，qwen-image 可拉取。
- 备选 tmpfiles 只存 1h 且需二次转换直链，不满足"宣传短片"等较长生成链路。

### 2. 新增 `litterbox_upload.py` 服务

- 仿照 `dashscope_upload.py` 结构，但更简单：单次 POST `https://litterbox.catbox.moe/resources/internals/api.php`，`data={'reqtype':'fileupload','time':'72h'}`，`files={'fileToUpload': (filename, bytes)}`。
- 成功返回纯文本 URL，校验其以 `http` 开头后返回；失败抛异常。
- 72h 过期窗口覆盖图片/视频生成链路。

### 3. 上传路由复用 `oss_url` 字段

- `upload.py` 中将 `oss_url` 填为 litterbox 直链，字段名与响应结构不变。
- 前端 `ScreenChat.handleFileSelect` 现有 `item.oss_url ?? 本地url` 逻辑自动拿到直链，无需改前端取值；仅需把"本地 url 兜底"和注释更新，并确认同一 URL 既展示又传模型。
- `schemas/upload.py` 的 `oss_url` description 更新为公网直链语义。

### 4. 移除 DashScope 上传链路

- 删除 `dashscope_upload.py`。
- `upload.py` 不再 import / 调用它，不再捕获其异常。
- 以图生图/生视频的 `X-DashScope-OssResourceResolve` 头仅在 `oss://` 时需要，公网直链无需该头；相关代码保留对非 oss:// 透传即可（image_generation_agent 已有 `if image_url.startswith("oss://")` 判断，自然跳过）。

### 5. 前端展示与模型统一 URL

- 用户上传图片后，唯一 URL 既是气泡缩略图（公网可访问，不再裂图）也是 `context.image_urls` 传模型的图源。
- 不再需要 `modelImageUrls` 之类的双 URL 拆分。

## Risks / Trade-offs

- **[Risk]** litterbox 为第三方免费服务，稳定性/可用性不受控，可能被限流或关停。
  - **Mitigation**: 上传失败不阻塞主上传（`oss_url` 置 None，前端回退本地 URL 展示）；服务封装在独立模块，后续可换成其他图床或自建存储。
- **[Risk]** 72h 过期后，历史消息中的图片链接失效。
  - **Mitigation**: MVP 阶段可接受；本地 `/uploads/` 副本仍在，若需长期展示可改用本地 URL 渲染历史消息。
- **[Trade-off]** 依赖外部免费服务换取"零成本公网图源"，放弃了 DashScope 内网读取的速度优势。
  - 推理时模型从公网回源 litterbox 读图，延迟略高，但 MVP 可接受。
