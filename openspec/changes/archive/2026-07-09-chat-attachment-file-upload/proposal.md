## Why

当前附件功能仅支持粘贴图片 URL，交互方式单一。用户期望能够选择本地文件上传（点击选择/拖拽），并在输入框内部上沿预览附件（图片展示缩略图、文件展示文件名+后缀）。同时保留从 textarea 输入内容中自动识别 URL 的能力。改善输入体验，降低图片/文件的使用门槛。

## What Changes

- 移除现有的 URL 输入栏（多行 URL input + ThumbnailPreview），替换为文件上传区（点击选择+拖拽上传）
- 新增后端文件上传接口 `POST /api/v1/upload`，接受 multipart/form-data，返回可访问的 URL
- 前端用 `URL.createObjectURL()` 实现文件选中后即时本地预览
- 发送时：上传本地文件到后端获取线上 URL + 自动检测 textarea 中的图片 URL → 合并后传给 `onSend`
- 附件预览条展示在输入框容器内部上沿：图片缩略图 / 文件名+后缀，每个文件可删除
- **BREAKING**: `ChatInputProps.onSend` 签名保持 `(imageUrls?: string[])` 不变，但 `imageUrls` 的来源变为：上传文件 URL + textarea 自动提取的 URL

## Capabilities

### New Capabilities

- `chat-attachment-file-upload`: 聊天附件支持本地文件上传+预览，替换原有 URL 输入模式

### Modified Capabilities

- `chat-input-plus-menu`: 📎附件功能从 URL 输入框改为文件上传+预览
  - Requirement: 📎附件 — 贴图 URL 输入 → 改为 文件上传+预览+URL自动提取
  - Requirement: 附件预览条在输入框内部上沿展示

## Impact

- 前端 `ChatInput.tsx`：大改附件区域，移除 urlRows/ThumbnailPreview，新增文件上传/预览/删除
- 前端 `ChatContainer.tsx`：onSend 签名不变，但 imageUrls 来源变化（含上传 URL）
- 新增 `backend/app/routers/upload.py`：文件上传接口
- 修改 `backend/app/main.py`：注册 upload router + 挂载 StaticFiles 到 `/uploads`
- 修改 `backend/app/config/settings.py`：新增 `UPLOAD_DIR` 配置
- 新增 `docs/api/paths/upload.yaml`：上传接口 OpenAPI spec
- 不涉及数据库变更
