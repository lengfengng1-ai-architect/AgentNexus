## Context

当前前端只有 `ChatPreviewPage`（需求提取），展示在 App.tsx 直接渲染。后端刚完成市场分析 API，需要对应的前端页面。

现有前端技术栈：
- React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 3
- 无路由库，组件通过 App.tsx 直接引用
- UI 设计系统："跑道美学"（浅灰背景 + 黑色 + 橙色触发 + 绿色确认）
- 状态管理：自定义 hook + useReducer

## Goals / Non-Goals

**Goals:**
- 提供独立的「市场分析」Tab 页面，与现有「需求提取」Tab 共存。
- 支持输入品牌名 + 品类，调用 SSE 流式端点展示逐维分析进度。
- 分析完成后展示四维结构化卡片网格（行业趋势、趋势信号、消费者洞察、竞争格局）。
- 支持展开查看完整 Markdown 报告。
- 保持与现有设计系统一致（颜色、字体、间距）。
- 同步端点作为备选（非 SSE 快速查询）。

**Non-Goals:**
- 不做多语言。
- 不做历史记录持久化（MVP 不保存历史分析报告）。
- 不做对比分析（多次分析结果对比）。
- 不做导出功能。

## Decisions

1. **导航使用 useState 切换，不引入 react-router**
   - 选择原因：只有两个页面，不需要 URL 路由、浏览器前进后退、懒加载等能力。
   - 替代方案：react-router-dom；项目现在不需要，后续页面增多可迁移。

2. **输入采用 2 字段表单（品牌名 + 品类），非自然语言**
   - 选择原因：市场分析需要精确的 brand_name 和 category，不适合通过聊天提取。表单直接、确定性强。
   - 对比 chat 的需求提取用自然语言是因为字段多且不确定，市场分析只有两个必填字段。

3. **主要交互走 SSE 流式，同步端点为备选**
   - 选择原因：SSE 让用户看到分析推进（行业趋势 → 趋势信号 → 消费者 → 竞争），减少等待焦虑。同步端点在 SSE 失败时 fallback 用。

4. **四维报告以结构化卡片展示，附加可展开 Markdown**
   - 选择原因：结构化卡片让用户快速 grasp 每个维度的关键信息，Markdown 则满足需要完整阅读的场景。
   - 行业趋势 → 绿/灰底色卡片，显示 GDP 变化/市场规模/总结
   - 趋势信号 → 列表，每条带 positive/neutral/negative 标签
   - 消费者洞察 → 列表，每条带具体变化 bullet points
   - 竞争格局 → 品牌卡片列表

5. **进度条设计为 5 段水平条，每段对应一个维度**
   - 选择原因：与 chat 页面的「进度跑道」视觉语言一致

## Processing Model

### 用户流程
```
用户打开页面 → Tab 导航显示「需求提取 | 市场分析」
用户点击「市场分析」→ 看到 MarketAnalysisForm
用户输入 "AllyGo" + "运动饮料" → 点击「开始分析」
  → useMarketAnalysis hook 发起 SSE 连接
  → AnalysisProgress 逐段推进：
    searching_industry  ████░░░░░░  25%
    searching_trend     ████████░░  50%
    searching_consumer  ████████████░ 75%
    searching_competitive ████████████████ 90%
    analyzing           ████████████████████ 95%
  → 收到 result 事件 → 展示 AnalysisReport
    ┌──────────┬────────────┐
    │📈 行业趋势 │ 🔍 趋势信号 │
    │ 市场800→  │ ✅全民健身  │
    │ 1200亿    │ 📝减糖监管  │
    ├──────────┼────────────┤
    │👥 消费者   │ 🏢 竞争格局 │
    │ 洞察      │ 佳得乐5-7元│
    │ 无糖+45%  │ 外星人5-6元│
    ├──────────┴────────────┤
    │ 📄 查看完整报告(Markdown)│
    │ 🟡 置信度: medium      │
    └───────────────────────┘
```

### API 调用

同步端点（快速）：
```
POST /api/v1/market-analysis
  { brand_name: "AllyGo", category: "运动饮料" }
→ 200 { report: {...}, confidence: "medium" }
```

SSE 流式端点（带进度）：
```
POST /api/v1/market-analysis/stream
  { brand_name: "AllyGo", category: "运动饮料" }
→ event: progress  data: { stage: "searching_industry", progress: 25 }
  event: progress  data: { stage: "searching_trend", progress: 50 }
  ...
  event: result    data: { report: {...}, confidence: "medium" }
```

## Components

```
App.tsx
  ├── NavTabs           ← 新增：需求提取 | 市场分析 导航栏
  ├── ChatPreviewPage   ← 现有，不变
  └── MarketAnalysisPage ← 新增
        ├── MarketAnalysisForm
        │   ├── brand_name input
        │   ├── category input
        │   └── 「开始分析」button
        ├── AnalysisProgress
        │   └── 5 segment progress bar with labels
        ├── AnalysisReport
        │   ├── IndustryTrendsCard
        │   ├── TrendSignalsCard
        │   ├── ConsumerInsightsCard
        │   ├── CompetitiveLandscapeCard
        │   └── FullReportAccordion
        └── MarketAnalysisError
```

## Risks / Trade-offs

- **[Risk]** SSE 连接可能在中途断开
  - **Mitigation**: useMarketAnalysis hook 自动 fallback 到同步端点
- **[Risk]** 分析结果数据量大，Markdown 渲染性能
  - **Mitigation**: Markdown 内容用基本白色卡片 + pre-wrap 显示，不使用 Markdown 渲染库
- **[Risk]** 用户连续多次点击「开始分析」
  - **Mitigation**: 分析中禁用按钮，只保持最近的 SSE 连接

## Open Questions

1. 是否需要允许多次分析并排对比？MVP 不做，每次分析覆盖上一次结果。
2. 是否需要导出报告？MVP 不做，后续独立 change。
