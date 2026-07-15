## Context

市场分析的 SSE 流式结果在 ChatBubble 中以原始 Markdown 文本展示，未渲染格式（表格、引用块、标题等均不可见），且「开始分析」按钮在报告生成后依然可见。

这是纯前端改动，不涉及任何后端逻辑、API 契约、数据模型变更。

## Goals / Non-Goals

**Goals:**
- `market_research` 意图的 AI 消息气泡显示渲染后的 Markdown 报告（表格、引用、加粗等格式正确展示）
- 报告生成后，「开始分析」按钮立即消失

**Non-Goals:**
- 不调整 LLM prompt 的格式输出
- 不改变 API 契约（OpenSpec YAML 不变）
- 不改动后端服务层
- 不新增 npm 依赖（`marked` 已在项目中）

## Decisions

### 决策 1：ChatBubble 内条件渲染 Markdown

在 ChatBubble 中对 `message.intent === 'market_research'` 且非 streaming 状态的消息，使用 `marked.parse()` 渲染 `message.content`，并复用 `PlanPreview` 已有的 markdown 样式类。

备选方案对比：
- **方案 A（选中）**：ChatBubble 自身做条件判断 + 渲染。简单直接，不引入新组件。
- **方案 B**：抽离 `MarketReportCard` 独立组件。虽然封装更好，但当前报告只在一个位置出现，无需过度抽象。ponytail: 未来若报告需要独立卡片交互（折叠/展开、复制），可再抽离。

### 决策 2：按钮清除通过新的 reducer action

新增 `SET_MARKET_RESEARCH_DONE` action，将 message 的 `canStartMarketResearch` 置为 `false`。从 useChat 暴露 `setMarketResearchDone` 回调，ChatContainer 的 SSE result 事件处理中调用。

备选方案对比：
- **方案 A（选中）**：新 action + 回调。reducer 逻辑可控，不影响其他 message 状态。
- **方案 B**：在 SSE result 中直接 `updateMessageContent` 同处理。但其语义是"更新内容"而非"清除按钮"，容易引入混淆。
- **方案 C**：在 `INTENT_RECEIVED` 时如果已经是 result 状态则跳过设 `canStartMarketResearch`。这需要 SSE 事件顺序保证，但当前流结构是 progress → result 分离，不合逻辑。

### 决策 3：CSS 样式复用

渲染后的 HTML 使用与 `PlanPreview` 相同的 markdown 样式类（或内联 `tailwind` 类）。由于 ChatBubble 和 PlanPreview 的容器宽度不同，不共用 `marked` 配置，确保气泡内 markdown 不会继承不必要的布局样式。

## Risks / Trade-offs

- [风险] marked.parse() 输出的 HTML 中包含用户不可控的 LLM 输出 → **缓解**：marked 默认不开启 `dangerous` 选项，会对 HTML 标签做转义。且 LLM 输出本身不是用户输入，XSS 风险极低。
- [风险] 进度文本（"市场边界定义 ✓"）也被 marked 包裹为 `<p>` 标签 → **缓解**：结果只有两态，进度阶段渲染无格式纯文本，report 到达后整块替换为 HTML。不涉及混排。
- [风险] ChatBubble 已有的 `whitespace-pre-wrap` 样式可能与 marked 输出冲突 → **缓解**：对 Markdown 渲染区域重置 `white-space` 为 `normal`。
