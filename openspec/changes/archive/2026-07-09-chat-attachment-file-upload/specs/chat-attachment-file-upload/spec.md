## ADDED Requirements

### Requirement: 上传附件 — 文件选取与拖拽

点击 📎 附件后在输入框容器内部上沿展开文件上传区域，支持点击选择文件和拖拽文件两种方式。文件上传区域取代原有的 URL 输入框。

#### Scenario: 点击触发文件选择
- **WHEN** 用户点击面板中的 📎附件
- **THEN** 面板关闭，输入框容器内部上沿展示文件上传区
- **AND** 用户可点击上传区域触发系统文件选择器
- **AND** 支持选择多个文件

#### Scenario: 拖拽文件到上传区域
- **WHEN** 用户从本地拖拽一个或多个文件到上传区域
- **THEN** 文件被接收并加入附件列表
- **AND** 上传区域视觉反馈（拖拽悬停时高亮）

#### Scenario: 拖拽非文件内容（文本/链接）
- **WHEN** 用户拖拽纯文本或 URL 到上传区域
- **THEN** 不做文件处理（不触发文件上传）
- **AND** 无视觉反馈

### Requirement: 附件预览与删除

选中或拖拽文件后，在输入框容器内部上沿展示附件预览条，每个附件可单独删除。

#### Scenario: 图片附件展示缩略图
- **WHEN** 用户选中了图片文件（jpg/png/gif/webp/svg）
- **THEN** 在预览条中展示图片缩略图（使用 `URL.createObjectURL`）
- **AND** 缩略图为小方块（建议 56×56px），带圆角

#### Scenario: 非图片附件展示文件名+后缀
- **WHEN** 用户选中了非图片文件（pdf/doc/xls 等）
- **THEN** 在预览条中展示文件名和后缀
- **AND** 显示通用文件图标

#### Scenario: 删除附件
- **WHEN** 用户点击附件卡片上的 × 按钮
- **THEN** 该附件从预览条中移除
- **AND** 如果附件已上传到后端，不触发后端删除

### Requirement: 发送时文件上传 + URL 自动提取

点击发送按钮时，自动上传本地附件到后端获取 URL，同时检测 textarea 输入中的图片 URL，合并后传给 AI。

#### Scenario: 有本地附件时发送
- **WHEN** 用户点击发送
- **AND** 附件列表中有未上传的本地文件
- **THEN** 将所有本地文件上传到 `POST /api/v1/upload`
- **AND** 等待全部上传返回 URL
- **AND** 合并上传 URL + textarea 中提取的图片 URL 后调用 `onSend`

#### Scenario: 上传失败
- **WHEN** 附件上传接口返回错误
- **THEN** Toast 提示"部分附件上传失败"
- **AND** 已成功上传的文件 URL 仍随消息发送

#### Scenario: textarea 中的 URL 自动提取
- **WHEN** 用户在 textarea 中输入或粘贴了 `http://` 或 `https://` 开头的链接
- **AND** 用户点击发送
- **THEN** 系统自动检测 textarea 中的 URL（以空格/换行分隔）
- **AND** 验证 URL 格式后加入 imageUrls 列表

### Requirement: 后端文件上传接口

新增 `POST /api/v1/upload` 接口，接受 multipart/form-data 文件上传。

#### Scenario: 上传成功返回 URL
- **WHEN** 客户端通过 `multipart/form-data` 上传文件
- **THEN** 服务器保存文件到配置的上传目录
- **AND** 返回 `{ files: [{ name, url, size, mime_type }] }`
- **AND** URL 可公开访问（通过 StaticFiles 挂载）

#### Scenario: 无文件上传请求
- **WHEN** 请求体中没有文件数据
- **THEN** 返回 400 错误"未检测到上传文件"

#### Scenario: 文件保存冲突
- **WHEN** 上传的文件名与已有文件重名
- **THEN** 自动以 uuid 前缀重命名文件，不覆盖已存在文件
