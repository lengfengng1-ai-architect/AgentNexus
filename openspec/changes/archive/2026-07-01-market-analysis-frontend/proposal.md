## Why

后端已完成市场分析 Agent 和 API（`POST /api/v1/market-analysis` 同步 + SSE 流式），但缺少前端可视化入口。用户无法直观看到分析进度和四维报告。当前只有一个 AI 聊天界面用于需求提取，市场分析需要独立的输入→进度→结果展示流程。

## What Changes

- 修改 `App.tsx`：新增顶部导航 Tab（"需求提取" / "市场分析"），用 `useState` 切换页面。
- 新增 `pages/MarketAnalysisPage.tsx`：市场分析页面容器。
- 新增 `components/MarketAnalysisForm.tsx`：品牌名 + 品类输入 +「开始分析」按钮。
- 新增 `components/AnalysisProgress.tsx`：SSE 进度条，5 个维度逐一点亮推进。
- 新增 `components/AnalysisReport.tsx`：四维分析结果卡片网格。
- 新增 `components/FullReportAccordion.tsx`：可展开的完整 Markdown 报告。
- 新增 `components/MarketAnalysisError.tsx`：错误状态展示。
- 新增 `hooks/useMarketAnalysis.ts`：SSE 流式调用与状态管理 hook。
- 新增 `api/marketAnalysis.ts`：同步和流式 API 调用封装。
- 新增 `types/marketAnalysis.ts`：市场分析相关 TypeScript 类型定义。

## Capabilities

### New Capabilities

- `market-analysis-frontend`: 市场分析前端交互页面，包括品牌/品类输入、SSE 流式进度推送、四维结构化报告展示。

### Modified Capabilities

- `chat-preview-frontend`: 从独占全屏变为 App 中的 Tab 页面之一，结构和行为不变。

## Impact

- App.tsx 从直接渲染 ChatPreviewPage 改为渲染导航 + 页面切换。
- 现有 chat 组件和 hook 完全不变。
- 后端无需改动，新前端页面直接对接已有 `POST /api/v1/market-analysis` 和 `/stream`。

## Non-goals

- 不做工作流编排页面。
- 不做方案生成前端。
- 不做前端路由库引入（使用 useState 切换）。
- 不做用户登录/多用户。
