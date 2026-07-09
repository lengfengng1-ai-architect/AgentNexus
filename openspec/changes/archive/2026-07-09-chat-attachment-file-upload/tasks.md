## 1. 后端文件上传接口

- [x] 1.1 在 `backend/app/config/settings.py` 新增 `UPLOAD_DIR: str = "uploads"` 配置
- [x] 1.2 创建 `backend/app/schemas/upload.py` — 上传响应 schema（`UploadFileItem` + `UploadResponse`）
- [x] 1.3 创建 `backend/app/routers/upload.py` — `POST /api/v1/upload` 端点，保存文件到 uploads/，返回 URL 列表
- [x] 1.4 修改 `backend/app/main.py` — 注册 upload router + 挂载 StaticFiles 到 `/uploads`
- [x] 1.5 创建 `docs/api/paths/upload.yaml` — 上传接口 OpenAPI 3.1 规范

## 2. 前端 ChatInput 附件改造 — 文件上传+预览

- [x] 2.1 定义 `Attachment` interface（id/file/preview/type/name/remoteUrl）
- [x] 2.2 移除 `urlRows`/`normalizeUrl`/`handleUrlRowChange`/`removeUrlRow`/`handleUrlRowPaste`/`ThumbnailPreview` 相关代码
- [x] 2.3 新增 `attachments` state + `handleFileSelect`（`<input type="file">` 选择的文件添加到附件列表）
- [x] 2.4 实现拖拽上传：`onDragOver`/`onDrop` 处理文件
- [x] 2.5 实现附件预览条（flex row，图片缩略图/文件名+后缀，× 删除按钮）
- [x] 2.6 实现 `handleSend` 改造：上传未远程文件 → 提取 textarea URL → 合并调用 `onSend`
- [x] 2.7 更新测试文件，删除 URL 输入相关测试，新增文件上传/预览/删除测试

## 3. 验证

- [x] 3.1 启动后端，用 curl/浏览器测试上传接口
- [x] 3.2 前端测试全部通过（25 tests）
- [ ] 3.3 手动测试：点击📎附件 → 选文件 → 预览 → 删除 → 发送
