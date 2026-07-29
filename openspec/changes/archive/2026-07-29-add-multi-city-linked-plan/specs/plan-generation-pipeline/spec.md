## MODIFIED Requirements

### Requirement: 数据引用必须来自 mock 数据或真实 API

所有城市人口、运动指数、赛事数量、达人数量、场馆数量、经营社数量等数据数值 SHALL 来自 `backend/mock_data/` 或真实 API 返回，LLM 禁止编造。9 章方案 `title` / `subtitle` 属于代码常量不属于 mock 范畴，但 LLM 生成的 `content` 中引用的任何厂商 / 赛事 / 达人 / 数据数值 SHALL 只来自上游节点的结构化输出。多城方案中，每座城市的数据 SHALL 各自来自 mock 对应城市条目，LLM 不可跨城编造或混用。

#### Scenario: plan_data_query 节点返回多城数据
- **GIVEN** `brand_input.cities` 为 `["上海", "成都"]`
- **WHEN** `plan_data_query` 节点执行
- **THEN** 输出 SHALL 为 `MultiCityDataOutput`，含 `cities` 数组，每个元素为单城 `CityDataOutput`
- **AND** 每个城市的 `population`、`leagues.count`、`events.monthly`、`influencers.count`、`venues.count`、`stores.count` SHALL 与 mock 数据中对应城市条目一致

#### Scenario: plan_generator 引用的实体只来自上游
- **WHEN** `plan_generator` 生成的 chapter content 提到某个赛事名称
- **THEN** 该名称 SHALL 出现在 `market_research` / `plan_data_query` 等上游节点输出中
- **AND** LLM SHALL 不允许自行编造上游数据未提及的赛事 / 达人 / 厂商

## ADDED Requirements

### Requirement: plan_data_query 节点 SHALL 多城遍历查询

`plan_data_query` 节点 SHALL 读取 `brand_input.cities`（数组），对每座城市调用 `get_city_data(city)` 查询，将各城结果聚合为 `MultiCityDataOutput { cities: [CityDataOutput] }`，数组顺序 SHALL 与 `cities` 输入顺序一致（主城 `cities[0]` 在首位）。`brand_input.cities` 为空或缺失时 SHALL 退化为 `[brand_input.city]` 单城以保持向后兼容。

#### Scenario: 多城遍历输出聚合结构
- **GIVEN** `brand_input.cities` 为 `["上海", "成都", "广州"]`
- **WHEN** `plan_data_query` 节点执行
- **THEN** 输出 SHALL 为 `MultiCityDataOutput`，`cities` 数组长度 SHALL 为 3
- **AND** `cities[0].city` SHALL 为 "上海"（主城在首位）
- **AND** 每个元素 SHALL 为完整的 `CityDataOutput`

#### Scenario: cities 为空时退化为单城
- **GIVEN** `brand_input.cities` 为空或缺失，`brand_input.city` 为 "上海"
- **WHEN** `plan_data_query` 节点执行
- **THEN** 节点 SHALL 以 `["上海"]` 作为查询城市列表
- **AND** 输出 `cities` 数组长度 SHALL 为 1，行为等价单城现状

#### Scenario: 某城市无 mock 数据时报错
- **GIVEN** `cities` 含某座 mock 未覆盖的城市
- **WHEN** `plan_data_query` 遍历到该城市
- **THEN** 节点 SHALL 抛出错误并列出 `list_cities()` 返回的可用城市

### Requirement: strategy_generation 节点 SHALL 分配差异化城市角色

`strategy_generation` 节点 SHALL 基于 `brand_input` 与 `plan_data_query` 的多城数据，由 LLM 为每座城市分配差异化的战略角色定位（枚举示例：`flagship_launch` 旗舰首发 / `experience_cultivation` 体验深耕 / `channel_conversion` 渠道转化 / `community_growth` 社群裂变），主城（`cities[0]`）SHALL 承担 `flagship_launch` 角色。角色分配 SHALL 引用各城数据作为依据，属 LLM 推理结论 / 创意策划（`llm_boundaries.can_generate`）。

