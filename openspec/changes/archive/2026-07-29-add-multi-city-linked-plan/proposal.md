## Why

移动端方案生成名义上支持多城，实际是「单城方案 + 下发屏多城倍数展示」：前端 `ScreenBrief` 的「首批城市」虽为多选，但 `ScreenGenerate` 只取 `selected_cities[0]` 作为 `city` 传入后端；`plan_data_query` / `strategy_generation` / `budget_kpi` / `plan_generator` 全程围绕单城运转；下发屏 `ScreenDispatch` 用 `leagueCount × cities.length` 线性放大盟域数，并非真实多城方案。需要让方案生成真正按多城差异化编排联动，使每座城市承担不同角色、预算按城拆分、9 章正文统一呈现跨城协同。

## What Changes

- `brand_input` 新增 `cities` 数组字段；保留 `city` 为主城（`selected_cities[0]`）。修正前端只传首城、以及 XLSX `is_multi_city` 读取 `cities` 字段名不匹配的既有 bug。
- `plan_data_query` 从单城查询改为**多城遍历**，输出结构 `MultiCityDataOutput { cities: [CityDataOutput] }`，保留 `CityDataOutput` 单城结构兼容。
- `strategy_generation` 由 LLM 基于各城数据为每城分配**差异化角色定位**（旗舰首发 / 体验深耕 / 渠道转化 / 社群裂变…），主城为 `selected_cities[0]`。
- `budget_kpi` 新增**城市预算权重**维度：由 LLM 基于各城数据推理分配，满足护栏——各城权重之和 = 100%、单城限定 10%–70%、输出须引用各城数据为依据、代码强制校验、校验失败回退 mock 默认模板。类目 allocations（达人/内容/活动/投放/运营）维持 mock 模板不变。
- `plan_generator` 保持 9 章结构，prompt 改为**多城并列、统一叙事**，体现跨城协同节奏。
- XLSX 表格按城市拆分预算/KPI，并修正 `is_multi_city` 字段名 bug。
- 前端：`ScreenBrief` 的 `CITIES` 补杭州；`ScreenGenerate` 透传 `cities`；`ScreenDispatch` 去掉假倍数、改为真实多城盟域汇总；`ScreenNodePreview` / `ScreenBudgetPreview` 适配多城结构与按城拆分。
- mock 数据覆盖：补深圳的盟域 / 达人 / 经营社明细（遵循 [mock-data 规范](../../conventions/mock-data.md)：真实命名 + 跨文件 ID 可关联）；新增 `mock_data/multi_city_budget_weight.json` 作为城市权重校验失败时的默认回退模板。

### Non-goals

- 独立聊天入口 capability（`activity-planning` / `alliance-planning` / `community-operations`）保持单城，不在本次范围。
- 不触碰项目 out_scope 能力（方案自动执行、跨平台数据接入、效果归因等）。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `plan-generation-pipeline`：`plan_data_query` 由单城改为多城遍历；`strategy_generation` 增加城市角色差异化分配；`budget_kpi` 增加城市预算权重（LLM 分配 + 护栏）；`plan_generator` 改为多城并列叙事。

## Impact

- **能力边界**：in_scope `plan-generation`（[superpowers.yaml](../../superpowers.yaml)）。`budget-analysis` constraints 已修订，放行「城市间预算权重 LLM 分配 + 护栏」，类目 allocations 仍须来自 mock。
- **后端**：`plan_data_query_agent.py`、`plan_generation_service.py`（`_node_inputs` / `PlanState`）、strategy / execution / budget_kpi / plan_generator agent、xlsx 生成。
- **schema**：`plan_generation.py`（`CityDataOutput` → `MultiCityDataOutput`）。
- **prompt 模板**：`plan_generator.md.j2`、`xlsx_generation.md.j2`、strategy / execution 相关模板（Jinja2，无字符串拼接）。
- **前端**：`ScreenBrief`、`ScreenGenerate`、`ScreenDispatch`、`ScreenNodePreview`、`ScreenBudgetPreview`、`api/plan` 类型。
- **API 契约**：`docs/api/paths/plan.yaml` 的 `BrandInputFields` 增 `cities` 字段。
- **mock**：补深圳明细 + `multi_city_budget_weight.json`。
- **测试**：`plan_data_query` 多城遍历、`budget_kpi` 城市权重护栏（和=100% / 单城上下限 / 回退）、前端多城组件。
