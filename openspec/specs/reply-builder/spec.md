# Capability: reply-builder

## Purpose

为 AllyGo 营销方案 Agent 的对话流程提供统一的口语化回复生成能力。

## Requirements

### Requirement: reply_builder 节点根据意图识别结果生成自然语言回复

系统 SHALL 提供一个名为 `reply_builder` 的 Agent 节点，接收 `intent` 节点的输出、最后执行分支的输出以及原始用户消息，使用 LLM 生成一句口语化自然语言回复。

#### Scenario: generate_plan 意图生成回复
- **GIVEN** 用户输入 "我是 Nike，想在上海做跑步推广，预算 50 万，周期 3 个月"
- **WHEN** `intent` 节点识别为 `generate_plan`
- **AND** `extract` 节点成功提取品牌字段
- **THEN** `reply_builder` SHALL 生成包含品牌、城市、预算、周期的口语化回复
- **AND** 回复 SHALL 表明系统已理解用户需求并准备生成方案

#### Scenario: query_data 意图生成回复
- **GIVEN** 用户输入 "查询上海数据"
- **WHEN** `intent` 节点识别为 `query_data`
- **AND** `data_query` 节点返回城市数据
- **THEN** `reply_builder` SHALL 生成包含城市名和关键数据摘要的口语化回复
- **AND** 回复 SHALL 询问用户是否需要基于数据生成方案

#### Scenario: clarify 意图生成追问回复
- **GIVEN** 用户输入缺少必要字段
- **WHEN** `intent` 节点识别为 `clarify`
- **AND** `missing_fields` 包含缺失字段
- **THEN** `reply_builder` SHALL 生成询问缺失字段的口语化回复
- **AND** 回复 SHALL 只列出确实缺失的字段

#### Scenario: update_context 意图生成确认回复
- **GIVEN** 用户输入修改已确认字段
- **WHEN** `intent` 节点识别为 `update_context`
- **AND** `updated_fields` 包含变更字段
- **THEN** `reply_builder` SHALL 生成确认变更的口语化回复
- **AND** 回复 SHALL 列出已更新的字段和当前值

#### Scenario: chat 意图生成寒暄回复
- **GIVEN** 用户输入 "你好"
- **WHEN** `intent` 节点识别为 `chat`
- **THEN** `reply_builder` SHALL 生成友好、简短的寒暄回复
- **AND** 回复 SHALL 简要说明系统能力范围

### Requirement: reply_builder 输出结构化回复字段

系统 SHALL 要求 `reply_builder` 返回结构化输出，至少包含 `reply` 字符串字段，供前端直接展示在对话气泡中。

#### Scenario: 输出包含 reply 字段
- **WHEN** `reply_builder` 节点执行完成
- **THEN** 输出 SHALL 包含 `reply: str`
- **AND** `reply` SHALL 为自然语言字符串

### Requirement: chat_pipeline 工作流以 reply_builder 作为统一收口

系统 SHALL 修改 `chat_pipeline` 工作流 YAML，使 `extract`、`data_query`、`end_reply` 三个分支最终都连接到 `reply_builder` 节点，`reply_builder` 之后结束工作流。

#### Scenario: 工作流包含 reply_builder 节点
- **GIVEN** 系统加载 `chat_pipeline.yaml`
- **WHEN** 列出工作流节点
- **THEN** 节点列表 SHALL 包含 `reply_builder`
- **AND** `reply_builder` SHALL 是 `extract`、`data_query`、`end_reply` 的共同下游

#### Scenario: 运行工作流返回 reply_builder 输出
- **WHEN** 调用 `POST /api/v1/workflows/chat_pipeline/run`
- **THEN** 响应 `outputs` SHALL 包含 `reply_builder.reply`
- **AND** `reply_builder.reply` SHALL 为自然语言字符串