#### Scenario: 多城分配差异化角色
- **GIVEN** `cities` 为 `["上海", "成都", "广州"]`
- **WHEN** `strategy_generation` 节点执行
- **THEN** 输出 SHALL 包含每座城市的角色定位
- **AND** 主城 "上海" SHALL 承担 `flagship_launch` 角色
- **AND** 其余城市角色 SHALL 互有差异并引用各城数据作为依据

#### Scenario: 单城时不强制差异化
- **GIVEN** `cities` 仅一座城市
- **WHEN** `strategy_generation` 节点执行
- **THEN** 该城 SHALL 承担 `flagship_launch` 角色，方案行为等价现状

### Requirement: budget_kpi 节点 SHALL 按城市权重分配预算并强制护栏

`budget_kpi` 节点 SHALL 在类目 allocations（达人 / 内容 / 活动 / 投放 / 运营，数值 SHALL 始终来自 `plan_budget_kpi.json` mock 模板，LLM 不可编造）之外，新增城市间预算权重维度：由 LLM 基于各城数据与品牌策略推理分配每座城市的权重百分比。节点 SHALL 对 LLM 城市权重输出强制校验护栏：

- 各城权重之和 SHALL 等于 100%（容差 ±0.5）
- 单城权重 SHALL 限定在 `[10%, 70%]`
- LLM 输出 SHALL 附各城数据引用作为分配依据

校验失败时，节点 SHALL 回退到 `mock_data/multi_city_budget_weight.json` 默认权重模板（按城市数查表），确保最终数值合法且有 mock 来源。

#### Scenario: 多城权重合法分配
- **GIVEN** `cities` 为 `["上海", "成都", "广州"]`，总预算 300 万
- **WHEN** `budget_kpi` 节点执行且 LLM 输出权重 `{上海: 50, 成都: 30, 广州: 20}`
- **THEN** 输出 SHALL 包含每城预算金额（按权重 × 总预算）
- **AND** 各城权重之和 SHALL 为 100%
- **AND** 每城权重 SHALL 在 `[10%, 70%]` 内

#### Scenario: LLM 权重越界时回退 mock 模板
- **GIVEN** LLM 输出某城权重 85%（超出 70% 上限）
- **WHEN** `budget_kpi` 节点校验
- **THEN** 节点 SHALL 丢弃该 LLM 城市权重输出
- **AND** SHALL 回退 `multi_city_budget_weight.json` 中 3 城默认权重
- **AND** 最终各城权重 SHALL 合法且和为 100%

#### Scenario: 类目 allocations 不受 LLM 影响
- **WHEN** `budget_kpi` 节点产出 allocations
- **THEN** 类目（达人 / 内容 / 活动 / 投放 / 运营）的百分比与金额 SHALL 来自 `plan_budget_kpi.json` mock 模板
- **AND** LLM SHALL 不编造类目数值

### Requirement: plan_generator 节点 SHALL 多城并列统一叙事

`plan_generator` 节点 SHALL 保持 9 章 `@@CH:N@@` 结构与流式生成机制不变，但 prompt SHALL 注入 `MultiCityDataOutput` 与各城角色 / 权重，指示 LLM 在正文中以多城并列、统一叙事呈现，并在执行节奏、预算、活动等章节体现跨城协同节奏。正文中引用的盟域 / 达人 / 赛事名称 SHALL 来自 `plan_data_query` 对应城市的 `CityDataOutput`，LLM 不可编造。

#### Scenario: 9 章正文承载多城内容
- **GIVEN** `cities` 为多城，`plan_data_query` 输出多城数据
- **WHEN** `plan_generator` 生成章节 content
- **THEN** content SHALL 涵盖所选各城市
- **AND** 引用的实体名称 SHALL 出现在对应城市的 `CityDataOutput` 中
- **AND** `chapters` 长度 SHALL 仍为 9
