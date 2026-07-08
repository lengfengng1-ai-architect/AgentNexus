## MODIFIED Requirements

### Requirement: 意图识别 Agent 可以判断用户输入的意图

系统 SHALL 提供一个 `intent_recognition` Agent 节点，接收用户消息和当前上下文，输出用户意图、置信度、直接回复文案、提取的品牌字段、缺失字段和已更新字段。

#### Scenario: 用户说"我要生成图片"（无具体描述）
- **GIVEN** 用户输入"我要生成图片"或"帮我生成一张图片"
- **AND** 输入中不包含具体的场景/主题/风格描述
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `chat`
- **AND** `reply` SHALL 询问用户希望生成什么样的图片（风格、主题、场景等）

#### Scenario: 用户提供具体图片描述
- **GIVEN** 用户输入"帮我画一张赛博朋克风格的海报"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `text_to_image`
- **AND** `generation_prompt` SHALL 从用户输入提取完整描述

#### Scenario: 用户说"生成视频"（无具体描述）
- **GIVEN** 用户输入"生成视频"或"帮我生成一段视频"
- **AND** 输入中不包含具体的场景/主题/风格描述
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `chat`
- **AND** `reply` SHALL 询问用户希望生成什么样的视频（内容、风格、场景等）

#### Scenario: 用户提供具体视频描述
- **GIVEN** 用户输入"帮我用文字生成一段夕阳海滩的视频"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `text_to_video`
- **AND** `generation_prompt` SHALL 从用户输入提取完整描述
