## Why

移动端市场分析功能存在 4 个 UX 问题：字体过大不适配 360px 屏幕、排版错乱（表格撑破容器）、分析过程中无实时搜索日志展示、分析期间按钮一直不消失。这些问题降低移动端使用体验，需要统一优化。

## What Changes

- **新增移动端样式**：在 `mobile-workbench.css` 中新增 `.market-report-mobile` 样式，字号降一级适配窄屏
- **实时搜索日志**：`ScreenChat.tsx` 的 SSE 循环新增 `event: log` 处理，展示实时搜索/抓取日志
- **按钮点击即消失**：`ScreenChat.tsx` 中 `handleStartMarketResearch` 点击时立即调用 `setMarketResearchDone`、同步 `marketResearchActiveIds` 状态
- **移动端 ChatBubble 适配**：`ChatBubble.tsx` 在 `variant === 'mobile'` 时渲染 `.market-report-mobile` 替代 `.market-report`

## Capabilities

### New Capabilities

无新增 capability。本次属于现有 `market-analysis` 能力的移动端 UX 增强。

### Modified Capabilities

无 spec 级别行为变更。SSE 新增事件类型和移动端 UI 适配属于实现细节，不改变 API 契约或消息结构。

## Impact

- `frontend/src/pages/mobile-workbench/mobile-workbench.css` — 新增 `.market-report-mobile` 样式
- `frontend/src/pages/mobile-workbench/ScreenChat.tsx` — 镜像桌面端 SSE 改进（按钮消失 + 实时日志）
- `frontend/src/components/ChatBubble.tsx` — `variant === 'mobile'` 时使用移动端样式
