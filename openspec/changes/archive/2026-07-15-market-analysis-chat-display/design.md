## Context

独立调用的市场分析 Agent（`market_analysis_agent`）通过 SSE 流式推送分析进度和结果。当前 ChatBubble 仅以纯文本 `\n` 拼接在 `whitespace-pre-wrap` 容器中展示，体验简陋。

后端 SSE 流完整产出了 `progress` / `data` / `node_end` / `log` / `result` 五种事件，其中：
- `data` 事件（`MarketResearchDataEvent`）包含每个节点的结构化输出（`MarketDefinition`, `TrendSignalItem`, `CompetitorItem`, `EvidenceItem` 等）
- `result` 事件包含最终的 `MarketResearchResponse`（含 `full_report` markdown + `MarketResearchResult` 全套结构化字段）

但前端 ChatContainer 当前只消费了 `progress` / `node_end` / `log` / `result` 四种事件，`data` 事件被静默跳过。

工作台（PlanPage）的 `market_research` agent 展示逻辑提供了参照：结构化卡片集合（CompetitiveLandscapeCard / ConsumerInsightsCard）+ 日志滚动窗口。

## Goals / Non-Goals

**Goals:**
- ChatBubble 内独立调用的市场分析展示达到与工作台一致的信息密度和交互水平
- SSE `data` 事件被正确消费，提取 `EvidenceItem.source_url` 展示为搜索来源列表
- 流式进行中：搜索来源小窗口 + 进度日志小窗口（均可滚动，auto-scroll 到底）
- 流完成时：小窗口收起，切换为结构化卡片集合（不可滚动，信息完整）
- 纯前端改动，后端 API / Agent / SSE 事件结构不变

**Non-Goals:**
- 不改动工作台 PlanPage 的展示逻辑
- 不改变 market_analysis_agent 的 web search 能力（推理的 source_url 已够用）
- 不引入新的 npm 依赖
- 不做 SSG/SSR 适配

## Decisions

### 1. SSE data 事件数据流向

**方案**：通过 `updateMessageContent` 的现有机制将结构化数据传递给 ChatBubble，而非新增独立的 dispatch。

**理由**：现有架构中 useChat 的 `UPDATE_MESSAGE_CONTENT` action 已经是一条通用通道——ChatBubble 根据 `message.content` 的内容结构自己决定如何渲染。结构化数据先 JSON 序列化再通过 content 管道传递，ChatBubble 的 MarketResearchProgressCard 内部解析渲染。

但更好的设计是**单独扩展 reducer**：

**最终决定**：ChatMessage 新增 `marketResearchSources`、`marketResearchProgressLogs` 字段，useChat reducer 新增对应的 action，保持数据管道清洁，不滥用 content 字段。

### 2. 搜索来源数据的存储结构

```typescript
marketResearchSources: { url: string; title: string }[]
```

来源数据在 `data` 事件中从 `EvidenceItem[]` 提取 `source_url` 作为 URL，`EvidenceItem.source_name` 作为 title。去重（按 URL）。

### 3. 进度态 → 完成态的切换时机

- **进度态**：SSE `progress` / `log` / `data` 事件持续到达时显示 `MarketResearchProgressCard`
- **切换点**：收到 `event: result`（最终结果）时立即切换
- **完成态**：`MarketResearchResultCards` 展示结构化卡片集合
- 切换后进度数据从 `marketResearchSources` 和 `marketResearchProgressLogs` 中保留，但不显示在 UI 上

### 4. 结构化卡片的组件复用

```
MarketResearchResultCards
├── MarketSummaryCard        (新建)
├── MarketSizeCard           (新建)
├── TrendSignalsCard         (新建)
├── TargetUsersCard          (新建)
├── CompetitiveLandscapeCard (复用已有)
├── OpportunityCard          (新建)
└── EvidenceList             (新建，折叠式)
```

`CompetitiveLandscapeCard` 已有，但当前接收的是 `MarketAnalysisResult.competitive_landscape` 类型。需要确认其接口是否兼容 `CompetitorItem[]`。

### 5. auto-scroll 实现

使用 `useRef + useEffect` 监听内容变化，每次 `marketResearchProgressLogs` 或 `marketResearchSources` 更新后，将滚动容器 `scrollTop` 设为 `scrollHeight`，以 `behavior: 'smooth'` 实现平滑滚动。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|---|---|
| SSE data 事件量过大导致频繁 re-render | 来源 URL 和 progress log 用 `useRef` 累积，批处理更新；`updateMessageContent` 本身已是 dispatch 更新 |
| CompetitiveLandscapeCard 接口不兼容 | 如果类型不兼容，新建包装组件转换数据格式 |
| 进度日志过多撑爆内容 | `maxLogLength = 50` 截断（已存在于 ChatContainer 的现有实现） |
| 移动端适配 | `.market-report-mobile` 样式已存在，新组件用相同模式适配 |
