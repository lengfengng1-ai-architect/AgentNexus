## Context

三个调研 agent 都用 `httpx.AsyncClient` 抓取搜索命中的网页。抓取失败（超时、HTTP 错误、连接异常等）时返回 `fetched=False`，节点降级继续——这个降级语义是正确的（不该因为几个页面失败就崩掉整个 agent）。

问题在**可观测性**：失败路径只有 `write_log()` 推 SSE（前端可见的笼统文案），服务端 `app.log` 没有任何记录。线上出现 `0/N` 全失败时，无法从日志反推根因（代理？SSL？反爬？DNS？）。

## Goals / Non-Goals

**Goals:**
- 三个调研 agent 的抓取失败路径补服务端诊断日志（异常类型 + URL + 堆栈）
- `audience_insight` 的异常分类对齐另外两个 agent（3 类分支）

**Non-Goals:**
- 不改抓取/重试/降级行为
- 不改前端 SSE 文案
- 不修"0/5 全失败"的根因本身

## Decisions

### 决策 1：异常落盘用标准 `logging`，不走 `write_log`

**决策**：失败诊断信息走模块级 `logger = logging.getLogger(__name__)`，由 `main.py` 的 `RotatingFileHandler` 落盘到 `app.log`。`write_log()` 继续只负责前端 SSE 文案。

**理由**：`write_log` 的 buffer 是给前端用户看的进度提示（要简洁、要中文友好），不该塞异常堆栈。服务端诊断日志是给开发/运维看的，两者职责分开。

### 决策 2：异常分 3 类，分别记录

**决策**：三个 agent 统一为：
- `TimeoutException` → `logger.warning("... timeout: %s (%s)", url, exc)`
- `HTTPError` → `logger.warning("... HTTP error: %s (%s)", url, exc)`
- 其他 `Exception` → `logger.exception("... fetch failed: %s", url)`（带完整堆栈）

**理由**：超时和 HTTP 状态错误是高频且自解释的，`warning` 级别 + 单行足够；未知异常需要堆栈定位，用 `exception` 级别。`audience_insight` 之前的单桶 `except (TimeoutException, HTTPError, Exception)` 把三类混在一起且吞了异常对象，本次拆开对齐。

### 决策 3：不改 SSE 文案

前端已经显示 `⏱️ 请求超时` / `⚠️ HTTP 错误` / `⚠️ 读取失败` 三种文案（product/market 已有，audience 拆分后也对齐）。本次保持文案不变，只新增服务端落盘。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| `logger.exception` 在高频失败时增加 `app.log` 体积 | `app.log` 已配置 5MB×5 轮转；且全失败是异常场景不是常态，可接受 |
| 三处 agent 代码重复类似 except 结构 | 可接受——三个 agent 的 fetch 本就各自独立实现（不同 schema、不同 post-process），抽公共函数反而增加耦合。ponytail：boring 优于 clever |

## Migration Plan

代码已实现并测试通过（15 个相关测试 PASS）。无数据迁移、无配置变更、无下游影响。

### Rollback
直接 revert 三个文件的 except 块改动即可，无副作用。

## Open Questions

无。本次只补日志，根因（为何 0/5）需等日志产出后单独定位与修复。
