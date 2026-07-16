## Why

独立调用的市场分析 Agent 在 ChatBubble 内的展示体验与工作台（PlanPage）差距较大——当前仅以纯文本拼接呈现进度和结果，缺少搜索来源 URL 展示、进度滚动窗口、结构化卡片等关键交互元素。用户在同一功能上获得两种不一致的体验。

## What Changes

### 新增（纯前端，不涉及后端改动）

- ChatMessage 类型增加市场分析展示状态字段（`marketResearchSources`、`marketResearchProgressLogs`）
- useChat reducer 增加新的 action 类型以处理市场分析结构化数据
- 新建 `MarketResearchProgressCard` 组件（搜索来源列表 + 进度日志，可滚动，auto-scroll）
- 新建 `MarketResearchResultCards` 组件（结构化卡片集合展示：摘要、规模、趋势、用户、竞品、评估）
- ChatBubble 在 `market_research` intent 下切换"进度态"（小窗口可滚动）→ "完成态"（结构化卡片，不可滚动）
- ChatContainer 消费 SSE 的 `data` 事件，提取 `EvidenceItem.source_url` 和节点结构化数据

### 修改

- `frontend/src/types/chat.ts` — ChatMessage 新增 `marketResearchSources`、`marketResearchProgressLogs`、`marketResearchResult` 字段
- `frontend/src/hooks/useChat.ts` — reducer 新增 action 类型和相关 dispatch 方法
- `frontend/src/components/ChatContainer.tsx` — SSE 消费增加 `data` 事件处理
- `frontend/src/components/ChatBubble.tsx` — 集成新组件，根据状态切换展示模式

### 不变

- 后端 API、Agent、SSE 流事件结构不变
- 不引入新的 npm 依赖
- 不影响现有 PlanPage 工作台的逻辑

## Capabilities

### New Capabilities

- `market-analysis`: 已有 capability，本次只涉及前端展示增强，不修改 spec-level 的 requirements

### Modified Capabilities

- 无。展示增强不改变后端能力定义和 API 契约

## Impact

| 范围 | 影响 |
|---|---|
| 前端页面 | ChatContainer、ChatBubble — SSE 消费逻辑 + 条件渲染 |
| 前端组件 | 新增 2 个组件，复用 2 个已有卡片组件 |
| 前端类型/hooks | ChatMessage 类型扩展 + useChat reducer 扩展 |
| 后端 | 无改动 |
| API | 无改动 |
| 测试 | ChatBubble / ChatContainer 相关组件测试 |
