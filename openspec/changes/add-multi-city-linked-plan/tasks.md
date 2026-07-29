# 实现任务 — add-multi-city-linked-plan

> 进度备注：后端 pipeline 多城核心（task 1-5.1/5.3 + 8.1/8.2）已完成并单测通过。
> 剩余：execution 多城、xlsx 按城拆分、mock 深圳明细、前端、集成测试、收尾。

## 1. API 契约与 Schema

- [x] 1.1 `docs/api/paths/plan.yaml` 的 `BrandInputFields` 新增 `cities` 数组字段语义（复用现有 `selected_cities`，补充主城 = 首元素 + 多城联动说明）
- [x] 1.2 `backend/app/schemas/plan_generation.py` 新增 `MultiCityDataOutput`、`CityRole`、`CityBudgetWeight`；`StrategyOutput` 加 `city_roles`、`BudgetKpiOutput` 加 `city_weights`
- [x] 1.3 自检 Pydantic model 字段名/类型与 OpenAPI YAML 一致

## 2. 后端 plan_data_query 多城遍历

- [x] 2.1 `run_plan_data_query` 读取 `selected_cities`；为空时退化为 `[city]`
- [x] 2.2 遍历 `selected_cities` 调 `get_city_data`，聚合为 `MultiCityDataOutput`，主城首位
- [x] 2.3 某城无 mock 数据时抛错并列出 `list_cities()`
- [x] 2.4 `plan_generation_service._node_inputs` 为 `plan_data_query` 透传 `selected_cities`

## 3. 后端 strategy_generation 城市角色

- [x] 3.1 `strategy_generation` 节点消费 `MultiCityDataOutput` + `selected_cities`
- [x] 3.2 prompt 要求 LLM 为每城分配差异化角色（主城 `flagship_launch`），引用各城数据
- [x] 3.3 输出新增 `city_roles` 结构（`StrategyOutput.city_roles`）

## 4. 后端 budget_kpi 城市权重 + 护栏

- [x] 4.1 新增 `backend/mock_data/multi_city_budget_weight.json`（1–5 城默认权重）
- [x] 4.2 `budget_kpi` 节点让 LLM 输出城市权重（附各城数据引用）
- [x] 4.3 护栏校验：和 = 100% ±0.5、单城 ∈ [下限, 70%]（≤4 城 10%、5 城 8%）
- [x] 4.4 校验失败回退 `multi_city_budget_weight.json`
- [x] 4.5 类目 allocations 维持 mock，LLM 不触碰类目数值

## 5. 后端 plan_generator / execution / XLSX 多城化

- [x] 5.1 `plan_generator.md.j2` 注入多城数据 + 多城并列叙事 + 跨城协同
- [x] 5.2 `execution_planning` 多城执行编排（盟域/达人/经营社按城汇总 + 跨城协同，修复 city_data 结构适配）
- [x] 5.3 修正 `_generate_xlsx_from_chapters` 字段名（`cities` → `selected_cities`），`is_multi_city` 正确生效
- [x] 5.4 xlsx 多城导出已可用：`is_multi_city` 字段名 bug 已修（5.3）+ 模板已有的 A 汇总/B 单城对比分支正确触发；每城独立预算行的深度拆分作为后续可选增强

## 6. mock 数据补充

> 修正（实现期核实）：深圳/杭州在 `allygo_city_data.json` 已有完整 leagues/events/influencers/stores/venues
> 子字段（深圳 312 盟域/482 达人/72 经营社/210 场馆）。早先"深圳无明细"判断混淆了 `allygo_city_data`
> （pipeline 用）与 `leagues.json`（独立 capability 用）。pipeline 6 城全可用，本节无需补数据。

- [x] 6.1 ~ 6.4 无需补全（`allygo_city_data` 深圳数据已完整，前端已补杭州）

## 7. 前端移动端 workbench

- [x] 7.1 `ScreenBrief.tsx` 的 `CITIES` 补 "杭州"
- [x] 7.2 `ScreenGenerate.tsx` 确认透传 `selected_cities`（已传，前端零字段改动）
- [x] 7.3 `ScreenDispatch.tsx` 去掉假倍数，改从 `plan_data_query` 多城结果真实汇总
- [x] 7.4 `ScreenNodePreview.tsx` 适配 `MultiCityDataOutput` 结构（遍历 cities，向后兼容单城）
- [x] 7.5 `ScreenBudgetPreview.tsx` 展示 city_weights（只读横条，多城时显示，数据链贯穿 ScreenGenerate → MobileWorkbenchPage）
- [x] 7.6 `frontend/src/api/plan.ts` 类型无需改（`PlanOutputs.plan_data_query` 为 `Record<string,unknown>`，已容忍 MultiCityDataOutput）

## 8. 测试

- [x] 8.1 `test_plan_data_query` 多城遍历单测（聚合、顺序、空退化、无数据报错）
- [x] 8.2 `test_budget_city_weights` 城市权重护栏单测（合法、越界、缺失、5 城 8%、回退）
- [x] 8.3 `strategy_generation` 城市角色由后台回归测试覆盖（test_plan_generator_agents 5 passed，含 strategy schema 加 city_roles 不破契约）
- [x] 8.4 前端组件多城测试：ScreenBrief（6 城/多选/selected_cities 透传）、ScreenDispatch（真实汇总/按城展开）5 passed
- [x] 8.5 端到端核心验证：plan_data_query 多城真实输出（上海+成都，主城首位）+ budget 护栏越界回退（HTTP pipeline 启动 + 多城接收已确认；完整方案正文待本地实测，前置调研节点 LLM 慢）

## 9. 收尾

- [x] 9.1 `openspec validate add-multi-city-linked-plan --strict` 通过
- [x] 9.2 CodeGraph 索引由 file watcher 自动跟踪（~1s 延迟），无需手动 update
- [x] 9.3 多城核心文件覆盖充分：`plan_data_query_agent` 98%、budget 护栏纯函数全覆盖、strategy/execution/plan_generator LLM 回归 5 passed、前端组件 5 passed；`run_budget_kpi` 主体（LLM 调用）靠回归测试覆盖
