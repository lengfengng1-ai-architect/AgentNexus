# Capability: plan-generation-pipeline

## Purpose

为 AllyGo 营销方案 Agent 提供从品牌需求到完整 9 章营销方案的后端生成流水线，通过 9 个串行 Agent 节点分别完成需求校验、市场调研、人群洞察、平台数据查询、适配度分析、策略生成、执行规划、预算 KPI 测算和行动建议，最终输出结构化方案内容。

## Requirements

### Requirement: 系统 SHALL 提供 plan_generation_pipeline 工作流

系统 SHALL 新增 `plan_generation_pipeline` 工作流，包含 9 个串行 Agent 节点，用于基于 `brand_input` 生成完整营销方案。

#### Scenario: 工作流成功加载
- **WHEN** 系统启动时 `backend/workflows/plan_generation_pipeline.yaml` 存在且有效
- **THEN** 系统 SHALL 成功解析并校验该工作流
- **AND** 调用 `GET /api/v1/workflows/plan_generation_pipeline` SHALL 返回工作流定义

#### Scenario: 运行工作流生成方案
- **GIVEN** 用户已提供完整 `brand_input`
- **WHEN** 调用 `POST /api/v1/workflows/plan_generation_pipeline/run`
- **THEN** 系统 SHALL 按顺序执行 9 个 Agent 节点
- **AND** `outputs` 中 SHALL 包含 `plan_generator` 节点输出的 9 章方案 Markdown

### Requirement: 每个 Agent 节点 SHALL 输出结构化数据

每个 Agent 节点 SHALL 使用 Pydantic structured output，输出下游节点可解析的结构化数据。

#### Scenario: market_research 输出结构化市场分析
- **WHEN** `market_research` 节点执行完成
- **THEN** 输出 SHALL 包含 `market_summary`、`trends`、`opportunities` 字段

#### Scenario: fitness_analysis 输出适配度评分
- **WHEN** `fitness_analysis` 节点执行完成
- **THEN** 输出 SHALL 包含 `sport_fitness_scores` 列表
- **AND** 每个 SHALL 包含 `sport`、`score`、`reason`

#### Scenario: plan_generator 输出 9 章方案
- **WHEN** `plan_generator` 节点执行完成
- **THEN** 输出 SHALL 包含 `chapters` 列表
- **AND** 每个 chapter SHALL 包含 `title`、`subtitle`、`content`
- **AND** `chapters` 长度 SHALL 为 9

### Requirement: 数据引用必须来自 mock 数据或真实 API

所有城市人口、运动指数、赛事数量、达人数量、场馆数量、经营社数量等数据数值 SHALL 来自 `backend/mock_data/` 或真实 API 返回，LLM 禁止编造。

#### Scenario: data_query 节点返回上海数据
- **GIVEN** `brand_input.city` 为 "上海"
- **WHEN** `data_query` 节点执行
- **THEN** 输出中的 `population`、`leagues_count`、`events_monthly`、`influencers_count`、`venues_count`、`stores_count` SHALL 与 mock 数据中上海条目一致

### Requirement: 方案生成流水线 SHALL 支持失败节点阻塞与恢复

任意 Agent 节点执行失败时，工作流 SHALL 停止在该节点，保留已完成的节点输出；用户可通过 SSE 事件或同步状态接口选择重试该节点、跳过该节点或终止流程。

#### Scenario: 节点失败后重试
- **GIVEN** `market_research` 节点因网络超时失败
- **WHEN** 用户选择重试该节点
- **THEN** 系统 SHALL 只重新执行 `market_research`
- **AND** 前面已完成的 `collect` 结果 SHALL 复用

#### Scenario: 节点失败后跳过
- **GIVEN** `audience_insight` 节点失败
- **WHEN** 用户选择跳过该节点
- **THEN** 系统 SHALL 使用默认值继续执行下游节点
- **AND** 最终方案中该章节 SHALL 标注为基于默认假设

#### Scenario: 节点失败后终止
- **GIVEN** `strategy_generation` 节点失败
- **WHEN** 用户选择终止流程
- **THEN** 系统 SHALL 结束工作流
- **AND** 返回 `workflow.failed` 事件

### Requirement: 流水线 SHALL 支持 mock 模式运行

当环境变量 `USE_MOCK_DATA=true` 时，Agent 节点 SHALL 返回预设的结构化输出，不调用 LLM。

#### Scenario: mock 模式运行完整流水线
- **GIVEN** `USE_MOCK_DATA=true`
- **WHEN** 调用 `POST /api/v1/workflows/plan_generation_pipeline/run`
- **THEN** 系统 SHALL 在 1 秒内完成所有节点
- **AND** 返回完整 9 章方案

## ADDED Requirements

## MODIFIED Requirements

## REMOVED Requirements

## RENAMED Requirements
