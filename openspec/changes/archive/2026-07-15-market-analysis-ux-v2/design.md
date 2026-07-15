## Context

市场分析功能的 SSE 流通过 ChatBubble 展示结果。当前存在两个 UX 问题：
1. 用户点击「开始分析」后按钮仍可见，直到 SSE 流结束才消失
2. 分析过程中只展示节点名称进度（"市场边界定义 ✓"），缺少搜索/抓取的具体操作日志，用户无法感知分析正在进行中的细节

后端已有完整的基础设施：`market_analysis_agent` 每个节点内部调用 `write_log()` 写入全局 `_log_buffer`（`llm_utils.py`），且有 `drain_logs()` 可排空。但这些日志未桥接到 SSE 流。

## Goals / Non-Goals

**Goals:**
- 点击「开始分析」按钮后按钮立即消失
- 分析过程中将 `write_log` 的搜索/抓取日志通过 `event: log` SSE 事件实时推送到前端
- 气泡内在分析中状态展示可滚动的实时日志，分析完成后展示渲染后的 Markdown 报告（复用 V1 归档的 `market-report` 样式）

**Non-Goals:**
- 不修改 Agent 逻辑或 prompt 模板
- 不修改 API 路由、数据模型或 OpenSpec YAML
- 不新增 npm 或 pip 依赖
- 不影响 PlanPage PipelineTimeline 的已有日志展示

## Decisions

### 决策 1：按钮点击即消失

在 `handleStartMarketResearch` 函数中，发起 SSE 请求之前立即调用 `setMarketResearchDone(msgId)`。同时保留 SSE `result` 事件处的兜底调用。

### 决策 2：drain_logs 桥接 SSE

在 `market_analysis_service.py` 的 `analyze_stream` 中，每个 `astream_events` 迭代处理完后调用 `drain_logs()` 排空缓冲，每条 logging 作为独立的 `event: log` SSE 事件发射。

SSE 格式：
```
event: log
data: {"node_id": "market_research", "message": "📄 正在请求 https://www.example.com…"}
```

备选方案对比：
- **方案 A（选中）**：在主循环中每次 event 后排空 drain_logs。简单、零侵入，不改变 agent 或 graph 结构。
- **方案 B**：在 graph 的 callback 层注册自定义 handler。更干净但需要深入 langgraph 钩子机制，复杂度远高于收益。

### 决策 3：前端日志展示

ChatContainer 的 SSE 循环新增 `event === 'log'` 处理：将日志消息追加到 `progressLines`，通过 `updateMessageContent` 更新气泡文本。

ChatBubble 的分析中状态变为带 `max-h-[60vh] overflow-y-auto` 的滚动容器，长日志列表自动滚动。分析完成后（`message.content` 被报告替换后），切换回 `marked.parse` 渲染的 `market-report` 分支。

### 决策 4：日志行数限制

progressLines 数组截断保留最近 50 条，防止内存增长和 UI 卡顿。

## Risks / Trade-offs

- [风险] 日志量过大导致 SSE 流膨胀 → **缓解**：progressLines 截断 50 条；`write_log` 目前仅在搜索/抓取/节点开始处调用，每个节点几条日志，总条数可控
- [风险] 搜索日志中的 URL 包含敏感信息 → **缓解**：搜索 URL 是公开网页，不属于用户隐私数据
- [风险] 分析完成后日志与报告切换时闪动 → **缓解**：分析前后 `message.content` 整块替换，React 直接 unmount 滚动容器 mount 报告 div，无动画间隙
