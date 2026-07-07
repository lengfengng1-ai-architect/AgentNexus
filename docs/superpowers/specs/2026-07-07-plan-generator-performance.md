# 方案生成 Agent (plan_generator) 一次生成 + C1 流式 设计

> **状态**:explore 草稿(设计探索,非正式 API 契约)
> **日期**:2026-07-07
> **对应 in_scope**:plan-generation
> **后续**:本草案确认后进入 `/opsx:propose`

## 1. 问题陈述与方案演进

营销方案流水线最后一个节点 `plan_generator` 是尾延迟瓶颈,理论耗时约为其他节点的
**9 倍**。根因:9 章串行 LLM 调用 + 每次塞 8 份全量上游 + model 实例重复初始化。

**架构决策(经 brainstorming + explore 确认)**:对比并发 9 路 / 一次生成 / 一次生成+流式
三种架构后选定 **「一次生成 + 流式」**。关键物理事实:LLM 自回归生成,单请求内部不可
并行——一次生成 9 章的总输出 token 与串行 9 次相同,wall-clock 不改善;选一次生成换
**简单性、连贯性、输入 token 最省、无限流风险**,用流式补**体感**。

## 2. go/no-go:DeepSeek V4-Flash 输出上限 ✅ 通过

线上实际 provider 为 `LLM_PROVIDER=myself` + `MYSELF_MODEL=deepseek-v4-flash` +
`ENABLE_THINKING=true`,endpoint 指向 **DeepSeek 官方**。

- DeepSeek V4-Flash `max_tokens` **默认 32K / 最大 64K**,thinking + content 共享预算。
- 9 章正文 ≈ 4.5-6K token + thinking ≈ 1-3K,合计远低于 32K,**裕量充足**。
- 误判历史:曾担心 qwen-turbo 旧版 1500(默认 settings 值,但非线上)与 V3 reasoner
  8K——两者都不适用于线上 V4。

apply 配置:显式设 `max_tokens=16384`(thinking + 9 章 + 裕量),保留 thinking。

## 3. 最终契约边界(不可变,最高约束)

**给前端的最终结果结构与现状逐字段一致,过程可走 SSE。**

| 层 | 现状 | 本次 |
|---|---|---|
| 后端 handler 返回 | `PlanGeneratorOutput(chapters=[PlanChapter×9]).model_dump()` | **不变** |
| service `node.complete`/`workflow.complete` | `_translate_event` 透传 `output` | **不变** |
| 前端 `NODE_COMPLETE`/`WORKFLOW_COMPLETE` | `outputs[nodeId]=data` / `outputs=eventOutput` | **不变** |
| 前端类型 `PlanOutputs.plan_generator` | `{chapters:PlanChapter[]}`(`types/plan.ts:59`) | **不变** |
| 前端渲染源 | `PlanPage.tsx:105/180` | **不变** |

## 4. ponytail 范围审查

1. **必须建吗?** 是。当前等满几分钟且日志区在串行下逐章静止,体感差。
2. **能用现有能力?** 是。`model.astream()` + 现有 `write_log`/`node.log` 通道,零新依赖、
   零前端改动、零 service 改动。
3. **能一行/配置解决?** 不能。涉及 LLM 输出契约(JSON→分隔符)、astream 解析、章节
   里程碑日志三处协同。属必要复杂度。

## 5. 方案设计:C1(过程反馈只走 LogViewer,前端/service 零改)

### 5.1 过程反馈通道选择:C1

前端有两个独立展示区:`PipelineTimeline` 的 `LogViewer`(竖向滚动、自动追底、颜色高亮,
消费 `node.log`)与 `PlanPreview`(章节正文,消费 `outputs.plan_generator.chapters`)。

| 方案 | LogViewer | PlanPreview | 前端改 | service 改 |
|---|---|---|---|---|
| **C1(选定)** | 章节里程碑日志(node.log) | 完成后整体出现 | **零** | **零** |
| C3(未来升级) | 章节里程碑日志 | chapter.delta 逐字 | 中 | 修 writer |

C1 用现成 `node.log` 通道发章节里程碑,**绕开** writer 透传 bug、前端 `CHAPTER_*` 未验证
路径、流式 markdown 抖动、过程态/最终态一致性等问题。未来升级 C3 只加前端,后端骨架不变。

### 5.2 LLM 输出契约:JSON → Markdown + 分隔符协议

JSON 无法流式增量解析,改用文本 + 分隔符:LLM 按 `PLAN_CHAPTER_SPEC` 顺序输出 9 段
markdown,每段以固定标记开头。**title/subtitle 仍由 `PLAN_CHAPTER_SPEC` 固定注入,LLM
只产 content**(与现状语义一致)。

> 此"输出契约"指 LLM 文本格式,**不是** §3 的「给前端的最终契约」。handler 仍按 §3
> 把切分结果组装成 `{chapters:[{title,subtitle,content}]}` 返回。

