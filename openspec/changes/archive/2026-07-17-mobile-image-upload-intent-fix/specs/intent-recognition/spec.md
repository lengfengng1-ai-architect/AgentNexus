## ADDED Requirements

### Requirement: 用户消息气泡显示上传的图片缩略图

系统 SHALL 在用户发送的消息气泡中展示 `imageUrls` 列表中的图片缩略图。单图宽度 SHALL 限制在气泡内并保持圆角；多图 SHALL 垂直堆叠展示。

#### Scenario: 用户上传单张图片
- **GIVEN** 用户通过 + 号面板上传一张图片并成功返回 URL
- **WHEN** 消息气泡渲染
- **THEN** 该用户消息气泡 SHALL 显示一张缩略图
- **AND** 图片宽度 SHALL 不超过气泡宽度
- **AND** 图片 SHALL 保持圆角

#### Scenario: 用户上传多张图片
- **GIVEN** 用户通过 + 号面板上传多张图片并成功返回 URL 列表
- **WHEN** 消息气泡渲染
- **THEN** 该用户消息气泡 SHALL 按顺序垂直显示多张缩略图

## MODIFIED Requirements

### Requirement: 意图识别 Agent 可以判断用户输入的意图

系统 SHALL 提供一个 `intent_recognition` Agent 节点，接收用户消息和当前上下文，输出用户意图、置信度、直接回复文案、提取的品牌字段、缺失字段和已更新字段。当上下文中包含 `image_urls` 时，意图识别 SHALL 优先进入图片/视频生成相关意图；当用户未输入文字且存在 `image_urls` 时，SHALL 默认进入 `text_to_image` 并引导用户生成宣传图。

#### Scenario: 用户上传图片且未输入文字
- **GIVEN** 用户上传图片附件
- **AND** 用户未输入文字消息
- **AND** 上下文中包含 `image_urls`
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `text_to_image`
- **AND** `image_url` SHALL 为第一张图片 URL
- **AND** `reply` SHALL 引导用户生成宣传图
- **AND** `confidence` SHALL ≥ 0.8

#### Scenario: 用户上传图片并要求生成视频
- **GIVEN** 用户上传图片附件
- **AND** 用户输入"把这张图做成视频"
- **AND** 上下文中包含 `image_urls`
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `generate_video`
- **AND** `image_url` SHALL 从附件元数据提取
- **AND** `video_prompt` SHALL 从用户输入提取
- **AND** `confidence` SHALL ≥ 0.8

#### Scenario: 用户上传图片并要求生成图片
- **GIVEN** 用户上传图片附件
- **AND** 用户输入"基于这张图生成海报"
- **AND** 上下文中包含 `image_urls`
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `text_to_image`
- **AND** `image_url` SHALL 从附件元数据提取
- **AND** `generation_prompt` SHALL 从用户输入提取
- **AND** `confidence` SHALL ≥ 0.8
