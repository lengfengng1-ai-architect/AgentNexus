## ADDED Requirements

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
