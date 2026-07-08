## ADDED Requirements

### Requirement: 视频/图片生成按钮 SHALL 有前端守卫

当 text_to_image / text_to_video / generate_video 意图返回时，前端 ChatBubble 的生成按钮 SHALL 仅在有效生成描述存在时才显示。

#### Scenario: text_to_image 有 generation_prompt 时显示按钮
- **WHEN** 消息 intent 为 `text_to_image` 且 `generationPrompt` 长度 > 3
- **THEN** 显示 [生成图片] 按钮

#### Scenario: text_to_image 无 generation_prompt 时不显示按钮
- **WHEN** 消息 intent 为 `text_to_image` 但 `generationPrompt` 为空或长度 ≤ 3
- **THEN** 不显示 [生成图片] 按钮

#### Scenario: text_to_video 有 generation_prompt 时显示按钮
- **WHEN** 消息 intent 为 `text_to_video` 且 `generationPrompt` 长度 > 3
- **THEN** 显示 [生成视频] 按钮

#### Scenario: generate_video 有 image_url 时显示按钮
- **WHEN** 消息 intent 为 `generate_video` 且 `imageUrl` 存在
- **THEN** 显示 [生成视频] 按钮
