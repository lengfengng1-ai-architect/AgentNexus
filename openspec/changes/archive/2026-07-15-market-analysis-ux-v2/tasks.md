## 1. 后端 — drain_logs 桥接到 SSE 流

- [x] 1.1 在 `market_analysis_service.py` 中 import `drain_logs` from `app.agents.llm_utils`
- [x] 1.2 在 `analyze_stream` 的 astream_events 循环末尾，每次 event 翻译后调用 `drain_logs()` 并 yield 为 `event: log` SSE 事件

## 2. 前端 — 按钮点击即消失

- [x] 2.1 在 `ChatContainer.tsx` 的 `handleStartMarketResearch` 中，`updateMessageContent` 之后、`fetch` 之前调用 `setMarketResearchDone(msgId)`

## 3. 前端 — SSE 循环处理 event: log

- [x] 3.1 在 `ChatContainer.tsx` 的 SSE 循环中新增 `event === 'log'` 处理分支：解析 `message` 字段追加到 `progressLines`，通过 `updateMessageContent` 更新气泡文本
- [x] 3.2 progressLines 截断保留最近 50 条

## 4. 前端 — ChatBubble 滚动容器

- [x] 4.1 在 `ChatBubble.tsx` 的分析中状态（`isMarketResearch && isStreaming`）外层容器增加 `max-h-[60vh] overflow-y-auto` 样式
- [x] 4.2 确保分析完成后正常切换到 `market-report` Markdown 渲染分支
