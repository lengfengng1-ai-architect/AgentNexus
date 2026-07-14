## Why

当前 ① 对话入口屏底部的「产品海报」和「产品视频」快捷按钮点击后，只是将模板文本填入输入框让用户手动发送。后端 Agent 可能将含模板文本的消息识别为 `generate_plan` intent（而非 `text_to_image` / `generate_video`），导致 ChatBubble 显示「生成方案」按钮而非内联图片/视频参数面板，点击后导航到 ② 简报页——用户期望的是在对话入口页原地展开图片/视频生成参数。

## What Changes

- **「产品海报」按钮改为直接注入一条虚拟 AI 消息**，携带 `text_to_image` intent 和空 `generationPrompt`，在对话流中原地展开 InlineImageCard（已有组件）。
- **「产品视频」按钮改为直接注入一条虚拟 AI 消息**，携带 `generate_video` intent 和空 `videoPrompt`，在对话流中原地展开 InlineVideoCard（已有组件）。
- **useChat hook 新增 `addVirtualMessage` 方法**，用于在前端本地构造 AI 消息（不经后端 SSE）。
- **ScreenChat 不再用模板文本填充输入框**，而是调用 `addVirtualMessage`。

不涉及：后端、ChatBubble 组件、InlineImageCard/InlineVideoCard 组件、路由跳转逻辑。

## Capabilities

### New Capabilities
- `chat-inline-media`: 对话入口页直接展开图片/视频生成参数面板，支持原地配置、生成、展示结果，不跳转页面。基于已有的 InlineImageCard / InlineVideoCard 组件在气泡内渲染。

### Modified Capabilities
- `brand-input`（`brand-input`）: 快捷按钮「产品海报」「产品视频」的行为从"填写输入框模板"改为"直接注入虚拟消息展示内联卡片"。

## Impact

- **前端文件**：
  - `frontend/src/hooks/useChat.ts` — 新增 `addVirtualMessage` dispatch action 和暴露方法
  - `frontend/src/pages/mobile-workbench/ScreenChat.tsx` — 修改 `handlePosterTemplate` / `handleVideoTemplate` 行为
- **无后端改动**、**无组件改动**、**无 CSS 改动**
- 虚拟消息不保存到 localStorage（类似流式消息的生命周期），刷新后丢失，不影响历史记录
