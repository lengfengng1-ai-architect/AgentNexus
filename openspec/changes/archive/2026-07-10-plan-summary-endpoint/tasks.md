## 1. API 定义层

- [ ] 1.1 在 `docs/api/paths/plan.yaml` 中新增 `POST /plan/summary` 端点定义（含 PlanSummaryRequest / PlanSummaryResponse schema）

## 2. 后端：Schema

- [ ] 2.1 创建 `backend/app/schemas/plan_summary.py`，新增：KpiItem / AllocationItem / ExecutionItem / ActionItem / StrategyCard / PlanSummary / PlanSummaryRequest / PlanSummaryResponse

## 3. 后端：Service

- [ ] 3.1 创建 `backend/app/services/plan_summary_service.py`，实现 `generate_plan_summary(run_id)` 函数
  - 调用 `_checkpoint_state(run_id)` 获取 checkpoint 数据
  - 读取 `brand_input` + 各 agent 输出（strategy_generation / execution_planning / budget_kpi / action_recommendations）
  - 用 `with_structured_output(PlanSummary)` 调用 LLM 提炼
  - 返回 PlanSummary 对象
- [ ] 3.2 创建 `backend/app/prompt_templates/plan_summary.md.j2`，定义 LLM 提炼 prompt（传入原始 agent 输出，输出 PlanSummary 各字段）

## 4. 后端：Router

- [ ] 4.1 在 `backend/app/routers/plan.py` 新增 `POST /plan/summary` 路由

## 5. 前端：API

- [ ] 5.1 在 `frontend/src/api/plan.ts` 新增 `getPlanSummary(runId)` 函数

## 6. 前端：ScreenGenerate 改造

- [ ] 6.1 ScreenGenerate 在 status=completed 时调用 getPlanSummary(runId)，存储到 summary state
- [ ] 6.2 生成结果区域从读 outputs._xxx 改为渲染 summary 数据
- [ ] 6.3 保留降级逻辑：summary 请求失败时回退到 outputs._xxx 渲染
- [ ] 6.4 加载中显示骨架屏

## 7. 测试与验证

- [ ] 7.1 编写 `test_plan_summary_service.py`
- [ ] 7.2 编写 `test_plan_summary_endpoint.py`
- [ ] 7.3 前端测试适配
- [ ] 7.4 手动验证完整链路
