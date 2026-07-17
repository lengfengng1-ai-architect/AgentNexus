# Proposal: 移动端调研结果页

Corresponding in_scope ID: `market-analysis`

## Why

移动端聊天输入"帮我调研下智能手表"触发 market_research 后，完成态直接把完整 markdown 报告（`full_report`，通常 3000+ 字）渲染在聊天气泡里，聊天流被长文撑爆，用户反馈"太丑"。需要：调研完成后聊天里只留一个好看的摘要卡片 + 按钮，点击进入一个从右往左滑入的毛玻璃结果页查看完整报告；且刷新后按钮仍可用（结果持久化）。

## What Changes

- **后端**：SSE `result` 事件新增 `research_id` 字段（`mr-<uuid8>`），流式分析完成时把结果持久化为 JSON 文件；新增 `GET /api/v1/market-analysis/results/{research_id}` 端点按 ID 读取已存报告（200 / 404 / 500）
- **前端聊天（仅移动端）**：market_research 完成态不再直渲 full_report markdown，改为渲染摘要卡片（市场名 + TAM/CAGR 关键数字 + 机会评估 badges + "查看完整调研报告"毛玻璃按钮），缺数据字段自动降级
- **前端新屏**：新增 `research-report` 覆盖屏（手机框内绝对定位），毛玻璃 sticky 顶栏 + 长滚动结构化板块（复用 MarketResearchResultCards 子卡片 + `.mw` 作用域毛玻璃皮肤）+ 完整报告 + 证据来源；从右往左 slide-in 进入、slide-out 返回
- **数据流**：点按钮 → 覆盖屏骨架屏 → 总是从后端 GET 拉取 → 200 渲染 / 404 显示"报告已过期"占位；聊天消息只存 `researchId`，不再依赖整条 result 驻留消息
- PC 端聊天调研完成态保持现状，不受影响

## Capabilities

### New Capabilities

（无新 capability；结果存储与拉取、移动端结果页均归入 market-analysis 的演进）

### Modified Capabilities

- `market-analysis`：MODIFIED 移动端完成态需求（不再只渲 full_report，改为摘要卡片 + 结果页）；ADDED 调研结果持久化与按 ID 拉取端点；ADDED 移动端调研结果页（覆盖屏 + 转场动画 + 骨架/过期降级）

## Impact

- **代码**：
  - `backend/app/services/market_analysis_service.py`（result 事件加 research_id + 落盘）
  - `backend/app/routers/market_analysis.py`（新增 GET 端点）
  - `backend/app/schemas/market_analysis.py`（SSE result payload 加 research_id）
  - `frontend/src/hooks/useMarketResearchStream.ts`（存 researchId）
  - `frontend/src/hooks/useChat.ts`（消息携带 researchId）
  - `frontend/src/types/chat.ts`（ChatMessage + researchId）
  - `frontend/src/components/ChatBubble.tsx`（移动端完成态分支换摘要卡片）
  - `frontend/src/components/ResearchReportEntryCard.tsx`（新）
  - `frontend/src/pages/mobile-workbench/ScreenResearchReport.tsx`（新）
  - `frontend/src/pages/mobile-workbench/ScreenChat.tsx` / `MobileWorkbenchPage.tsx`（接线 + 覆盖层 + 转场）
- **API**：`docs/api/paths/market-analysis.yaml` 新增 GET 端点契约；SSE result 事件契约加字段（向后兼容，纯新增字段非 BREAKING）
- **存储**：新增 `backend/mock_data/market_analysis/results/` 目录存放调研结果 JSON（沿用现有 `_save_cache` 文件缓存惯例，无数据库）
- **依赖**：无新增依赖

## Non-goals

- 不改 PC 端聊天调研结果展示
- 不做结果页 URL 路由 / 分享链接 / 跨设备访问
- 不改调研进行中的过程展示（MarketResearchProgressCard 保持现状）
- 不做调研结果的过期清理策略（MVP 文件永久保留，后续可加 TTL）
- 不涉及 out_scope 项（无跨平台数据接入、无竞品分析新功能 —— 竞品板块仅是已有数据的展示层复用）
