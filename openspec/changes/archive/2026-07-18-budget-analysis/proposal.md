## Why

移动端药丸快捷入口（如预算评估）当前只做直达/预填（填模板到输入框），用户需手动补全。用户希望药丸作为对话入口，启动**意图识别多轮问答**，逐步问清需求（品类/预算/周期/城市），结合系统 mock 数据给出**聚焦的预算评估建议**（预算分配 + KPI 预估 + 一句话建议），并提供独立详情页查看。这是"药丸→多轮问答+mock 建议"Pilot（路径 C），先做预算评估，跑通后扩展到创建活动等。

## What Changes

- 新增 capability `budget-analysis`（**需人在 docs/superpowers.yaml 添加 in_scope 条目**，AI 不定义能力边界）
- 意图识别新增 `budget_assessment` 意图（关键词"预算评估/预算分配"），复用现有 clarify 多轮机制收集 category/budget/period/city 四字段
- 字段齐后触发预算计算（非全量 generate_plan 流水线）：allocations（固定模板百分比 × 用户预算）+ KPI 预估（base × 预算比例缩放）+ timeline（按周期）+ 一句话建议（LLM 基于 allocations 推理）
- 结果持久化（JSON-by-ID，仿 research results）+ GET 端点供详情页拉取
- 聊天入口卡 `BudgetAssessmentEntryCard`（迷你条形图 + KPI + 一句话 + 查看按钮）
- 详情覆盖屏 `ScreenBudgetAssessment`（slide-in-right + 毛玻璃，仿调研结果页）
- 预算评估药丸从 prefill-brand-template 改为 send-text 种子消息

## Capabilities

### New Capabilities

- `budget-analysis`: 基于品类/预算/周期/城市，结合 mock 数据给出预算分配建议、KPI 预估、一句话建议，含多轮澄清与结果详情页

### Modified Capabilities

- `mobile-chat-session`: 预算评估药丸改为 send-text 种子消息；ChatBubble 新增 budget_assessment 入口卡分支
- `intent-recognition`: 新增 budget_assessment 意图分流（关键词触发，复用 clarify 收集 category/budget/period/city）

## Impact

**后端**（新）：
- `app/services/budget_analysis_service.py`：analyze_stream（SSE）+ save/get_budget_result（JSON 持久化）+ allocations/KPI 计算 + LLM 建议
- `app/routers/budget_analysis.py`：`POST /budget-analysis/stream`（SSE）、`GET /budget-analysis/results/{id}`
- `app/schemas/budget_analysis.py`：请求/响应模型
- `app/prompt_templates/budget_suggestion.md.j2`：一句话建议 prompt
- `docs/api/paths/budget-analysis.yaml`：OpenAPI 契约（**字段语义需人确认**）
- `backend/mock_data/budget_analysis/results/`：运行时持久化（gitignore）
- intent_recognition prompt/rules：新增 budget_assessment 意图

**前端**（新）：
- `BudgetAssessmentEntryCard.tsx` + css
- `ScreenBudgetAssessment.tsx`
- `useBudgetAssessmentStream.ts`
- `api/budgetAnalysis.ts`
- ChatBubble / ScreenChat / MobileWorkbenchPage / chat types：接入 budgetAssessmentId + 覆盖屏
- 预算评估药丸改 send-text

**Non-goals**：
- 自动花钱/下单/执行预算（out_scope：只输出规划建议）
- allocations 按品类优化（MVP 固定模板百分比，ponytail）
- 其他药丸（创建活动/创建盟域等）的多轮改造（本 Pilot 只做预算评估，跑通后扩展）
- PC 端（仅移动端）
