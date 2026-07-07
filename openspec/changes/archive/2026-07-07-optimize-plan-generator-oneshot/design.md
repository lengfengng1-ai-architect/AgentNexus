## Context

营销方案流水线最后一个节点 `plan_generator` 是尾延迟瓶颈。当前实现串行调用 9 次 LLM(对应 `PLAN_CHAPTER_SPEC` 9 个章节),每次 prompt 都将 8 个上游节点的完整输出重复塞入,且每次调用 `build_chat_model().ainvoke()` 新建 model 实例。

经 brainstorming + explore 阶段确认:线上实际 provider 为 `myself/deepseek-v4-flash`,`max_tokens` 默认 32K/最大 64K,9 章正文 ≈ 4.5-6K token + thinking ≈ 1-3K,裕量充足,go/no-go 通过。

方案选定「一次生成 + C1 过程反馈」:一次 LLM 调用生成全部 9 章,过程里程碑只走现有 `write_log`→`node.log`(LogViewer)通道,前端/service 零改。

## Goals / Non-Goals

**Goals:**
- `plan_generator` 由 9 次串行 LLM 改为 1 次流式输出 9 章
- 过程里程碑(章节进度)实时推送到 LogViewer
- 给前端的最终输出契约(`outputs.plan_generator = {chapters:[{title,subtitle,content}×9]}`)逐字段同构不变
- Prompt 模板由 9 份合并为 1 份,废弃章节模板
- `build_chat_model` 单例化,减少重复创建

**Non-Goals:**
- wall-clock 不改善(一次生成的总 token 与串行 9 次相同,自回归不可并行)
- 不改变流水线其他节点行为
- 不改 service 层(`plan_generation_service.py`)
- 不改前端任何文件
- 不引入 writer 自定义事件(`CHAPTER_START`/`CHAPTER_COMPLETE`)—— C1 预期绕开该路径
- 不实现 C3(逐字流式 PlanPreview)—— 未来如需升级,后端骨架不变

## Decisions

### 决策 1:一次生成 + 分隔符协议替代 9 次串行调用

**选型对比:**

| 方案 | 输入 token | 连贯性 | 复杂度 | 风险 |
|---|---|---|---|---|
| 现状(串行 9 次) | ~72× 上游(9×8) | 段落间无上下文 | 低 | 慢 |
| 并发 9 路 | 同现状 | 无 | 中 | 无限扩展+可能失败 |
| **一次生成(选定)** | **1× 上游** | **LLM 一次规划** | **中** | **输出格式校验** |

一次生成换简单性、连贯性、输入 token 最省。LLM 输出由 JSON 改为 Markdown + 分隔符 `@@CH:N@@`。JSON 无法流式增量解析;分隔符标记在 handler 层扫描切分,比按 title 字符串匹配更稳定。

> 分隔符标记 `@@CH:N@@` 为建议形式,apply 阶段最终确认。

### 决策 2:handler 必须使用 `model.astream`(作为 drain 心跳)

即使不把 content 流给前端,handler 也必须 `model.astream` 而非 `ainvoke`。

`write_log` 往全局 `_log_buffer` 写,service 的 `_stream_events` 在 `graph.astream_events` 每次 yield 后 `drain_logs()`。handler 内部的 LLM token 会作为 `on_llm_new_token` 事件被 `astream_events` 高频 yield → 高频触发 `drain_logs()` → 章节里程碑日志近实时发出。LLM 流本身即是 drain 的心跳。若用 `ainvoke`(非流式),handler 几十秒不返回,日志全攒到最后才吐。

### 决策 3:过程反馈走 C1(只写 `write_log`,不发 writer 自定义事件)

选定方案 **C1**(过程反馈只走 LogViewer):

- 章节边界 → `write_log("plan_generator", "✓ 第 N 章:{title}")`
- thinking 阶段 → `write_log("plan_generator", "🤔 策略构思中…")`
- 不触发 writer 自定义事件(`on_custom_event` → `chapter.start`/`chapter.complete`)
- **零前端、零 service 改动**
- 意外绕开:writer 透传 bug(已有,`_build_node` 只传一个参数)、前端 `CHAPTER_*` 未验证路径、流式 markdown 抖动带来的过程态/最终态一致性问题

> 未来如需升级 C3(逐字 PlanPreview),后端只需加 `writer` 事件发射,前端加 `chapter.delta` reducer;后端骨架不变。

### 决策 4: `build_chat_model` 单例化

`build_chat_model` 当前每次调用新建 langchain model 实例。改为 module-level `lru_cache` 或全局缓存,按 provider 组合建 key。`ainvoke` → `astream` 复用单例。

### 决策 5:显式设置 `max_tokens=16384`

当前不设 `max_tokens`,LLM provider 按默认值(deepseek-v4-flash 默认 32K)。改为 `max_tokens=16384`(thinking + 9 章 ≈ 4.5-6K token + 裕量)。如输出超限,报截断错误并提示用户缩小需求。

## Risks / Trade-offs

| 风险 | 说明 | 处置 |
|---|---|---|
| drain 实时性假设 | `astream_events` 不捕获 handler 内部 `model.astream` token 事件 → 里程碑不实时 | apply 阶段跑通验证 |
| 输出格式损坏 | LLM 漏分隔符/乱序/提前截断 | handler 校验恰好 9 段,不符则 `raise` |
| 输出上限 | V4 32K 当前够用,未来增长需复核 | 设 `max_tokens=16384`,日志监控实际 output |
| wall-clock 未改善 | 一次生成不缩短,只改体感 | 明确定义为非目标 |
| 思考阶段过长 | thinking 耗时>15s,LogViewer 只有一条"策略构思中",用户可能焦虑 | 段落里程碑延后但最终出现频次更高 |
