## MODIFIED Requirements

### Requirement: 系统 SHALL 支持图生视频

系统 SHALL 根据用户提供的图片 URL（和可选的文字描述），调用 HappyHorse R2V 模型生成动态短视频，支持 1-9 张参考图片。

#### Scenario: 图生视频标准流程
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体含有效 `image_urls`
- **THEN** 系统 SHALL 调用 HappyHorse R2V 模型创建任务，`media[].type` 为 `reference_image`
- **AND** 通过 SSE 流式返回进度和结果

#### Scenario: 纯图生视频（无 prompt）
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体中不含 `prompt` 但含有效 `image_urls`
- **THEN** 系统 SHALL 调用 HappyHorse R2V 模型创建任务（仅使用参考图片）
- **AND** 通过 SSE 流式返回进度和结果

#### Scenario: 图+文生成视频
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体含有效 `image_urls` 和 `prompt`
- **THEN** 系统 SHALL 调用 HappyHorse R2V 模型，参考图片 + prompt 生成视频
- **AND** 通过 SSE 流式返回进度和结果

### Requirement: 系统 SHALL 校验 prompt 和 image_urls 至少提供一个

POST /api/v1/video/generate 的请求体中，prompt 为可选字段，但必须与 image_urls 至少提供一个。

#### Scenario: prompt 和 image_urls 均缺失
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体中既无 `prompt` 也无 `image_urls`
- **THEN** 系统 SHALL 返回 422 Validation Error
- **AND** 错误信息提示 "prompt 和 image_urls 至少提供一个"

#### Scenario: 多图生视频标准流程
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体含 `image_urls: ["url1", "url2", "url3"]`
- **THEN** 系统 SHALL 调用 HappyHorse R2V 模型创建任务
- **AND** 请求体中 `input.media` SHALL 包含对应数量的 `reference_image` 条目

#### Scenario: 超过 9 张图片
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体含 `image_urls` 超过 9 个元素
- **THEN** 系统 SHALL 返回 422 Validation Error，提示最多支持 9 张图片

## REMOVED Requirements

### Requirement: 系统 SHALL 在 POST /api/v1/video/generate 的请求体中含 image_url 时 SHALL 使用 first_frame

**Reason**: HappyHorse I2V 下 `first_frame` 只允许 1 张，多图场景全部失败。切换为 R2V 后 `media[].type` 改为 `reference_image`。
**Migration**: 多图场景下 `media[].type` 从 `first_frame` 改为 `reference_image`，模型从 I2V 切换为 R2V。

## ADDED Requirements

### Requirement: R2V 图生视频模型可配置

系统 SHALL 通过 `DASHSCOPE_R2V_MODEL` 配置项指定图生视频模型，默认 `happyhorse-1.1-r2v`，不在外部环境暴露具体模型名以外的敏感信息。

#### Scenario: 切换 R2V 模型
- **WHEN** 配置文件修改 DASHSCOPE_R2V_MODEL 值
- **THEN** 下次图生视频生成请求使用新模型名，无需改代码

### Requirement: YAML 描述 SHALL 反映 R2V 模型名

`docs/api/paths/video.yaml` 中 `image_urls` 字段的 description SHALL 更新为指向 HappyHorse R2V 而非 I2V。

#### Scenario: 同步 YAML 描述
- **WHEN** 图生视频模型从 I2V 切换为 R2V
- **THEN** video.yaml 中 image_urls 的 description SHALL 指向 HappyHorse R2V
