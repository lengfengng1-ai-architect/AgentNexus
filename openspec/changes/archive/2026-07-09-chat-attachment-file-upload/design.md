## Context

当前 ChatInput 的 📎 附件打开后显示多行 URL 输入框（urlRows + ThumbnailPreview），用户粘贴图片链接，发送时传递给 AI。这种交互不符合用户期望的"选择本地文件上传"流程。

本次改动用文件上传+拖拽替换 URL 输入框，附件预览条展示在输入框容器内部上沿。

## Goals / Non-Goals

**Goals:**
- 点击 📎 后显示文件上传区域（点击选择 + 拖拽），而非 URL 输入框
- 选中文件后即时本地预览（图片缩略图 / 文件名+后缀）
- 预览条在输入框容器（rounded-2xl border）内部上沿，flex row 可滚动
- 每个附件可单独删除
- 发送时自动将本地文件上传到后端获取线上 URL
- 保留 textarea 中输入内容的 URL 自动提取
- 新增后端 `POST /api/v1/upload` 文件上传接口
- 已上传的 plus button 高亮态联动

**Non-Goals:**
- 不实现文件类型白名单校验（MVP 接受任意类型）
- 不实现分片上传（MVP 单文件单次上传）
- 不实现文件大小限制页面提示（纯后端限制）
- 不涉及图片裁剪/压缩等预处理

## Decisions

### 1. 文件上传区替换 URL 输入栏

URL 输入框（urlRows + 相关的 state/handler/handleUrlRowChange/removeUrlRow/ThumbnailPreview）全部移除。

上传区使用一个隐藏 `<input type="file" multiple>` + 点击触发，同时 `onDragOver/onDrop` 支持拖拽。

### 2. 本地预览用 URL.createObjectURL()

文件选中后立即创建 blob URL 用于预览。图片创建 `<img>` 展示缩略图；非图片展示文件名+后缀。

```typescript
// 附件数据结构
interface Attachment {
  id: string
  file: File
  preview: string       // URL.createObjectURL(file) 或文件名标签
  type: 'image' | 'file'
  name: string
  remoteUrl?: string    // 上传后赋值
}
```

### 3. 上传时机：发送时统一上传（而非选中即传）

用户在 textarea 输入内容时，附件只占位预览不上传。点击发送时：
1. 找出所有 `remoteUrl` 为空的 attachment
2. 并行上传到 `POST /api/v1/upload`
3. 提取 textarea 中的 URL
4. 合并上传 URL + 提取的 URL → 传给 `onSend`

> 选择「发送时上传」而非「选中即上传」：避免用户选了文件又放弃发送导致无意义存储，保持交互简洁。

### 4. 后端上传接口

`POST /api/v1/upload`
- 接受 `multipart/form-data`，字段名 `files`（支持多个文件）
- 保存到 `backend/uploads/` 目录
- 返回 `{ files: [{ name, url, size, mime_type }] }`
- 通过 `StaticFiles` 挂载 `/uploads` 路径到 `backend/uploads/` 目录

### 5. 附件预览条布局

```
┌─────────────────────────────────────┐
│ 🖼️thumb│ 📄doc│ 📊sheet│            │ ← 外部不可见滚动
│ ─────────────────────────────────── │ ← 浅色分隔线
│ [+] [textarea                   ]  │  ← 输入框容器
│                                     │
└─────────────────────────────────────┘
```

- 比照现有 `showAttach` 的展示/隐藏逻辑，但内容完全替换
- 使用 `overflow-x-auto` + flex nowrap，超出时横向滚动
- 每个附件卡片：72px 高，图片展示缩略图，文件展示图标+后缀名
- 右上角 × 删除按钮

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| 大文件上传耗时，阻塞发送 | 发送时显示 loading 状态；异步上传完后自动发送 |
| 文件重名冲突 | 后端保存时加 uuid 前缀 |
| 用户重复选择相同文件 | 每个文件按 id 去重 |
| 后端 uploads/ 目录膨胀 | MVP 不做自动清理，后续加定时任务或按 session 清理 |