建议分隔符标记:`@@CH:{N}@@`(handler 扫描切分,比"按 title 切"更稳)。最终形式在
`/opsx:propose` 阶段确认。

### 5.3 handler:一次 astream + 解析 + 章节里程碑 + 组装

`plan_generator_agent.py` 的 `run_plan_generator(state)`:

- 渲染一次生成 prompt(全部上游数据,1 份);
- `async for token in model.astream(...)`:累积 buffer,扫描分隔符;
- 检测到章节边界 → `write_log("✓ 第 N 章:{title}")`;检测到 content 开始 →
  `write_log("🤔 策略构思中…")`(thinking 阶段);
- 结束校验恰好 9 段,组装 `PlanGeneratorOutput(chapters=...).model_dump()` 返回(§3)。

`build_chat_model` 单例化,`astream` 复用单例。

### 5.4 关键约束:handler 必须用 astream(作为 drain 心跳)

**即使不把 content 流给前端,handler 也必须 `model.astream`,而非 `ainvoke`。**

`write_log` 往全局 `_log_buffer` 写,service 的 `_stream_events` 在 `graph.astream_events`
每次 yield 后 `drain_logs()`。handler 内部的 LLM token 会作为 `on_llm_new_token` 事件被
`astream_events` 高频 yield → 高频触发 `drain_logs()` → 章节里程碑日志近实时发出。
**LLM token 流就是 drain 的心跳**。

若用 `ainvoke`(非流式):handler 几十秒不返回,`drain_logs` 只在 handler 结束才调用 →
日志全攒到最后才吐 → 失去实时性 → 体感比现状差。

> ⚠️ apply 阶段需验证:`graph.astream_events` 确实捕获 handler 内部 `model.astream` 的
> token 事件。这是 LangGraph 版本行为假设,跑通即确认。

## 6. 体感不退步校验(对照现状)

```
现状(串行9次)LogViewer           C1 LogViewer
▸ 🤖 生成第1章…                  ▸ 🤖 开始生成营销方案(9章)…
  🤖 生成第2章…                    🤔 策略构思中…
  ...(每章隔 15-30s)              ✓ 第1章:市场与用户洞察
                                   ✓ 第2章:品牌与运动场景 ...(更快)
                                   ✓ 方案生成完成
PlanPreview:全空→完成后整体出现   PlanPreview:同上(§3 契约不变)
```

C1 仍逐章滚里程碑(handler 解析流式分隔符),体感 ≈ 现状章节滚动,但更快(一次调用)。

## 7. 风险与权衡

| 风险 | 说明 | 处置 |
|---|---|---|
| drain 实时性假设 | `astream_events` 不捕获 handler 内部 token 则里程碑不实时 | apply 跑通验证(§5.4) |
| 长输出格式损坏 | LLM 漏分隔符/乱序 | handler 校验恰好 9 段,不符则失败 |
| 输出上限监控 | V4 32K,当前够用,但未来章节数/字数增长需复核 | apply 设 `max_tokens=16384`,日志监控实际 output |
| wall-clock 未改善 | 一次生成不缩短总时间,只改体感 | 显式非目标 |
| 流式中途断流 | 网络断导致部分里程碑已显示 | 复用现有 checkpoint,rerun 可恢复 |

## 8. 文件改动清单(apply 阶段以 spec 为准)

**后端**:
- `backend/app/agents/plan_generator_agent.py` — 一次 astream + 分隔符解析 + 章节里程碑
  `write_log` + 组装 9 章返回(§3)
- `backend/app/agents/llm_utils.py` — `build_chat_model` 单例;新增 astream helper
- `backend/app/prompt_templates/plan_generator.md.j2` — 一次生成 + 分隔符协议(改造)
- 废弃 `backend/app/prompt_templates/plan_generator_chapter.md.j2`

**service**:`backend/app/services/plan_generation_service.py` **零改**

**frontend**:**零改**

## 9. 测试策略(遵循 `docs/conventions/testing.md`)

- 单测(mock 流):分隔符切分正确性、恰好 9 段校验、格式损坏降级。
- 单测:**handler 返回值与改动前同构**(§3 契约回归断言)。
- 单测:model 单例只 init 一次;切换 provider 换实例。
- 单测:章节里程碑按解析顺序 `write_log`(index 递增)。
- apply 专项验证:drain 实时性(`astream_events` 捕获 token)。
- 覆盖率 ≥ 80%(ponytail 不豁免)。不打真实 provider。

## 10. 验证标准

- **回归(硬性)**:`outputs.plan_generator` 与改动前逐字段同构——chapters 长度=9,
  title/subtitle 与 `PLAN_CHAPTER_SPEC` 一致,content 非空 markdown。
- LogViewer 在生成过程中实时滚章节里程碑(不静止)。
- 输入 token 显著下降(上游只传 1 份 vs 原 9×8 份)。
- 流水线其他节点行为不变。
