## 1. useChat — 新增按钮状态清除 action

- [x] 1.1 在 ChatAction 联合类型中新增 `SET_MARKET_RESEARCH_DONE` action（含 `messageId` 字段）
- [x] 1.2 在 chatReducer 中处理该 action：将对应 message 的 `canStartMarketResearch` 置为 `false`
- [x] 1.3 从 useChat 暴露 `setMarketResearchDone(messageId)` 回调

## 2. ChatContainer — SSE result 后清除按钮

- [x] 2.1 在 `handleStartMarketResearch` 的 SSE 循环中，`event === 'result'` 处理块末尾调用 `setMarketResearchDone(msgId)`

## 3. ChatBubble — 条件启用 Markdown 渲染

- [x] 3.1 在 ChatBubble 中 import `marked`
- [x] 3.2 对 `!isUser && message.intent === 'market_research' && !isStreaming` 的消息，将 `message.content` 通过 `marked.parse()` 渲染为 HTML
- [x] 3.3 渲染容器重置 `white-space: normal`，并复用 markdown 通用样式
- [x] 3.4 non-market_research 消息保持现有 `whitespace-pre-wrap` 行为不变
