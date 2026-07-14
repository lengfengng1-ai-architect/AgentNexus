# Capability: mobile-chat-session

## MODIFIED Requirements

### Requirement: "产品海报"按钮 SHALL 直接注入虚拟 AI 消息

点击"产品海报"时，SHALL 不再填入输入框模板，而是直接注入虚拟 AI 消息，在对话流中展开 InlineImageCard。

#### Scenario: 点击产品海报注入虚拟消息
- **WHEN** 用户点击"产品海报"按钮
- **THEN** 对话流 SHALL 追加一条用户消息，内容为 `"帮我生成一张产品海报图片"`
- **AND** 对话流 SHALL 追加一条 AI 消息，携带 intent `text_to_image` 和空的 generationPrompt
- **AND** 输入框 SHALL 保持不变（不被填充）
- **AND** ChatBubble SHALL 在 AI 消息气泡内渲染 InlineImageCard

### Requirement: "产品视频"按钮 SHALL 直接注入虚拟 AI 消息

点击"产品视频"时，SHALL 不再填入输入框模板，而是直接注入虚拟 AI 消息，在对话流中展开 InlineVideoCard。

#### Scenario: 点击产品视频注入虚拟消息
- **WHEN** 用户点击"产品视频"按钮
- **THEN** 对话流 SHALL 追加一条用户消息，内容为 `"帮我生成一条宣传视频"`
- **AND** 对话流 SHALL 追加一条 AI 消息，携带 intent `generate_video` 和空的 videoPrompt/imageUrls
- **AND** 输入框 SHALL 保持不变（不被填充）
- **AND** ChatBubble SHALL 在 AI 消息气泡内渲染 InlineVideoCard
- **AND** InlineVideoCard SHALL 显示 URL 输入框和视频描述输入框供用户补充
