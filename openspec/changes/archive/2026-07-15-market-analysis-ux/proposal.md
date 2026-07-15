## Why

市场分析功能的两处用户体验问题：

1. **报告格式不美观**：SSE 流结束后，`full_report`（原始 Markdown 字符串）以 `whitespace-pre-wrap` 直接写入气泡框，表格、引用块、标题等格式全部丢失，阅读体验差。
2. **按钮不消失**：报告生成完成后，「开始分析」按钮仍然悬浮在气泡上，用户可能误触重新发起分析。

## What Changes

- **ChatBubble 对 market_research 意图的消息启用 Markdown 渲染**：使用项目已有的 `marked` 库解析 `full_report`，并复用 `PlanPreview` 的 CSS 样式（表格、引用块、标题）。
- **SSE result 事件到达后清除按钮**：新增 reducer action `SET_MARKET_RESEARCH_DONE`，将对应 message 的 `canStartMarketResearch` 置为 `false`，按钮随之消失。

不涉及后端改动、不涉及 API 契约变化、不涉及 OpenSpec 文件修改。

## Capabilities

### New Capabilities

无新增 capability。本次是纯前端 UX 改进，不引入新能力。

### Modified Capabilities

无 spec 级别行为变更。前端展示逻辑和按钮状态管理属于实现细节，不改变 API 契约或消息结构。

## Impact

- `frontend/src/components/ChatBubble.tsx` — 条件启用 Markdown 渲染
- `frontend/src/hooks/useChat.ts` — 新增 action 和回调
- `frontend/src/components/ChatContainer.tsx` — SSE result 后调用清除按钮
