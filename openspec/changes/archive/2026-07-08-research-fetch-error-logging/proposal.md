## Why

三个调研 agent（`product_research` / `market_research` / `audience_insight`）的网页抓取异常路径**没有任何服务端诊断日志**——所有异常只通过 `write_log()` 推到前端 SSE 下拉框（`⚠️ {url} 读取失败，跳过`），既不写进 `app.log`，也不带异常类型或堆栈。

实际后果：线上出现 `抓取完成：成功 0/5 个页面`（全失败、产出空信息）时，`app.log` 里**完全没有这次运行的痕迹**，无法判断是代理路由、SSL、反爬还是连接超时。前端能看到的也只有笼统的"读取失败"，排障完全失明。

对应 in_scope ID：`plan-generation`（三个 agent 均为 `plan_generation_pipeline` 流水线的并行调研节点）。

## What Changes

- 三个 agent 的 `fetch_one` 异常处理统一改为 3 类分支：`TimeoutException` / `HTTPError` / 其他 `Exception`，每类都补 `logger.warning` 或 `logger.exception`，把 URL + 异常类型 + 堆栈落盘到 `app.log`。
- `audience_insight_agent` 之前是单笼统桶 `except (TimeoutException, HTTPError, Exception)`，本次拆成 3 类，与 `product_research_agent` / `market_research_agent` 对齐。
- **不改任何用户可见行为**：SSE 消息文案、节点输出契约、失败降级语义（返回 `fetched=False`、节点继续）全部不变。仅增加服务端日志。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `agent-operation-log`：新增「调研 agent 抓取失败 SHALL 记录服务端诊断日志」要求。原 capability 只覆盖前端 SSE 可见的 `node.log`，本次扩展为同时要求服务端落盘异常详情（`logger.warning` / `logger.exception`），用于线上排障。

## Non-goals

- 不改 fetch 的重试逻辑、超时时长、代理配置、content-type 判定规则。
- 不改 SSE 前端日志文案。
- 不改节点输出 schema。
- 不修复"0/5 全失败"的根因本身（需先用本次新增的日志定位，再单独开 change 修）。

## Mock 数据覆盖说明

本变更不涉及数据流，仅日志输出，无 mock 数据需求。

## Impact

- `backend/app/agents/product_research_agent.py` — 3 个 except 分支补 `logger` 调用。
- `backend/app/agents/market_research_agent.py` — 3 个 except 分支补 `logger` 调用。
- `backend/app/agents/audience_insight_agent.py` — 新增 `import logging` + `logger`；单笼统桶拆成 3 类分支并补 `logger`。
- 无下游影响、无 schema 变化、无新依赖。
