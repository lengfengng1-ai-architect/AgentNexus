## Why

当生成 `generate_video` 意图且缺少 `image_url`（用户没有传图片）和 `video_prompt`（用户只说"我要生成视频"）时，InlineVideoCard 渲染为仅显示参数面板和生成按钮。用户无法在 Card 内补充图片 URL 或视频描述，回复文本"您可以将图片上传给我"是死胡同——页面上没有对应的上传/输入控件。体验断点，用户不知道下一步该怎么操作。

## What Changes

- **InlineVideoCard 新增"空输入"状态处理**：当 `imageUrls` 为空时显示图片 URL 输入框；当 `prompt` 为空时显示视频描述文本输入框。
- **生成时取输入框的值**：用户输入的 URL 和描述文本在点击生成按钮时传入 API。
- **无后端改动**：SSE 接口和意图识别逻辑不变。

## Capabilities

### New Capabilities
- 无新 capability

### Modified Capabilities
- `inline-video-gen`: 新增 Requirement「InlineVideoCard SHALL 支持空输入状态时提供图片 URL 和视频描述输入」，对应新的 Scenario。

## Impact

- **Frontend**: 仅修改 `InlineVideoCard.tsx`，在卡片内部增加 URL 输入行和 textarea 输入行
- **Backend**: 无改动
- **API**: 无改动
- **Spec**: `specs/inline-video-gen/spec.md` 新增一条 Requirement + scenarios
