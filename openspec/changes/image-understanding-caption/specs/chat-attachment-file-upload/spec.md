# Delta: chat-attachment-file-upload（上传响应新增 caption）

## MODIFIED Requirements

### Requirement: 后端文件上传接口

新增 `POST /api/v1/upload` 接口，接受 multipart/form-data 文件上传。图片文件的响应项 SHALL 额外携带 `caption` 字段（视觉模型生成的图片描述，可为 null）。

#### Scenario: 上传成功返回 URL
- **WHEN** 客户端通过 `multipart/form-data` 上传文件
- **THEN** 服务器保存文件到配置的上传目录
- **AND** 返回 `{ files: [{ name, url, size, mime_type, caption }] }`
- **AND** URL 可公开访问（通过 StaticFiles 挂载）
- **AND** 图片文件的 `caption` 为视觉模型生成的中文描述（失败时为 null），非图片文件 `caption` 为 null

#### Scenario: 无文件上传请求
- **WHEN** 请求体中没有文件数据
- **THEN** 返回 400 错误"未检测到上传文件"

#### Scenario: 文件保存冲突
- **WHEN** 上传的文件名与已有文件重名
- **THEN** 自动以 uuid 前缀重命名文件，不覆盖已存在文件
