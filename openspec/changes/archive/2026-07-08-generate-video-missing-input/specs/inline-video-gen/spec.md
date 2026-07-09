## ADDED Requirements

### Requirement: InlineVideoCard SHALL 支持空输入状态时提供图片 URL 和视频描述输入

当 `generate_video` 意图识别后，如果 `imageUrls` 为空且 `prompt` 为空，InlineVideoCard SHALL 显示图片 URL 输入框和视频描述文本框，用户可补充输入后点击生成按钮。

#### Scenario: 无 imageUrls 时显示 URL 输入框
- **WHEN** InlineVideoCard 接收到 `imageUrls=[]`（无参考图片）
- **THEN** 参数面板上方显示 URL 输入区
- **AND** URL 输入区包含一个空白的文本输入框，placeholder 为"输入图片 URL…"
- **AND** 输入有效 URL 后右侧实时显示缩略图预览
- **AND** 用户输入 URL 后自动追加空行，最多支持 9 个输入行
- **AND** 支持粘贴换行/逗号分隔的多个 URL 自动拆分

#### Scenario: 无 prompt 时显示描述输入框
- **WHEN** InlineVideoCard 接收到 `prompt=null` 或 `prompt=""`
- **THEN** 参数面板上方显示视频描述输入 textarea
- **AND** textarea placeholder 为"描述希望生成的视频内容…（可选）"
- **AND** textarea 最小高度 2 行，最多 4 行自动伸缩

#### Scenario: 从输入框取值生成
- **WHEN** 用户点击 [生成视频] 按钮
- **THEN** `handleGenerate` 从 input state（而非 prop）取 URL 列表和描述文本
- **AND** 组装 POST 参数时 `image_urls` 为输入框的 URL 列表，`prompt` 为输入框的描述文本
- **AND** 后续 SSE 流式生成流程不变

#### Scenario: 输入值优先级高于 prop
- **WHEN** `imageUrls` prop 非空（有 ChatInput 附件传入的图片）
- **THEN** 不显示 URL 输入框（已有图片）
- **AND** 生成时取 prop 的 imageUrls
- **WHEN** `prompt` prop 非空（意图识别带回了 video_prompt）
- **THEN** 不显示描述输入框
- **AND** 生成时取 prop 的 prompt

## MODIFIED Requirements

### Requirement: InlineVideoCard SHALL 自包含视频生成生命周期

（以下场景为原有内容的新增或修改）

#### Scenario: 渲染 InlineVideoCard（修改）
- **WHEN** ChatBubble 收到 INTENT_RECEIVED action，intent 为 `generate_video` 或 `text_to_video`
- **THEN** 渲染 InlineVideoCard 在聊天气泡内
- **AND** Card 显示图片缩略图（如有 image_urls）
- **AND** **当 imageUrls 为空时显示 URL 输入框**
- **AND** **当 prompt 为空时显示描述输入框**
- **AND** 参数面板默认折叠，显示默认参数值
- **AND** 显示 [生成视频] 按钮

#### Scenario: 无 image_urls 时不显示图片编辑区（修改）
- **WHEN** intent 为 `text_to_video` 且无 image_urls
- **THEN** InlineVideoCard **显示 URL 输入框（供用户补充参考图片）**
- **AND** 显示 prompt 预览 + 描述输入框 + 参数面板 + 生成按钮
