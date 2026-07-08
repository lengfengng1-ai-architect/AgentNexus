## MODIFIED Requirements

### Requirement: 系统 SHALL 支持多图生视频

系统 SHALL 支持 1~9 张图片 URL 作为 I2V 的参考帧输入，调用 HappyHorse I2V 模型的多帧能力。

#### Scenario: 多图生视频标准流程
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体含 `image_urls: ["url1", "url2", "url3"]`
- **THEN** 系统 SHALL 调用 HappyHorse I2V 模型创建任务
- **AND** 请求体中 `input.media` SHALL 包含对应数量的 first_frame 条目
- **AND** 通过 SSE 流式返回进度和结果

#### Scenario: 单图生视频（后向兼容）
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体含 `image_urls: ["url1"]`
- **THEN** 系统 SHALL 调用 HappyHorse I2V 模型创建任务
- **AND** 行为与之前单图模式完全一致

#### Scenario: 超过 9 张图片
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体含 `image_urls` 超过 9 个元素
- **THEN** 系统 SHALL 返回 422 Validation Error，提示最多支持 9 张图片

#### Scenario: image_urls 为空数组
- **WHEN** 用户提交 `POST /api/v1/video/generate`，请求体含 `image_urls: []` 且无 `prompt`
- **THEN** 系统 SHALL 返回 422 Validation Error

### Requirement: 视频测试页 SHALL 支持多图输入和预览

VideoTestPage SHALL 支持输入多个图片 URL，并动态渲染缩略图预览。

#### Scenario: 多行输入渲染缩略图
- **WHEN** 用户在图片 URL 输入区域粘贴或输入多个 URL（每行一个）
- **THEN** 系统 SHALL 实时解析每行内容为独立 URL
- **AND** 动态渲染对应数量的 `<img>` 缩略图
- **AND** 图片加载失败时显示占位符

#### Scenario: 对话跳转传递多 URL
- **WHEN** 对话识别 `generate_video` 意图且 `imageUrls` 包含多个 URL
- **THEN** 系统 SHALL 在 URL query 中用逗号分隔传递
- **AND** VideoTestPage 自触发时根据逗号分隔解析为多图

#### Scenario: 多图时按钮守卫
- **WHEN** 用户已输入至少 1 个有效图片 URL
- **THEN** [生成视频] 按钮 SHALL 可用（即使 prompt 为空）
