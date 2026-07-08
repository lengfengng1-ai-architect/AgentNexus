## MODIFIED Requirements

### MODIFIED Requirement: 视频 SHALL 支持从对话跳转自触发

系统 SHALL 在对话识别到视频相关意图（text_to_video / generate_video）时，显示导航按钮跳转到 VideoTestPage 并自动触发。

#### Scenario: 文生视频从对话跳转
- **GIVEN** 用户输入"生成一段夕阳海滩的视频"
- **WHEN** `intent_recognition` 返回 `intent: text_to_video`
- **THEN** 聊天气泡显示 [生成视频] 按钮
- **WHEN** 用户点击按钮
- **THEN** 跳转到 `/video-test?prompt=<generation_prompt>` 页面
- **AND** VideoTestPage 自动开始文生视频（不传 image_url）

#### Scenario: 图生视频从对话跳转
- **GIVEN** 用户上传图片 + 输入"把这张图做成视频"
- **WHEN** `intent_recognition` 返回 `intent: generate_video` 且 `image_url` 有值
- **THEN** 聊天气泡显示 [生成视频] 按钮
- **WHEN** 用户点击按钮
- **THEN** 跳转到 `/video-test?prompt=<prompt>&image_url=<image_url>` 页面
- **AND** VideoTestPage 自动开始图生视频
