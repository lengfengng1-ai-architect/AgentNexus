## MODIFIED Requirements

### MODIFIED Requirement: 意图识别 Agent 可以判断用户输入的意图

系统 SHALL 提供一个 `intent_recognition` Agent 节点，接收用户消息和当前上下文，输出用户意图、置信度、直接回复文案、提取的品牌字段、缺失字段和已更新字段。

#### Scenario: 用户想用文本生成视频
- **GIVEN** 用户输入"帮我生成一段夕阳海滩的短视频"
- **AND** 上下文中不含 `image_url`
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `text_to_video`
- **AND** `generation_prompt` SHALL 提取用户描述
- **AND** `confidence` SHALL ≥ 0.8

#### Scenario: 用户想用文本生成图片
- **GIVEN** 用户输入"帮我画一张赛博朋克风格的海报"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `text_to_image`
- **AND** `generation_prompt` SHALL 提取用户描述
- **AND** `confidence` SHALL ≥ 0.8

### MODIFIED Requirement: 意图识别输出使用统一结构化 Schema

系统 SHALL 使用 Pydantic schema `IntentRecognitionOutput` 约束 `intent_recognition` 节点的输出，字段包括 `intent`、`confidence`、`reply`、`brand_input`、`missing_fields`、`updated_fields`、`generation_prompt`。

#### Scenario: 输出结构校验
- **WHEN** `intent_recognition` 节点返回结果
- **THEN** 结果 SHALL 能通过 `IntentRecognitionOutput` 校验
- **AND** `intent` SHALL 为 `generate_plan`、`query_data`、`chat`、`clarify`、`update_context`、`generate_video`、`text_to_video`、`text_to_image` 之一
- **AND** `confidence` SHALL 在 0.0 到 1.0 之间
