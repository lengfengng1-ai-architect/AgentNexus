## Context

ScreenChat 和 ChatContainer 在 SSE 流式 `data` 事件中执行了 `setMarketResearchResult(msgId, nodeResult)`。后端 `data` 事件 (`MarketResearchDataEvent`) 对应的是**单个节点**的阶段性输出（比如 `define` 返回的 `{included_scope:[], ...}`），不是最终完整结果。但 ChatBubble 的渲染条件判断 `message.marketResearchResult` 是否为 truthy 来决定展示完成态——导致第一个 `data` 事件抵达时就提前命中完成态渲染，但数据不完整，所有卡片 pass 空检查，进度态双窗口永不出现。

## Goals / Non-Goals

**Goals:**
- 流过程中正确显示 MarketResearchProgressCard（搜索来源+进度日志双窗口）
- `result` 事件抵达后才切换到 MarketResearchResultCards
- 移动端结果卡片布局不再因溢出变丑

**Non-Goals:**
- 不改动后端 SSE 事件结构
- 不改动 ChatBubble 的渲染逻辑（条件判断链本身正确）
- 不改动桌面端行为

## Decisions

### 1. data 事件不设 result

ScreenChat + ChatContainer 的 `data` 事件处理中移除 `setMarketResearchResult` 调用。`setMarketResearchResult` 只在 `result` 事件（最终完整结果）时调用。

### 2. result 事件按最终结果设一次

`result` 事件已包含完整 `MarketResearchResponse`，在此处调用 `setMarketResearchResult` 不再有提前覆盖问题。

### 3. CompetitiveLandscapeCard 传 variant

`MarketResearchResultCards` 中渲染 `CompetitiveLandscapeCard` 时传 `variant={variant}` prop，使移动端能通过 CSS 覆盖其样式。

## Risks / Trade-offs

| 风险 | 缓解 |
|---|---|
| data 事件中收集的 evidence source_url 在 result 事件后可能丢失 | `marketResearchSources` 独立于 `marketResearchResult`，不被覆盖 |
