# data-query-agent Specification

## Purpose
TBD - created by archiving change add-intent-recognition-agent. Update Purpose after archive.
## Requirements
### Requirement: 数据查询 Agent 可以按城市返回 AllyGo 平台数据摘要

系统 SHALL 提供一个 `data_query` Agent 节点，接收意图识别输出的城市（可选品类），返回该城市在 AllyGo 平台上的盟域、赛事、达人、场馆、经营社、人群画像的 mock 数据摘要。

#### Scenario: 查询上海平台数据
- **GIVEN** 输入 `{ "city": "上海" }`
- **WHEN** 调用 `data_query` 节点
- **THEN** 输出 SHALL 包含 `city` 为 "上海"
- **AND** 输出 SHALL 包含 `leagues`、`events`、`influencers`、`venues`、`stores`、`personas` 中的一项或多项聚合摘要
- **AND** 所有数值 SHALL 来自 `backend/mock_data/` 下的 mock 数据，LLM 不得编造

#### Scenario: 缺少城市字段时返回错误
- **GIVEN** 输入 `{}`
- **WHEN** 调用 `data_query` 节点
- **THEN** 系统 SHALL 抛出 `ValueError`
- **AND** 错误信息 SHALL 提示缺少 `city`

#### Scenario: 查询不存在的城市
- **GIVEN** 输入 `{ "city": "深圳" }`
- **WHEN** 调用 `data_query` 节点
- **THEN** 输出 SHALL 提示该城市暂无 mock 数据
- **AND** `available_cities` SHALL 返回 mock 数据支持的城市列表

### Requirement: 数据查询输出使用统一结构化 Schema

系统 SHALL 使用 Pydantic schema `DataQueryOutput` 约束 `data_query` 节点的输出，字段包括 `city`、`summary`、`data`、`reply`。

#### Scenario: 输出结构校验
- **WHEN** `data_query` 节点返回结果
- **THEN** 结果 SHALL 能通过 `DataQueryOutput` 校验
- **AND** `city` SHALL 非空
- **AND** `reply` SHALL 为用户可读的数据摘要文案

### Requirement: 数据查询 Agent 使用 mock 数据并预留真实 API 切换钩子

系统 SHALL 从 `backend/mock_data/` 读取城市数据，所有厂商/赛事/达人名称和数值必须来自 mock 数据；代码中 SHALL 抽象一个 `DataProvider` 接口，便于后续切换为真实 API。

#### Scenario: Mock 数据来源
- **GIVEN** mock 数据中存在上海的城市数据
- **WHEN** 查询上海
- **THEN** 返回的盟域数量、赛事频次、达人数量 SHALL 与 mock 数据一致

#### Scenario: 切换真实 API 钩子
- **GIVEN** 未来实现真实 `DataProvider`
- **WHEN** 替换实现类
- **THEN** `data_query` 节点的调用方式 SHALL 保持不变

