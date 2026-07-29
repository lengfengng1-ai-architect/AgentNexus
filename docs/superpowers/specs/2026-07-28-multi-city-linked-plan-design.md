# 多城联动方案生成 — 设计探索草稿

> 状态：brainstorming 产出 / **设计探索草稿，非正式 API 契约**。
> 用途：作为 `/opsx:explore` 的输入草稿。正式规范将进入 `openspec/changes/<change-name>/` 与 `docs/api/paths/plan.yaml`。
> 日期：2026-07-28
> 关联 capability：`plan-generation`（in_scope，[docs/superpowers.yaml](../../../docs/superpowers.yaml)）
> 关联 spec：`openspec/specs/plan-generation-pipeline`、`plan-generation-workbench`

## 1. 背景

移动端方案生成（mobile-workbench）目前名义上支持多城，但实际是「单城方案 + 下发屏多城倍数展示」：

- 前端 [ScreenBrief](../../../frontend/src/pages/mobile-workbench/ScreenBrief.tsx)「首批城市」是多选（`selected_cities: string[]`），但 [ScreenGenerate:112](../../../frontend/src/pages/mobile-workbench/ScreenGenerate.tsx) 只取 `selected_cities[0]` 作为 `city` 传后端。
- 后端 `plan_data_query` / `fitness_analysis` / `activity_planning` / `plan_generator` 全部围绕单城 `city`。
- 下发屏 [ScreenDispatch:36](../../../frontend/src/pages/mobile-workbench/ScreenDispatch.tsx) 用 `leagueCount × cities.length` 线性放大盟域数，并非真实多城方案。
- XLSX 的 `is_multi_city` 开关读 `brand_input.cities`，前端传的是 `selected_cities`，字段名不匹配 → 恒为 `False`。

## 2. 需求决策（brainstorming 已确认）

| 维度 | 决策 |
|---|---|
| 方案形态 | **差异化编排联动**（每城不同角色定位，跨城协同节奏） |
| 联动范围 | **全部可选项**（开放 5 城；含深圳/杭州数据空洞处理） |
| 预算拆分 | **按城市权重分配**（XLSX / KPI 按城市拆） |
| 正文结构 | **9 章内多城并列、统一叙事**（保持 9 章，改动集中在 prompt） |

## 3. mock 数据约束

> 修正（实现期核实）：plan-generation pipeline 从 `allygo_city_data.json` 城市条目读 leagues/events/influencers/stores/venues，深圳/杭州在该文件均已有完整子字段。早先"深圳无明细"判断混淆了 `allygo_city_data`（pipeline 用）与 `leagues.json`（独立 capability 用）。pipeline 6 城全可用，无需补 mock。

前端 `CITIES` 已补杭州（北京/上海/广州/深圳/成都/杭州）。`leagues.json`/`influencers.json`/`stores.json` 的深圳/杭州条目属独立聊天 capability（activity/alliance/community-planning）的 mock，不在本次范围。

## 4. 设计目标

让方案生成 pipeline 真正按多城差异化编排：

1. 多城数据并行查询，下游节点按多城结构消费。
2. 每城分配差异化角色（旗舰首发 / 体验深耕 / 渠道转化 / 社群裂变 …），跨城协同节奏。
3. 预算与 KPI 按城市权重拆分，XLSX 按城展示。
4. 9 章正文多城并列、统一叙事。
5. 下发屏展示真实多城盟域汇总（取代假倍数）。

## 5. 数据流改造

### 5.1 前端（mobile-workbench）

- `ScreenGenerate`：`brandInput` 增 `cities: selected_cities`（**修正字段名**匹配后端读的 `cities`）；保留 `city: selected_cities[0]` 作主城。
- `ScreenBrief`：`CITIES` 对齐 mock（补杭州）；深圳标注「数据有限」或移除。
- `ScreenDispatch`：盟域数从 `plan_data_query` 多城结果聚合，去掉 `× cities.length` 假倍数。
- `ScreenNodePreview` / `ScreenBudgetPreview`：适配多城数据查询结果与按城拆分的预算展示。

### 5.2 PlanState / brand_input

