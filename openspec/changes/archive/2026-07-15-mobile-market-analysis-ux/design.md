## Context

移动端（360px 手机框）市场分析功能使用了桌面端的 `.market-report` 样式，该样式字号使用 `rem`（h1: 1.25rem ≈ 20px），在移动端偏大。同时 `ScreenChat.tsx` 未接入桌面端已完成的 SSE 改进（`event: log` 处理、按钮点击即消失），导致移动端缺少实时搜索日志展示和按钮交互优化。

## Goals / Non-Goals

**Goals:**
- 移动端市场分析报告字体适配 360px 屏幕（字号降级，与移动端其他气泡 13px 对齐）
- 表格、blockquote 等元素在窄屏不撑破容器
- 分析过程中实时展示搜索/抓取日志
- 点击"开始分析"后按钮立即消失

**Non-Goals:**
- 不修改 API 路由、数据模型、Agent 代码或 prompt 模板
- 不新增 npm 或 pip 依赖
- 不影响桌面端 ChatContainer 的已有行为
- 不涉及 spec 级别变更

## Decisions

### 决策 1：新增 `.market-report-mobile` 样式（不修改全局 `.market-report`）

在 `mobile-workbench.css` 中新增 `.market-report-mobile` 类，字号降一级：
- h1: 16px, h2: 15px, h3: 14px
- 普通文本 / p / li: 13px
- 表格外层包 `overflow-x: auto` 容器
- blockquote / code / pre 等同时缩小

**备选方案对比：**
- **方案 A（选中）**：新增独立移动端样式名。不侵入全局样式，移动端和桌面端样式解耦。
- **方案 B**：修改全局 `.market-report` 用媒体查询适配。风险是桌面端被连带影响，且 `rem` 在小屏下逐级缩小不可控。
- **方案 C**：用 `@media` 媒体查询覆盖移动端。但移动端在 PhoneFrame 内是固定 360px，不是窗口大小，媒体查询不一定触发。

### 决策 2：ScreenChat.tsx 镜像桌面端 SSE 改进

`ScreenChat.tsx` 的 `handleStartMarketResearch` 和 SSE 循环逐项对齐 `ChatContainer.tsx` 的实现：

1. import `setMarketResearchDone` from `useChat`
2. 新增 `marketResearchActiveIds` React state
3. 按钮点击：`setMarketResearchDone(msgId)` + `setMarketResearchActiveIds(prev => new Set(prev).add(msgId))`
4. SSE 循环新增 `event: log` 分支
5. progressLines 保留最近 50 条
6. result/error 时清理 `marketResearchActiveIds`

### 决策 3：ChatBubble 根据 variant 选择样式

`ChatBubble.tsx` 中，`variant === 'mobile'` 时渲染 `market-report-mobile`，否则渲染 `market-report`。

同时 `isMarketResearchActive` prop 在移动端也需要传入——`ScreenChat.tsx` 的渲染处加 `isMarketResearchActive={marketResearchActiveIds.has(m.id)}`。

## Risks / Trade-offs

- [风险] 移动端 `.market-report-mobile` 与桌面端 `.market-report` 不同步更新 → **缓解**：两者结构一致，仅字号和溢出控制有差异；后续如需统一可合并。
- [风险] `isMarketResearchActive` prop 增加 ChatBubble 的渲染条件复杂度 → **缓解**：条件简单（三个分支），已在桌面端验证。
