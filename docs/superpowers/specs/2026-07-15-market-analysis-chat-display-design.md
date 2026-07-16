# 市场分析 Agent 独立调用 — ChatBubble 内工作台式展示

## 背景

独立调用的市场分析 Agent（`market_analysis_agent`）通过 SSE 流式推送分析进度和结果，但当前 ChatBubble 内只是简单的纯文本拼接显示，缺少结构化展示：
- 搜索来源 URL 没有提取展示
- 分析进度只有文本行，没有独立的小窗口滚动
- 完成时是整篇 markdown，不是结构化卡片集合

目标：复用工作台 PlanPage 的展示逻辑风格，在 ChatBubble 内实现。

## 设计

### 交互流程

```
用户点击"开始分析" → SSE 流开始
  │
  ├── 流式进行中 ──────────────────────────
  │  ChatBubble 显示两个嵌入式小窗口：
  │    • 搜索来源窗口：实时展示 source_url 列表（可滚动，auto-scroll）
  │    • 分析进度窗口：展示阶段名 + log 消息（可滚动，auto-scroll）
  │
  └── 流完成 ──────────────────────────────
     ChatBubble 切换为结构化卡片集合：
      • 市场摘要卡（名称/行业/地理/周期）
      • 市场规模卡（TAM/SAM/SOM/CAGR）
      • 趋势信号卡
      • 目标用户卡
      • 竞争格局卡（复用现有 CompetitiveLandscapeCard）
      • 机会评估卡
      • 底部可折叠证据来源列表
```

### 数据流

当前 SSE 流已有完整数据，只需前端消费 `data` 事件：

| SSE event | 当前处理 | 新增处理 |
|---|---|---|
| `progress` | ✅ 展示阶段名 | 不变 |
| `data` | ⛔ 跳过 | ✅ 提取 `result` 中的 `evidence[].source_url` 和节点结构化数据 |
| `node_end` | ✅ 加 ✓ | 不变 |
| `log` | ✅ 追加文本 | 不变 |
| `result` | ✅ 展示 markdown | 改为展示结构化卡片 |

### 组件架构（新增）

```
MarketResearchProgressCard
  ├── SearchSourcesList (搜索URL列表 + auto-scroll)
  └── ProgressLogList (分析日志 + auto-scroll)

MarketResearchResultCards
  ├── MarketSummaryCard
  ├── MarketSizeCard
  ├── TrendSignalsCard
  ├── TargetUsersCard
  ├── CompetitiveLandscapeCard (复用的已有组件)
  ├── OpportunityAssessmentCard
  └── EvidenceList (折叠)
```

### ChatMessage 新增字段

```typescript
marketResearchSources: { url: string; title: string }[]
marketResearchProgressLogs: string[]
marketResearchResult: MarketResearchResponse | null  // 已有 data 事件累加
```

### 约束

- 纯前端改动，不改后端 API 和 Agent
- 不引入新依赖
- `CompetitiveLandscapeCard` / `ConsumerInsightsCard` 复用现有组件
- `ponytail:` 注释标记简化处（如证据列表用纯文本折叠而非完整交互组件）
