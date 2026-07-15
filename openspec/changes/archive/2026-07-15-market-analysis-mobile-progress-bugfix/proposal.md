## Why

移动端调用市场分析 Agent 时，SSE 流中每个 `data` 事件都通过 `setMarketResearchResult` 提前覆盖 `marketResearchResult` 字段，导致 ChatBubble 的条件渲染提前命中"完成态"分支（`marketResearchResult` 非空），但数据只是单节点碎片——所有卡片因空数据检查而不渲染，同时进度态双窗口永不显示。结果：流过程气泡空白缩小，用户看不到任何进度。

## What Changes

### 修复（核心）

- **ScreenChat** — `data` 事件处理器中移除 `setMarketResearchResult` 调用，只保留 `appendMarketResearchSources`（提取 evidence URL）
- **ChatContainer**（桌面端同理） — 同样的修复同步做

### 改进（移动端结果展示）

- **MarketResearchResultCards** — `CompetitiveLandscapeCard` 传递 `variant` prop 使其在移动端使用对应的样式
- **完整报告** — 移动端 `break-all` + `max-w-full` 防止内容溢出

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- 无（bugfix，不改变 spec-level requirements）

## Impact

| 范围 | 影响 |
|---|---|
| `ScreenChat.tsx` | data 事件中移除 1 行 `setMarketResearchResult` |
| `ChatContainer.tsx` | data 事件中移除 1 行 `setMarketResearchResult` |
| `MarketResearchResultCards.tsx` | CompetitiveLandscapeCard 传 `variant`；报告容器加 break-all |
