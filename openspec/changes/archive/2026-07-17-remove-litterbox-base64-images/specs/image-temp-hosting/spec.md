## MODIFIED Requirements

### Requirement: 上传图片后返回公网可访问的图片直链

系统 SHALL 不再将上传图片同步到第三方图床。上传图片保存到本地 `uploads/` 目录后，响应仅返回本地可访问的 `url`。参考图在以图生图 / 图生视频时 SHALL 由后端读取本地文件并以 Base64 内联方式（`data:{MIME};base64,{data}`）传给模型，模型端无需公网下载。

#### Scenario: 上传图片返回本地 URL
- **WHEN** 用户通过 `POST /api/v1/upload` 上传一张图片
- **THEN** 响应的 `files[0].url` SHALL 为本地可访问路径（如 `/uploads/xxx.png`）
- **AND** 响应中 SHALL 不再包含第三方图床的 `oss_url`

#### Scenario: 以图生图使用 Base64 内联
- **GIVEN** 用户上传的图片已保存到本地 `uploads/`
- **WHEN** 调用 qwen-image 以图生图
- **THEN** 后端 SHALL 读取本地文件并转为 `data:{MIME};base64,{data}` 形式放入 `content[].image`
- **AND** 不依赖 `X-DashScope-OssResourceResolve` 头或公网 URL

#### Scenario: 图生视频使用 Base64 内联
- **GIVEN** 用户上传的图片已保存到本地 `uploads/`
- **WHEN** 调用 HappyHorse r2v 图生视频
- **THEN** 后端 SHALL 读取本地文件并转为 `data:{MIME};base64,{data}` 形式放入 `media[].url`
- **AND** 不依赖 `X-DashScope-OssResourceResolve` 头或公网 URL

#### Scenario: 消息气泡展示本地图片
- **GIVEN** 上传返回的 `url` 为本地路径
- **WHEN** 前端渲染用户消息气泡缩略图
- **THEN** 前端 SHALL 使用后端同域 URL 展示图片
- **AND** 图片 SHALL 能正常显示（非裂图）

## REMOVED Requirements

### Requirement: 上传图片后返回公网可访问的图片直链
**Reason**: 第三方免费图床（DashScope instant 私有 / litterbox 海外节点）均无法被国内 DashScope 服务器稳定访问，且 qwen-image 与 HappyHorse r2v 均支持 Base64 内联，无需公网托管。
**Migration**: 参考图改由后端读取本地 `uploads/` 文件并以 Base64 内联传给模型；气泡展示改用本地同域 URL。
