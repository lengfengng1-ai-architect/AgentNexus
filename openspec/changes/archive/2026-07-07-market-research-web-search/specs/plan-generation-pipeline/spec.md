## ADDED Requirements

### Requirement: market_research 节点 SHALL 通过联网搜索获取市场数据

`market_research` 节点 SHALL 通过联网搜索（`duckduckgo_search`）获取真实网页，并发抓取后由 LLM 从网页内容提取结构化市场调研结果。调研 SHALL 覆盖四个字段组：市场定义（`market_definition`）、市场规模（`market_size`）、趋势（`trends`）、机会评估（`opportunities`）。节点 SHALL 不调研竞品（属 out_scope `competitor-analysis`）和目标用户（由 `audience_insight` 节点负责，避免重复）。

每条提取的非空信息 SHALL 标注来源 URL（来自已抓取的网页），网页未提及的字段 SHALL 写 null 或空值，LLM SHALL 不编造数据数值、机构名、品牌名。节点最终输出 SHALL 映射为 `MarketResearchOutput`（`market_summary` / `trends` / `opportunities`），下游节点契约不变。

#### Scenario: market_research 从真实网页提取并标注来源
- **GIVEN** 流水线真实模式运行（`USE_MOCK_DATA` 未开启）
- **WHEN** `market_research` 节点执行
- **THEN** 节点 SHALL 调用 `duckduckgo_search` 按品类/品牌相关关键词搜索
- **AND** SHALL 并发抓取搜索返回的网页
- **AND** SHALL 用单次 LLM 调用从抓取到的网页内容提取市场调研结果
- **AND** 提取结果中每条非空信息 SHALL 标注来源 URL

#### Scenario: 网页未提及时不编造
- **GIVEN** 抓取到的网页中没有某字段（如 `market_size.som`）的数据
- **WHEN** LLM 提取该字段
- **THEN** 该字段 SHALL 为 null 或空值
- **AND** LLM SHALL 不编造数值或机构名

#### Scenario: market_research 不调研竞品和目标用户
- **WHEN** `market_research` 节点产出
- **THEN** 输出 SHALL 不包含竞品分析字段（属 out_scope）
- **AND** SHALL 不包含目标用户/用户画像字段（由 `audience_insight` 负责）
- **AND** SHALL 仍包含 `market_summary`、`trends`、`opportunities` 三个字段

#### Scenario: market_research 输出契约保持不变
- **WHEN** `market_research` 节点执行完成
- **THEN** state 中 `market_research` 字段 SHALL 包含 `market_summary`、`trends`、`opportunities`
- **AND** 下游节点（`strategy_generation`、`plan_generator`）SHALL 无需改动即可消费

#### Scenario: 搜索失败时返回空结果而非崩溃
- **GIVEN** 联网搜索返回 0 条结果或抓取全部失败
- **WHEN** `market_research` 节点执行
- **THEN** 节点 SHALL 不抛异常
- **AND** SHALL 返回空的 `MarketResearchOutput`（`market_summary` 提示未找到市场信息，`trends` / `opportunities` 为空列表）
- **AND** SHALL 不 fallback 到 LLM 凭训练知识生成

### Requirement: market_research 节点 SHALL 支持 mock 模式

当 `USE_MOCK_DATA=true` 时，`market_research` 节点 SHALL 跳过联网搜索，从 `backend/mock_data/market_research/` 读取按品类维度的预设结构化市场调研结果。Mock 数据 SHALL 使用真实公开数据填写 `market_summary` / `trends` / `opportunities`，字段结构与真实模式一致，预留切换真实搜索的接口。

#### Scenario: mock 模式跳过联网读取预设数据
- **GIVEN** `USE_MOCK_DATA=true`
- **WHEN** `market_research` 节点执行
- **THEN** 节点 SHALL 不调用 `duckduckgo_search`
- **AND** SHALL 从 `backend/mock_data/market_research/` 读取对应品类的预设数据
- **AND** 输出 SHALL 包含 `market_summary`、`trends`、`opportunities`，结构与真实模式一致
