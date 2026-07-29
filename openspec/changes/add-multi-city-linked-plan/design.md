## Context

当前 `plan-generation-pipeline` 的 `brand_input.city` 单值从 `_node_inputs`（[plan_generation_service.py:431](../../../backend/app/services/plan_generation_service.py)）流转到 `plan_data_query` / `fitness_analysis` 等节点；`plan_data_query` 调 `get_city_data(city)` 单城查询，输出单城 `CityDataOutput`；`strategy_generation` / `budget_kpi` / `plan_generator` 均围绕单城。前端 `ScreenBrief` 虽多选城市，`ScreenGenerate` 仅取 `selected_cities[0]` 传入。结果：方案正文单城叙事，下发屏 `ScreenDispatch` 用 `leagueCount × cities.length` 线性放大盟域数（假多城）；XLSX 的 `is_multi_city` 读 `brand_input.cities` 而前端传的是 `selected_cities`，字段名不匹配 → 恒为 `False`。

多城 mock 数据已具备：上海/北京/广州/成都/杭州明细齐全，深圳仅顶层汇总（本次补齐）。`budget-analysis` constraints 已修订放行「城市间预算权重 LLM 分配 + 护栏」。**数据流全部来自本地 mock**（`allygo_city_data.json` / `leagues.json` / `influencers.json` / `stores.json`），MVP 阶段无真实 API。

## Goals / Non-Goals

**Goals:**
- pipeline 按多城差异化编排：多城数据查询、城市角色分配、城市预算权重、9 章多城并列叙事。
- 守住数据合规：城市权重数值有护栏 + mock 回退；类目 allocations 仍来自 mock；命名引用（盟域/达人/赛事）来自 mock 不编造。
- 修正既有 bug（`ScreenGenerate` 只传首城、`is_multi_city` 字段名不匹配）。

**Non-Goals:**
- 独立聊天入口 capability（`activity-planning` / `alliance-planning` / `community-operations`）多城化。
- 多城数据并行查询（MVP 顺序遍历，预留并行升级）。
- 真实 API 接入。

## Decisions

### D1: `cities` 数组 + 主城保留
`brand_input` 新增 `cities: list[str]`；`city` 保留 = `cities[0]` 作主城，兼容现有读 `city` 的节点（`fitness_analysis` 等）。
*替代方案*：废弃 `city` 全用 `cities` → 需改所有读 `city` 的节点，破坏面大。选兼容方案。

### D2: `MultiCityDataOutput = { cities: [CityDataOutput] }`
`plan_data_query` 遍历 `cities`，复用 `_build_output` 构造每城 `CityDataOutput`，聚合为 `MultiCityDataOutput`。保留 `CityDataOutput` 单城结构，下游 prompt 遍历 `cities`。
*替代方案*：`{by_city: {城: data}}` 字典 → 顺序信息丢失，prompt 难保主城优先。选数组。

### D3: 城市角色由 `strategy_generation` 的 LLM 分配
属 `llm_boundaries.can_generate`（基于数据的推理结论 / 创意策划）。主城 = `cities[0]`，其余城市角色由 LLM 定。不引入固定角色模板（YAGNI）。

### D4: 城市预算权重 LLM 分配 + 护栏（核心合规决策）
`budget_kpi` 让 LLM 输出每城权重，代码强制校验：
- 各城权重之和 = 100%（容差 ±0.5）
- 单城权重 ∈ [10%, 70%]
- LLM 须附各城数据引用作为分配依据（prompt 强制要求）

校验失败 → 回退 `mock_data/multi_city_budget_weight.json` 默认模板（按城市数查表）。类目 allocations 维持 `plan_budget_kpi.json` mock 模板，不受 LLM 影响。
*合规依据*：[superpowers.yaml](../../superpowers.yaml) `budget-analysis` constraints 已放行（带护栏）；护栏确保最坏情况数值仍有 mock 来源。

### D5: 9 章结构不变，prompt 多城并列
`plan_generator.md.j2` 改造：`city_data` 注入 `MultiCityDataOutput`，prompt 指示多城并列叙事 + 跨城协同节奏。`@@CH:N@@` 9 段标记与解析逻辑不变。

### D6: prompt 模板规范
遵循 [docs/conventions/prompt-templates.md](../../conventions/prompt-templates.md)：Jinja2 渲染，禁止字符串拼接，每个模板变量须有 service 层来源。新增变量 `cities` / `city_roles` / `city_weights` 来自 pipeline state。

### D7: Agent 框架
沿用 LangGraph `StateGraph` + DeepAgents（[docs/conventions/agent-framework.md](../../conventions/agent-framework.md)），不引入新框架。多城遍历在 `plan_data_query` 节点内顺序循环（async for）。

### D8: 接口契约
[docs/api/paths/plan.yaml](../../api/paths/plan.yaml) 的 `BrandInputFields` 增 `cities: array<string>`。SSE 事件 schema 不变（`plan_data_query` 的 `node.complete.output` 结构变化，由前端按新结构适配）。

## Risks / Trade-offs

- **[9 章 token 压力上升（多城数据注入）]** → 复核 [plan-generator-performance](../specs/2026-07-07-plan-generator-performance.md) 设计；`MultiCityDataOutput` 注入 prompt 时精简字段，只保留每城 prompt 必需项。
- **[多城查询耗时随城市数线性增长]** → MVP 顺序遍历可接受（≤5 城）；升级路径 `asyncio.gather` 并行。
- **[LLM 城市权重幻觉 / 越界]** → D4 护栏 + mock 回退兜底，确保最终数值合法且有 mock 来源。
- **[深圳降级叙事质量]** → 补深圳 mock 明细后该风险消除。
- **[`MultiCityDataOutput` 结构变更影响 `ScreenNodePreview`]** → 前端适配列为 task，测试覆盖。

## Migration Plan

1. 后端先行：`MultiCityDataOutput` schema + `plan_data_query` 多城遍历 + `budget_kpi` 城市权重护栏 + prompt 模板，单测覆盖。
2. 前端跟进：`CITIES` 补杭州、`ScreenGenerate` 透传 `cities`、`ScreenDispatch` 真实汇总、`ScreenNodePreview` / `ScreenBudgetPreview` 适配。
3. mock 补充：深圳盟域 / 达人 / 经营社明细 + `multi_city_budget_weight.json`。
4. **回滚**：`brand_input.cities` 为空时，`plan_data_query` 退化为单城（`cities = [city]`），整个 pipeline 行为等价现状。

## Open Questions

explore 阶段已澄清 5 项（见 [design doc 决策记录](../specs/2026-07-28-multi-city-linked-plan-design.md)），无遗留。
