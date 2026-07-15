## Why

市场分析功能的两处用户体验问题：

1. **按钮残留**：用户点击「开始分析」后按钮仍一直可见，直到 SSE 流完全结束才消失，可能导致误触重新发起分析。
2. **缺乏过程透明度**：分析过程中用户只看到节点名称进度（"市场边界定义 ✓"），看不到搜索/抓取的具体行为（如正在请求哪些 URL），无法感知分析是否正常进行。

## What Changes

- **按钮点击即消失**：在发起 SSE 请求前立即清除按钮，而非等到 result 事件到达。
- **实时搜索日志 SSE 流**：新增 `event: log` SSE 事件类型，将后端 `write_log` 缓冲中的搜索/抓取日志排空到前端。
- **气泡滚动容器**：分析中状态使用可滚动的日志区域展示实时日志，分析完成后切换回 Markdown 报告渲染。

不涉及 API 路由变更、不涉及数据模型变更、不涉及 Agent 代码修改。

## Capabilities

### New Capabilities

无新增 capability。本次是现有 `market-analysis` 能力的 SSE 事件增强和 UX 改进。

### Modified Capabilities

无 spec 级别行为变更。SSE 新增事件类型和前端展示优化属于实现细节，不改变 API 契约或消息结构。

## Impact

- `backend/app/services/market_analysis_service.py` — `analyze_stream` 中每次 event 后排空 `drain_logs()`
- `frontend/src/components/ChatContainer.tsx` — SSE 循环新增 `event: log` 处理；按钮处 +1 行 `setMarketResearchDone`
- `frontend/src/components/ChatBubble.tsx` — 分析中状态加滚动容器
