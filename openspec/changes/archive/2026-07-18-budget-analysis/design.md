## Context

用户希望药丸快捷入口（预算评估）从"直达/预填"改为"多轮问答 + mock 数据建议"。这是路径 C Pilot：药丸发种子消息 → 意图判 budget_assessment → 多轮 clarify 收 4 字段 → 预算计算 → 入口卡 + 详情页。

关键同构：整个流程与已实现的**市场调研（market-analysis）**同构——SSE 流式 + 结果 JSON 持久化 + 聊天入口卡 + 详情覆盖屏。约 70% 复用 market-analysis / research-report-page 的模式。

可用基建：
- intent_recognition 的 clarify 多轮机制（已收集 budget/period/category/city 字段）
- `plan_budget_kpi.json` mock（allocations 30/15/25/20/10 + KPI + timeline，total_budget=200，period=3）
- `allygo_city_data.json`（按城市数据，MVP 仅关联预留）
- ScreenBudgetPreview 已有 KPI 按预算比例缩放的算法（kpiBase × budget/baseBudget）

## Goals / Non-Goals

**Goals:**
- 预算评估药丸 → 多轮收 category/budget/period/city → 预算计算（模板分配 + KPI 缩放 + LLM 建议）
- 聊天入口卡（条形图+KPI+建议+按钮）+ 毛玻璃详情覆盖屏
- 结果持久化按 ID 拉取，刷新可用
- 镜像 market-analysis / research-report-page 模式，最大化复用

**Non-Goals:**
- allocations 按品类优化（MVP 固定模板百分比）
- 自动花钱/下单/执行（out_scope）
- 其他药丸多轮改造（仅预算评估 Pilot）
- PC 端

## Decisions

### D1: 镜像 market-analysis 全流程（SSE + 持久化 + 入口卡 + 详情页）

| 维度 | market-analysis（已实现） | budget-analysis（本变更） |
|------|--------------------------|--------------------------|
| service | market_analysis_service.analyze_stream | budget_analysis_service.analyze_stream |
| 持久化 | save_research_result（mr-\<uuid8\>） | save_budget_result（ba-\<uuid8\>） |
| GET | /market-analysis/results/{id} | /budget-analysis/results/{id} |
| 入口卡 | ResearchReportEntryCard | BudgetAssessmentEntryCard |
| 详情屏 | ScreenResearchReport | ScreenBudgetAssessment |
| stream hook | useMarketResearchStream | useBudgetAssessmentStream |

### D2: 多轮复用 clarify，字段齐后路由 budget_assessment

预算评估的 4 字段（category/budget/period/city）全在现有意图抽取规则内。复用 clarify 多轮收集；字段齐后 intent=budget_assessment 触发预算计算（而非 generate_plan）。新增的只是意图分流规则 + budget_assessment 的执行分支。

### D3: allocations 固定模板百分比 × 用户预算

ponytail：MVP 用 plan_budget_kpi.json 的固定百分比（达人30/内容15/活动25/投放20/运营10）× 用户预算。天花板：不分品类、不按城市调权；升级路径：按 category_fitness / city 数据调权。注释标明天花板与升级路径。

### D4: KPI 按 budget 比例缩放（复用 ScreenBudgetPreview 算法）

base KPI（plan_budget_kpi）× (用户预算/模板预算200万)。复用 ScreenBudgetPreview 的 kpiBase × ratio 思路（移动端预算预览页已验证）。

### D5: 一句话建议由 LLM 生成

LLM 基于 allocations + KPI + category/city 数据生成一句话建议（数据驱动推理，符合数据引用规则——不编造厂商/赛事/达人名称或数据数值，仅基于已有数据推理）。prompt 模板 `budget_suggestion.md.j2`。

### D6: budget_assessment_id 流水线（仿 research_id）

SSE result 事件携带 `budget_assessment_id`；前端 reducer 持久化到 message.budgetAssessmentId；localStorage chat history 保存；ChatBubble 据此渲染入口卡；详情屏按 ID 拉取。

### D7: superpowers.yaml 新增 budget-analysis（人工）

`docs/superpowers.yaml` 需新增 in_scope 条目 `budget-analysis`。AI 不定义能力边界——此条目由人确认/添加（proposal/tasks 标为前置项，apply 写代码前确认）。

### D8: OpenAPI 契约字段语义需人确认

`docs/api/paths/budget-analysis.yaml` 由 AI 草拟（镜像 market-analysis.yaml），但**字段语义/枚举值由人确认**（CLAUDE.md：API 契约是人决定）。apply 时草拟后标记待确认。

## Risks

1. **多轮 clarify 路由分支**：现有 clarify 绑定 generate_plan。budget_assessment 需在"字段齐后"判断目标是预算计算还是全量方案。需在意图识别/聊天调度处加 target 区分，避免误触发全量流水线。
2. **城市字段与 mock 关联**：MVP city 仅预留（不改变分配），但用户可能期望城市影响成本。D3 标明天花板，后续按 city 数据调权。
3. **规模**：本 change 较大（新意图+service+2端点+持久化+前端卡+页+多轮）。建议分阶段实现（先后端 SSE+持久化+入口卡跑通，再打磨详情页可视化）。
4. **capability 未入 yaml**：apply 前需人添加 superpowers.yaml 条目，否则违反 Step 6。
