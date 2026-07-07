# Capability: agent-operation-log

## Purpose

提供 Agent 执行过程中的实时操作日志推送能力。任何 Agent 节点在执行关键步骤时，可通过 `dispatch_custom_event` 推送进度消息，消息会经 SSE `node.log` 事件流到前端展示。

## Requirements

### Requirement: 系统 SHALL 支持 Agent 节点实时推送操作日志

流水线中每个 Agent 节点 SHALL 在执行关键步骤时调用 `dispatch_custom_event("log", {"node_id": "...", "message": "..."})` 推送操作日志。日志消息 SHALL 以 `node.log` SSE 事件传输，前端按 `node_id` 归类展示。

#### Scenario: 搜索步骤推送日志
- **GIVEN** Agent 节点正在执行搜索操作
- **WHEN** Agent 调用 `dispatch_custom_event("log", {"node_id": "product_research", "message": "🔍 正在搜索「XPS 15」相关信息…"})`
- **THEN** SSE 流 SHALL 推送一条 `node.log` 事件，`data.message` 字段为搜索描述文本
- **AND** 前端日志面板 SHALL 显示该文本

#### Scenario: 页面抓取步骤推送日志
- **GIVEN** Agent 节点正在抓取网页内容
- **WHEN** Agent 抓取完成后调用 `dispatch_custom_event("log", {"node_id": "product_research", "message": "📄 已读取 dell.com/xps-15"})`
- **THEN** SSE 流 SHALL 推送 `node.log` 事件
- **AND** 消息 SHALL 包含访问的 URL

#### Scenario: LLM 分析步骤推送日志
- **GIVEN** Agent 节点即将调用 LLM 分析数据
- **WHEN** Agent 调用 `dispatch_custom_event("log", {"node_id": "market_research", "message": "🤖 正在用 AI 分析市场趋势…"})`
- **THEN** SSE 流 SHALL 推送 `node.log` 事件
- **AND** 用户在前端 SHALL 看到"正在用 AI 分析…"等相关描述

#### Scenario: 多种日志类型同时显示
- **GIVEN** 某 Agent 节点先后执行搜索、抓取、分析三个步骤
- **WHEN** 每一步都调用 `dispatch_custom_event` 推送日志
- **THEN** 前端日志面板 SHALL 按推送顺序显示所有日志条目
- **AND** 用户 SHALL 看到完整的操作链条

### Requirement: 日志消息 SHALL 使用 Emoji 前缀区分操作类型

每条日志消息 SHALL 以 Emoji 作为视觉前缀，帮助用户快速识别操作类型。

| Emoji | 操作类型 |
|-------|----------|
| 🔍 | 搜索中 |
| 📄 | 读取页面 |
| 🤖 | LLM 分析 |
| 📊 | 数据整理/计算 |
| 🌐 | 补充信息 |
| ✓ | 完成 |

#### Scenario: 搜索操作前缀
- **WHEN** Agent 开始搜索操作
- **THEN** 日志消息 SHALL 以 `🔍` 开头

#### Scenario: 页面读取前缀
- **WHEN** Agent 正在读取网页
- **THEN** 日志消息 SHALL 以 `📄` 开头

#### Scenario: LLM 分析前缀
- **WHEN** Agent 调用 LLM 分析数据
- **THEN** 日志消息 SHALL 以 `🤖` 开头

#### Scenario: 数据整理前缀
- **WHEN** Agent 正在进行数据整理或计算
- **THEN** 日志消息 SHALL 以 `📊` 或 `🌐` 开头

### Requirement: SSE 后端 SHALL 将 `on_custom_event("log")` 映射为 `node.log`

`plan_generation_service.py` 中的 `_translate_event` SHALL 增加处理 `on_custom_event` + `name == "log"` 的分支，从 `data.chunk` 中提取 `node_id` 和 `message`，生成标准 SSE 帧。

#### Scenario: custom_event 映射为 node.log
- **WHEN** LangGraph 触发 `on_custom_event` 且 `name == "log"`
- **THEN** 系统 SHALL 生成 `event: node.log` SSE 帧
- **AND** data 字段 SHALL 包含 `run_id`、`node_id`、`message`
