# Tasks: 移动端调研结果页

## 1. 后端：结果持久化 + GET 端点

- [x] 1.1 更新 `docs/api/paths/market-analysis.yaml`：SSE result 事件契约加 `research_id` 字段；新增 `GET /market-analysis/results/{research_id}` 端点契约（200/404/500，APIError 模型）
- [x] 1.2 `backend/app/services/market_analysis_service.py`：新增 `save_research_result(response) -> str`（生成 `mr-<uuid8>` ID、写入 `results/<id>.json`、返回 ID；落盘失败记日志返回 ID 不抛异常）与 `get_research_result(research_id) -> MarketResearchResponse | None`（校验 ID 格式防路径遍历）
- [x] 1.3 `analyze_stream` result 事件：调用 save 并在 payload 顶层加 `research_id`
- [x] 1.4 `backend/app/routers/market_analysis.py`：新增 `market_analysis_result_get`（GET 端点，200 返回结果 / 404 ID 不存在或格式非法 / 500 异常，APIError 模型）
- [x] 1.5 后端测试：save/get 往返、ID 格式校验（`../` 等非法输入 → None）、GET 端点 200/404/500 三态

## 2. 前端：数据链路（researchId 流转）

- [x] 2.1 `frontend/src/types/chat.ts`：`ChatMessage` + `researchId?: string`
- [x] 2.2 `frontend/src/hooks/useMarketResearchStream.ts`：result 事件提取 `research_id`，新 dispatch action 存到消息（如 `SET_RESEARCH_ID`）
- [x] 2.3 `frontend/src/hooks/useChat.ts`：reducer 支持 SET_RESEARCH_ID；确认 researchId 随消息持久化到 localStorage
- [x] 2.4 `frontend/src/api/marketAnalysis.ts`（新）：`fetchResearchResult(researchId)` 封装 GET 调用，返回 result 或抛 404/网络错误

## 3. 前端：聊天内摘要卡片

- [x] 3.1 `frontend/src/components/ResearchReportEntryCard.tsx`（新）：标题（market_name 兜底"市场调研报告"）+ 副标题（有数据板块数）+ TAM/CAGR 数字区（缺则不渲染）+ 机会评估 badges（缺则不渲染）+ 毛玻璃入口按钮；沿用 `.imc-card` 卡片语言
- [x] 3.2 `frontend/src/components/ChatBubble.tsx`：移动端 market_research 完成态分支 —— 有 `researchId` 渲染 ResearchReportEntryCard（onOpen 回调），无 researchId（历史消息）保持旧 markdown 路径；PC 分支不动

## 4. 前端：调研结果覆盖屏

- [x] 4.1 `frontend/src/pages/mobile-workbench/ScreenResearchReport.tsx`（新）：毛玻璃 sticky 顶栏（‹ 返回 + market_name + 板块构成副标题）+ 长滚动内容区；挂载即调 fetchResearchResult（骨架屏 → 200 渲染 MarketResearchResultCards / 失败显示"报告数据已过期"占位）
- [x] 4.2 `frontend/src/pages/mobile-workbench/mobile-workbench.css`：`.rr-slide-in` / `.rr-slide-out` 动画（300ms，与 bp-slide 同参数）+ `.mrr-*` 毛玻璃皮肤（`.mw` 作用域：半透明白底卡片 + backdrop-filter blur + 骨架屏 shimmer）
- [x] 4.3 `frontend/src/pages/mobile-workbench/ScreenChat.tsx`：`MobileScreen` 联合类型 + `'research-report'`；ChatBubble onOpen → onNavigate('research-report', msgId)
- [x] 4.4 `frontend/src/pages/mobile-workbench/MobileWorkbenchPage.tsx`：researchReportMsgId 状态、覆盖层渲染（position absolute inset 0 zIndex 40）、`handleBack` 映射、`HIDE_TABS` + `'research-report'`、hideTopbar 逻辑、isRrAnimatingOut 300ms 退出时序（与 budget-preview 同构）

## 5. 前端测试

- [x] 5.1 `ResearchReportEntryCard.test.tsx`：完整数据渲染 / 缺 market_size 降级 / 缺 opportunity 降级 / 点击回调 msgId / market_name 空兜底
- [x] 5.2 `ScreenResearchReport.test.tsx`：骨架屏 → 200 渲染板块 / 404 显示过期占位 / 返回按钮回调（mock fetchResearchResult）

## 6. 验证

- [x] 6.1 后端 `pytest` 相关测试全绿
- [x] 6.2 前端 `vitest run` 相关测试 + `tsc --noEmit` 通过
- [x] 6.3 浏览器人工走查：输入"帮我调研下智能手表" → 过程保留 → 摘要卡片 → 点按钮滑入 → 骨架 → 完整结果页（毛玻璃）→ 返回滑出 → 刷新页面后再点按钮仍可用（走后端拉取）
