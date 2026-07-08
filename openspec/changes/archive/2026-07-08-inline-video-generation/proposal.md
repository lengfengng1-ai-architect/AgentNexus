## Why

视频生成功能当前依赖独立 VideoTestPage 页面：对话识别到视频意图后跳转至 `/video-test`。测试节点即将取消，所有视频生成功能需直接融合进对话中，用户无需跳转页面即可完成图片上传、参数调整、视频生成和播放。

## What Changes

- **BREAKING**: ChatInput 新增 📎 附件按钮，展开行级 URL 输入（复用 VideoTestPage 的 urlRows 交互）
- **BREAKING**: ChatBubble 移除 `onNavigateVideo`/`onNavigateImage` 跳转逻辑，改为原地渲染 InlineVideoCard
- **NEW**: InlineVideoCard 自包含组件 — 图片增删 → 参数面板（折叠）→ 生成按钮 → SSE 进度条 → 视频播放器
- **MODIFIED**: `ChatMessage` 类型扩展 `videoResult` 字段，持久化生成结果
- **REMOVED**: ChatContainer 中 `handleNavigateVideo`/`handleNavigateImage` 跳转处理
- **REMOVED**: VideoTestPage 页面引用（保留文件供参考，路由待后续删除）

## Capabilities

### New Capabilities

- `inline-video-gen`: 对话内嵌视频生成，支持附件 URL 输入、参数调整、SSE 流式进度、内联播放+全屏

### Modified Capabilities

- `video-generation`: 前端交互从独立页面改为对话内嵌，SSE 流式接口和后端逻辑不变

## Impact

- `frontend/src/types/chat.ts` — ChatMessage 新增 `videoResult` 字段
- `frontend/src/components/ChatInput.tsx` — 新增 📎 附件栏（urlRows 行级输入）
- `frontend/src/components/ChatBubble.tsx` — 渲染 InlineVideoCard，移除跳转
- `frontend/src/components/ChatContainer.tsx` — 移除导航处理
- `frontend/src/components/InlineVideoCard.tsx` — 新组件
- `frontend/src/hooks/useChat.ts` — INTENT_RECEIVED 支持 image_urls 传递