- `brand_input` 增 `cities: list[str]`；`city` 保留为主城（`selected_cities[0]`）。
- `_node_inputs`：`audience_insight` / `plan_data_query` / `fitness_analysis` 从读单 `city` 改为读 `cities`（`plan_data_query` 遍历）。

### 5.3 各节点改造

| 节点 | 当前 | 改造 |
|---|---|---|
| `plan_data_query` | `get_city_data(city)` 单城 | 遍历 `cities` 多城查询，输出 `MultiCityDataOutput { cities: [CityDataOutput] }` |
| `fitness_analysis` | 单城适配 | 多城适配（每城匹配度或主城为主） |
| `strategy_generation` | 单城策略 | 为每城分配角色定位（差异化编排） |
| `execution_planning` | 单城执行 | 多城执行编排 + 跨城协同节奏 |
| `budget_kpi` | 按类目分配 | 类目分配不变（mock 模板）；新增城市权重维度：LLM 推理分配 + 护栏（见决策 2） |
| `plan_generator` | 单城叙事 prompt | 多城并列统一叙事 prompt |
| XLSX | `is_multi_city` bug + 单城 | 修正字段名 + 按城市拆分行/sheet |

## 6. 决策记录（explore 澄清完成）

1. **城市角色分配**：✅ **LLM 基于品牌需求 + 各城数据推理分配**（差异化编排）。主城 = `selected_cities[0]`，其余城市角色由 LLM 定。属 `llm_boundaries.can_generate`（推理结论 / 创意策划），合规。
2. **城市预算权重**：✅ **LLM 自由分配 + 护栏**（用户决策，路 A）。已修订 [superpowers.yaml](../../../docs/superpowers.yaml) `budget-analysis` constraints 放行：各城权重之和 = 100%、单城 10%–70%、须引用各城数据为依据、代码强制校验、失败回退 mock 默认模板（`mock_data/multi_city_budget_weight.json`）。类目 allocations 仍须来自 mock。
3. **数据空洞城市**：✅ **杭州补进前端 `CITIES`**（mock 已有完整明细）；**深圳补盟域 / 达人 / 经营社 mock 明细**（遵循 [mock-data 规则](../conventions/mock-data.md)：真实命名 + 跨文件 ID 可关联）。
4. **`MultiCityDataOutput` 结构**：✅ **数组** `{cities: [CityDataOutput]}`（保留 `city` 字段，与现有 `CityDataOutput` 兼容，下游 prompt 遍历）。
5. **影响范围边界**：✅ 仅限 `plan-generation` pipeline + 移动端 workbench。独立聊天入口 capability（`activity-planning` / `alliance-planning` / `community-operations`）保持单城，不在本次范围。

## 7. 影响范围

- 前端：`ScreenBrief`、`ScreenGenerate`、`ScreenDispatch`、`ScreenNodePreview`、`ScreenBudgetPreview`。
- 后端：`plan_data_query_agent`、`plan_generation_service`（`_node_inputs` / `PlanState`）、`fitness_analysis`、`strategy_generation`、`execution_planning`、`budget_kpi`、`plan_generator`、`xlsx` 模板。
- schema：`plan_generation.py`（`CityDataOutput` → 多城）。
- prompt：`plan_generator.md.j2`、`xlsx_generation.md.j2`、strategy / execution 相关模板。
- mock：补杭州到前端 `CITIES`；深圳降级标注。
- OpenSpec：`docs/api/paths/plan.yaml`（`brand_input` 增 `cities`）+ 新 change。

## 8. 风险

- prompt 复杂度上升（多城叙事），9 章 token 压力（已有 [plan-generator-performance](./2026-07-07-plan-generator-performance.md) 设计需复核）。
- 多城数据查询耗时随城市数线性增长（MVP 顺序遍历可接受；升级路径：并行查询）。
- 深圳降级叙事质量。

## 9. 下一步

进入 `/opsx:explore 多城联动方案生成`，澄清第 6 节开放问题 → `/opsx:propose add-multi-city-linked-plan` → `/opsx:apply` → `/opsx:archive`。
