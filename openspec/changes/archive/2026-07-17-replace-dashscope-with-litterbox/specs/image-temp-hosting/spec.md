## ADDED Requirements

### Requirement: 上传图片后返回公网可访问的图片直链

系统 SHALL 在用户上传图片后，将图片同步到免费临时图床 litterbox，并在响应的 `oss_url` 字段返回公网可访问的图片直链。该直链 SHALL 同时用于前端消息气泡展示和模型（qwen-image / 视频模型）推理。

#### Scenario: 上传图片返回公网直链
- **WHEN** 用户通过 `POST /api/v1/upload` 上传一张图片
- **THEN** 响应的 `files[0].oss_url` SHALL 为 `https://` 开头的公网图片直链
- **AND** 该直链 SHALL 可通过公网 GET 访问且 content-type 为图片类型

#### Scenario: 公网直链用于消息气泡展示
- **GIVEN** 上传返回的 `oss_url` 为公网直链
- **WHEN** 前端渲染用户消息气泡缩略图
- **THEN** 图片 SHALL 能正常显示（非裂图）

#### Scenario: 公网直链用于以图生图/生视频
- **GIVEN** 上传返回的 `oss_url` 为公网直链
- **WHEN** 将该 URL 作为 `image_url` 传给 qwen-image 或视频模型
- **THEN** 模型 SHALL 能通过公网拉取该图片完成推理
- **AND** 不依赖 `X-DashScope-OssResourceResolve` 解析头

#### Scenario: 图床上传失败不阻塞主流程
- **WHEN** litterbox 上传失败或超时
- **THEN** 主上传接口 SHALL 仍返回成功
- **AND** `oss_url` SHALL 为 null
- **AND** 前端 SHALL 回退使用本地 URL 展示
