# Capability: workflow-orchestration

## Purpose

为 AllyGo 营销方案 Agent 提供可配置的 LangGraph 工作流编排底座，使各 Agent 节点能够独立开发、注册，并按 YAML 配置组合成完整工作流。

## ADDED Requirements

### Requirement: Agent 节点可以通过注册表接入底座

系统 SHALL 提供一个 Agent 注册表，允许 Agent 节点按名称注册异步入口函数 `run_<name>(state: dict)`。

#### Scenario: 注册并查询 Agent
- **WHEN** 调用 `registry.register("market_research", run_market_research)`
- **THEN** 系统 SHALL 保存该 Agent
- **AND** 调用 `registry.get_handler("market_research")` SHALL 返回同一 handler

### Requirement: 工作流可以通过 YAML 文件定义

系统 SHALL 从 `backend/workflows/*.yaml` 加载工作流定义，每个定义包含工作流 ID、名称、版本、节点列表和边列表。

#### Scenario: 加载有效工作流 YAML
- **WHEN** 系统启动时 `backend/workflows/` 下存在有效 YAML 文件
- **THEN** 系统 SHALL 成功解析并校验该工作流
- **AND** 通过 `list_workflows()` 可以查询到该工作流摘要

#### Scenario: 工作流引用未注册 Agent 时校验失败
- **WHEN** YAML 中某节点的 `agent` 未在注册表中注册
- **THEN** 系统 SHALL 抛出 `ValueError` 并提示未注册的 Agent 名称

### Requirement: 工作流节点之间可以通过输入映射传递数据

系统 SHALL 支持在 YAML 节点中使用简化 JSONPath 映射（`$.input.xxx`、`$.outputs.node_id.xxx`、`$.state.xxx`）作为 Agent handler 的输入。

#### Scenario: 后序节点使用前序节点输出
- **GIVEN** 工作流包含节点 `extract` 和 `enrich`
- **AND** `enrich` 的 `input_mapping` 为 `{"brand_input": "$.outputs.extract.brand_input"}`
- **WHEN** 运行该工作流
- **THEN** `enrich` handler 接收的 state 中 `brand_input` SHALL 等于 `extract` 节点输出中的 `brand_input`

### Requirement: 工作流可以按拓扑顺序串行执行

系统 SHALL 根据 YAML 中的边构建有向无环图，按拓扑排序串行执行每个节点，最终返回所有节点输出。

#### Scenario: 单节点工作流执行成功
- **GIVEN** 工作流只有一个 `chat_extraction` 节点
- **WHEN** 调用 `/api/v1/workflows/brand_input_extraction/run`
- **THEN** 系统 SHALL 返回 HTTP 200
- **AND** 响应中 `status` SHALL 为 `completed`
- **AND** 响应中 `outputs.extract` SHALL 包含 `brand_input` 字段

#### Scenario: 工作流存在环时执行失败
- **GIVEN** 工作流节点和边构成环
- **WHEN** 系统加载或运行该工作流
- **THEN** 系统 SHALL 返回 HTTP 400
- **AND** 错误信息 SHALL 提示工作流包含循环

### Requirement: 对外暴露工作流运行 API

系统 SHALL 暴露 `GET /api/v1/workflows`、`GET /api/v1/workflows/{workflow_id}`、`POST /api/v1/workflows/{workflow_id}/run` 三个端点。

#### Scenario: 列出工作流
- **WHEN** 调用 `GET /api/v1/workflows`
- **THEN** 系统 SHALL 返回 HTTP 200
- **AND** 响应 SHALL 包含工作流摘要列表

#### Scenario: 运行不存在的工作流
- **WHEN** 调用 `POST /api/v1/workflows/missing/run`
- **THEN** 系统 SHALL 返回 HTTP 404
- **AND** 错误码 SHALL 为 `not_found`

## MODIFIED Requirements

（无）
