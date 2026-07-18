## 0. 前置（人工确认）

- [ ] 0.1 **人在 `docs/superpowers.yaml` 新增 `budget-analysis` in_scope 条目**（AI 不定义能力边界；apply 写代码前确认已添加）

## 1. 后端 — schema + OpenAPI 契约

- [x] 1.1 新增 `app/schemas/budget_analysis.py`：BudgetAssessmentRequest（category/budget/period/city）、BudgetAllocation、BudgetAssessmentResult（allocations/kpis/timeline/suggestion/total_budget/period_months/category/city）
- [x] 1.2 新增 `docs/api/paths/budget-analysis.yaml`（镜像 market-analysis.yaml）：POST /budget-analysis/stream（SSE）、GET /budget-analysis/results/{id}（200/404/500）；**字段语义/枚举由人确认**

## 2. 后端 — service + 持久化

- [x] 2.1 新增 `app/services/budget_analysis_service.py`：`analyze_stream`（SSE：进度 + result）、`save_budget_result`（写 `budget_analysis/results/ba-<uuid8>.json`）、`get_budget_result`（按 ID 读，正则校验 `^ba-[0-9a-f]{8}$`）
- [x] 2.2 allocations 计算：plan_budget_kpi.json 固定百分比 × 用户 budget（ponytail 注释天花板）
- [x] 2.3 KPI 缩放：base KPI × (budget/200) 比例（复用 ScreenBudgetPreview 思路）
- [x] 2.4 timeline：按 period 月数生成（复用 plan_budget_kpi timeline 模板按月拆）
- [x] 2.5 一句话建议：调 LLM（`budget_suggestion.md.j2` prompt，基于 allocations 数据，不编造名称/数据）
- [x] 2.6 result 事件携带 budget_assessment_id（先写盘后发）

## 3. 后端 — router

- [x] 3.1 新增 `app/routers/budget_analysis.py`：POST /budget-analysis/stream（SSE）、GET /budget-analysis/results/{id}（sync def，文件 IO 进线程池；404 不存在/无效、500 异常）
- [x] 3.2 注册 router 到 main
- [x] 3.3 `.gitignore` 增加 `backend/mock_data/budget_analysis/results/`

## 4. 后端 — 意图识别

- [x] 4.1 intent_recognition prompt/rules 新增 budget_assessment 意图：关键词"预算评估/预算分配/预算分析"；字段齐（category/budget/period/city）→ budget_assessment；缺 → 保持意图 + 反问（镜像 market_research）
- [x] 4.2 区分 generate_plan：完整方案请求仍走 generate_plan（规则 7 排除预算评估），不受影响
- [x] 4.3 意图 schema 的 intent 枚举新增 budget_assessment（后端 done；前端类型在阶段 2 同步）

## 5. 前端 — API + types + stream hook

- [x] 5.1 新增 `api/budgetAnalysis.ts`：fetchBudgetResult（404→NotFoundError）、类型
- [x] 5.2 `types/chat.ts`：ChatMessage 新增 `budgetAssessmentId?` + `canStartBudgetAssessment?` + `budgetAssessmentResult?`
- [x] 5.3 新增 `hooks/useBudgetAssessmentStream.ts`（镜像 useMarketResearchStream）：SSE 解析、result 取 budget_assessment_id、dispatch
- [x] 5.4 useChat reducer：SET_BUDGET_ASSESSMENT_RESULT action + INTENT_RECEIVED 算 canStartBudgetAssessment

## 6. 前端 — 入口卡 + 详情页

- [x] 6.1 新增 `components/BudgetAssessmentEntryCard.tsx`：迷你分配条形图（5 类百分比）+ KPI 数字 + 一句话建议 + "查看预算详情"按钮
- [x] 6.2 新增 `components/budget-assessment-entry.css`（毛玻璃，仿 research-report-entry.css）
- [x] 6.3 新增 `pages/mobile-workbench/ScreenBudgetAssessment.tsx`（镜像 ScreenResearchReport）：毛玻璃顶栏 + skeleton + 详情（大条形图 + KPI 栅格 + timeline + 建议）+ 404/error 占位
- [x] 6.4 mobile-workbench.css：预算覆盖屏 slide-in/out + 毛玻璃样式（复用 rr-/mrr- 模式，.mbu-*）

## 7. 前端 — 接入

- [x] 7.1 ChatBubble：message.budgetAssessmentId 存在时渲染 BudgetAssessmentEntryCard（onOpen 回调）
- [x] 7.2 ScreenChat：handleOpenBudgetAssessment（找 message、取 id、onNavigate）；ChatBubble 传 onOpenBudgetAssessment；预算评估自动触发 effect
- [x] 7.3 MobileWorkbenchPage：budget 覆盖屏状态 + handleBudgetBack + handleChatNavigate 分支 + 渲染覆盖屏 + hideTopbar/HIDE_TABS/DEFAULT_TOPBAR/handleBack
- [x] 7.4 预算评估药丸：handlePromptClick 的 prefill-brand-template 分支改为 send-text 种子消息"帮我做预算评估"

## 8. 测试

- [x] 8.1 后端：test_budget_analysis_service（save/get 往返、去重 ID、无效 ID、损坏文件、GET 200/404、allocations 求和、KPI 缩放、timeline、analyze_stream 携带 budget_assessment_id）— 19 测试通过
- [x] 8.2 后端：allocations 计算（百分比×预算、求和=预算）、KPI 缩放比例正确性
- [x] 8.3 前端：BudgetAssessmentEntryCard 渲染（条形图/KPI/建议/按钮，5 测试）+ ScreenBudgetAssessment（skeleton→详情、404、error、onBack、fallbackTitle，5 测试）— 10 测试通过
- [x] 8.4 tsc + vitest 无回归（9 失败全为预存 ChatInput/MarketResearchProgressCard/PipelineTimeline/PlanPage/ScreenChat.hero）

## 9. 浏览器验证

- [x] 9.1 点预算评估药丸 → 种子消息"帮我做预算评估" → intent 识别 budget_assessment → 多轮反问缺字段（品类/城市/预算/周期）✓
- [x] 9.2 补齐 4 字段 → 预算计算（SSE 流）→ 入口卡渲染（5 条形图 + 4 KPI + LLM 建议 + 按钮）✓
- [x] 9.3 点"查看预算详情" → 详情覆盖屏 slide-in + 毛玻璃（topbar blur20px / card blur14px）→ 3 卡片（预算分配/KPI/时间线）✓
- [x] 9.4 修复两个 intent bug：(a)"品类"清除逻辑误伤 budget_assessment（guard 到 market_research）；(b)category 兜底正则补"X品类"模式 → category 可靠提取

## 10. 额外（intent bug 修复，验证中发现）

- [x] 10.1 `intent_recognition_agent.py`："品类"清除 category 逻辑加 `intent == "market_research"` 守卫（budget_assessment 回复合法含"品类"）
- [x] 10.2 `_CATEGORY_PATTERNS` 增加 `([一-龥]{2,8})品类` 兜底（"运动鞋品类" → 运动鞋），使 category 提取不依赖 LLM 稳定性
