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

### Requirement: 调研 agent 抓取失败 SHALL 记录服务端诊断日志

`product_research` / `market_research` / `audience_insight` 三个调研 agent 在抓取网页失败时，SHALL 通过 Python 标准 `logging`（模块级 `logger`）将异常详情落盘到 `app.log`，与仅推送给前端的 `write_log()` SSE 文案相互独立。诊断日志 SHALL 区分三类异常：`TimeoutException`（`logger.warning`）、`HTTPError`（`logger.warning`）、其他 `Exception`（`logger.exception` 含堆栈），每条 SHALL 包含失败的 URL。

诊断日志仅供服务端排障，SHALL 不改变节点输出契约、SSE 事件或失败降级语义（仍返回 `fetched=False`，节点继续执行）。

#### Scenario: 超时异常落盘
- **GIVEN** `fetch_one` 请求某 URL 触发 `httpx.TimeoutException`
- **WHEN** 异常被捕获
- **THEN** 系统 SHALL 以 `logger.warning` 记录一行到 `app.log`，包含 URL 与异常对象
- **AND** SSE 前端日志 SHALL 仍显示「请求超时，跳过」文案
- **AND** 返回 `fetched=False`，节点不中断

#### Scenario: HTTP 错误落盘
- **GIVEN** `fetch_one` 请求返回 4xx/5xx 触发 `httpx.HTTPError`
- **WHEN** 异常被捕获
- **THEN** 系统 SHALL 以 `logger.warning` 记录一行到 `app.log`，包含 URL 与异常对象
- **AND** 返回 `fetched=False`，节点不中断

#### Scenario: 其他异常带堆栈落盘
- **GIVEN** `fetch_one` 抛出非超时、非 HTTPError 的异常（如 ConnectError / SSLError / RemoteProtocolError）
- **WHEN** 异常被捕获
- **THEN** 系统 SHALL 以 `logger.exception` 记录 URL 与完整堆栈到 `app.log`
- **AND** SSE 前端日志 SHALL 仍显示「读取失败，跳过」文案
- **AND** 返回 `fetched=False`，节点不中断

#### Scenario: 输出契约不变
- **GIVEN** 任一调研 agent 抓取阶段出现部分或全部失败
- **WHEN** 节点执行完成
- **THEN** 节点输出的结构化字段（`fetched_pages` 等）SHALL 与本次日志改动前一致
- **AND** 下游节点 SHALL 无需感知是否有诊断日志落盘
