## Why

端到端测试发现市场分析 Agent 在 PC 和移动端有两个展示缺陷：搜索来源窗口始终显示"正在搜索…"（后端 `assemble_result()` 硬编码 `evidence=[]`，前端没从文本提取来源 URL）；完成态报告以原始 markdown 源码显示（未调用 `marked.parse()`）。同时需要补充 mock 数据以支持端到端验证。

## What Changes

### 修复

- **`assembled_result()`（后端）** — 从节点文本输出中正则提取来源 URL 填充 `evidence[]` 数组
- **`ChatContainer` + `ScreenChat`（前端）** — `data` 事件处理中从 `nodeResult` 文本字段正则提取 `"—— 来源: URL"` 模式的 URL，填充搜索来源窗口
- **`MarketResearchResultCards`（前端）** — 完整报告区域用 `marked.parse()` 渲染代替纯文本

### 新增

- **mock 数据** — `mock_data/market_analysis/职场情绪价值消费.json` 真实结构化数据，支持端到端验证

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- 无（bugfix + mock 数据补充）

## Impact

| 范围 | 影响 |
|---|---|
| `backend/app/agents/market_analysis_agent.py` | `assemble_result()` 中提取来源 URL |
| `frontend/src/components/ChatContainer.tsx` | SSE data 事件加正则提取 URL |
| `frontend/src/pages/mobile-workbench/ScreenChat.tsx` | 同上 |
| `frontend/src/components/MarketResearchResultCards.tsx` | 完整报告用 marked.parse() |
| `backend/mock_data/market_analysis/*.json` | 新增 mock 数据 |
