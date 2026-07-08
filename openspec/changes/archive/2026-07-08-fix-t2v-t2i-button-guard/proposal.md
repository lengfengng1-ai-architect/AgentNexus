## Why

当前 text_to_image / text_to_video 的生成按钮只依赖 intent 类型判断是否显示，没有校验 generation_prompt / video_prompt 是否有实际内容。当 LLM 返回 text_to_image 但 generation_prompt 为空或为 LLM 回复文案时，按钮仍然显示，点击后使用 LLM 的回复文案（"请描述一下您希望生成什么样的图片..."）作为提示词去调用图片生成 API，产生错误生成结果。

需要在前端 ChatBubble 组件加一道守卫：按钮仅在存在有效生成描述时才显示，handleNavigate 不再 fallback 到 message.content。

## What Changes

- **ChatBubble.tsx**：按钮显示条件增加 `generationPrompt` / `videoPrompt` / `imageUrl` 非空校验
- **ChatBubble.tsx**：`handleNavigate` 移除 `|| message.content` 的 fallback，无有效 prompt 时不跳转

## Capabilities

### New Capabilities
无

### Modified Capabilities
- `video-generation`: 生成类意图的按钮增加前端守卫，仅在有效描述存在时才可点击

## Impact

- 仅修改 `frontend/src/components/ChatBubble.tsx`，约 5-10 行
- 无后端变更、无 schema 变更、无 API 变更
