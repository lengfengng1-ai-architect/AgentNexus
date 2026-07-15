## 1. 移动端 — 新增市场报告移动端样式

- [x] 1.1 在 `mobile-workbench.css` 中新增 `.market-report-mobile` 样式，字号降一级（h1: 16px, h2: 15px, h3: 14px，普通文本 13px）
- [x] 1.2 `.market-report-mobile` 的表格外层使用 `overflow-x: auto` 防止窄屏撑破

## 2. 移动端 — 按钮点击即消失

- [x] 2.1 在 `ScreenChat.tsx` 中 import `setMarketResearchDone`，新增 `marketResearchActiveIds` state，点击按钮时调用 `setMarketResearchDone(msgId)` + 同步 state

## 3. 移动端 — SSE 循环处理 event: log

- [x] 3.1 在 `ScreenChat.tsx` 的 SSE 循环中新增 `event === 'log'` 处理分支，追加到 progressLines，保留最近 50 条
- [x] 3.2 result 和 error 时清理 `marketResearchActiveIds`

## 4. ChatBubble — 移动端样式选择

- [x] 4.1 在 `ChatBubble.tsx` 中 `variant === 'mobile'` 时渲染 `market-report-mobile` 替代 `market-report`
- [x] 4.2 在 `ScreenChat.tsx` 的 ChatBubble 渲染处传入 `isMarketResearchActive` prop
