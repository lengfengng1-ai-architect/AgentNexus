# 移动端市场分析 UX 优化 — 设计探索草稿

## 问题

移动端（360px 手机框）的市场分析存在 4 个问题：

1. **字号过大** — `.market-report` 使用 `rem` 字号（h1: 1.25rem ≈ 20px），移动端 360px 屏幕下偏大
2. **排版错乱** — 表格在窄屏撑破容器、部分元素无 `word-break` 控制
3. **无实时搜索日志** — 移动端 `ScreenChat.tsx` 的 SSE 循环未处理 `event: log`
4. **按钮不消失** — 未调用 `setMarketResearchDone`，分析期间按钮一直可见

## 改动方案

### 1. 新增 `.market-report-mobile` 样式

在 `mobile-workbench.css` 中新增，字号降一级：
- h1: 16px, h2: 15px, h3: 14px
- 普通文本: 13px（与移动端其他气泡对齐）
- table 包 `overflow-x: auto` 容器
- blockquote/code/pre 字号同步缩小

### 2. ScreenChat.tsx — 镜像桌面端 SSE 改进

- import `setMarketResearchDone`
- 新增 `marketResearchActiveIds` state
- 点击按钮时：`setMarketResearchDone` + `setMarketResearchActiveIds`
- SSE 循环新增 `event: log` 处理 + 50 条截断
- 结果/错误时清除 `marketResearchActiveIds`

### 3. ChatBubble.tsx — 移动端样式选择

`variant === 'mobile'` 时渲染 `market-report-mobile` 替代 `market-report`

### 不涉及

- 不修改 API 路由、数据模型
- 不修改 Agent 代码或 prompt
- 不新增依赖
