# Delta: image-caption（新增 capability）

## ADDED Requirements

### Requirement: 上传图片时 SHALL 同步生成图片描述 caption

`POST /api/v1/upload` 保存图片文件后，SHALL 调用视觉模型（qwen-vl-plus）为每个图片生成 1-2 句中文客观描述 caption（主体/颜色/构图/风格），并在响应 `UploadFileItem.caption` 中返回。多图上传时 SHALL 并发生成。非图片文件（MIME 非 image/*）SHALL 不生成 caption（返回 null）。

#### Scenario: 单图上传返回 caption
- **WHEN** 客户端上传一张跑鞋产品图
- **THEN** 响应 `files[0].caption` SHALL 为一段中文描述（如"一双红色跑鞋，白底，侧面视角，电商产品摄影风格"）
- **AND** caption SHALL 不包含编造的品牌名

#### Scenario: 多图上传并发生成
- **WHEN** 客户端一次上传 3 张图片
- **THEN** 3 张图片的 caption SHALL 并发生成
- **AND** 每个 file 项 SHALL 各自携带 caption

#### Scenario: 非图片文件不生成 caption
- **WHEN** 客户端上传 PDF/DOCX 等非图片文件
- **THEN** 该项 `caption` SHALL 为 null
- **AND** 不调用视觉模型

### Requirement: caption 生成失败 SHALL 降级不阻塞上传

视觉模型调用失败或超时（20 秒）时，SHALL 将该图片的 caption 置为 null 并记录警告日志，上传接口仍返回 200，不影响文件保存与 URL 返回。

#### Scenario: VL 调用超时
- **WHEN** 视觉模型调用超过 20 秒未返回
- **THEN** 该图片 `caption` SHALL 为 null
- **AND** 上传接口 SHALL 正常返回 200 与文件 URL

#### Scenario: VL 调用返回错误
- **WHEN** 视觉模型返回 4xx/5xx 错误
- **THEN** 该图片 `caption` SHALL 为 null
- **AND** 上传接口 SHALL 正常返回 200
