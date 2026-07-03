# 设计草稿：plan pipeline 接入 LangGraph checkpointer + 强审核点

> 状态：`/opsx:explore` 阶段结论(brainstorming 结论 + explore 补充)。作为 `/opsx:propose` 输入,不是正式 OpenSpec。
> 正式契约见后续 `docs/api/paths/plan.yaml` 和 `openspec/changes/langraph-plan-runtime-with-checkpoint/`。

## 背景

- commit `1470bcb` 用一条硬编码的 LangGraph `StateGraph` 替换了原本的 YAML workflow runtime,删除了 orchestrator / workflow_service / workflow_run_service / `routers/workflows` / 4 个 `workflows/*.yaml` / 对应测试。
- 该 commit 只同步改了 `frontend/src/api/plan.ts` 的一处 URL,其他前端调用者(`resumePlanRun`、`controlPlanRun`、`getPlanRunStatus`)仍打旧路径 `/workflows/...`,后端已 404。
- 后端 `services/plan_generation_service.py` 现有两个入口:
  - `run_pipeline` — 走 `_pipeline.ainvoke()`,真正用 LangGraph
  - `run_stream` — 手写 for 循环调 `get_handler(nid)(initial)`,**绕过 LangGraph 的 astream**,且每个 handler 收到的入参形态和 `run_pipeline` 里 `_build_node` 精心拆分的入参不同
- SSE 协议前后端不匹配:后端每帧只有 `event: + data:`,不含 `id:`、`run_id`、`workflow.start`;前端 `readSSEStream` 判定 yield 的条件是 `current.event && current.runId`,导致所有事件被过滤,UI 节点永远停在 pending。
- 请求体结构不对齐:前端发 `{ input: { brand_input: {...} } }`,后端 `plan_run(brand_input: BrandInput)` 期望顶层就是 `BrandInput`,POST 直接 422。

## 目标

- 用 LangGraph 官方推荐机制补齐**暂停 / 重连 / 人工介入**能力,不重建通用 YAML workflow runtime。
- 统一 `run_pipeline` 和 `run_stream` 两套漂移的实现。
- 对齐前端已有的 API 表面(URL 路径、SSE 协议、请求体)。
- MVP 阶段零运维优先(checkpointer 用 SQLite 文件,不引入 Postgres)。

## 用户已明确的决策

1. **Checkpointer**:`AsyncSqliteSaver`,文件 `backend/data/checkpoints.db`(需加入 `.gitignore`)。
2. **Interrupt 策略**:模型 A —— **强审核点**,编译时 `interrupt_before=[...]`。用户不需要主动 pause,只在审核点自然停下。
3. **审核点位置**:3 个 —— `strategy_generation` / `execution_planning` / `plan_generator` 之前。
4. **审核点交互**:模型 C —— 用户可**通过 / 修改再通过 / 打回上一步重生成**。`retry` 语义融入审核 UI 的"打回"按钮,不需要独立 retry API。
5. **run_id 生成**:后端 `uuid4` 作为 LangGraph `thread_id`,通过响应头 `X-Run-Id` 返回,同时冗余到首帧 `workflow.start` 的 `data.run_id`。
6. **cancel 后 checkpoint**:直接清掉,run_id 不复活。
7. **服务层入口**:**删掉 `run_pipeline`,只保留流式实现**。非流式需求可由 astream 消费到末尾满足。
8. **章节级流式**:`plan_generator` 内部改为**一章一次 LLM 调用**,顺序生成,每章完成即 emit `chapter.complete` SSE 事件。产品价值:章 N 可读到章 1..N-1 已生成内容,叙事更连贯。
9. **9 章 title/subtitle 固定**:代码/spec 里写死 9 章标题模板。LLM 只填 `content`。稳定性 > 灵活性;前端 UI 可预铺 9 个占位卡。

## 架构

### 目录变更

```
backend/
  data/                        # 新增,checkpoint 文件目录,git 忽略
    checkpoints.db             # 首次启动自动创建
  app/
    services/
      plan_generation_service.py   # 重写:去 run_pipeline,run_stream 换成 astream 消费
    routers/
      plan.py                       # 扩展:补 approve / reject / cancel / status 端点
    schemas/
      plan_run.py                   # 新增:PlanRunRequest / ControlAction / RunStatus
  .gitignore                        # 加一行 backend/data/checkpoints.db*
```

### 流水线编译

```python
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

_checkpointer = AsyncSqliteSaver.from_conn_string("backend/data/checkpoints.db")
_pipeline = _build_graph().compile(
    checkpointer=_checkpointer,
    interrupt_before=["strategy_generation", "execution_planning", "plan_generator"],
)
```

编译一次,模块级持有。`_build_graph()` 不变。

### 单一执行函数

删除 `run_pipeline`。`run_stream` 改为消费 LangGraph 的 `astream_events` / `astream`,不再手写 for 循环:

```python
async def run_stream(
    run_id: str,
    brand_input: dict | None = None,
    resume_payload: dict | None = None,
) -> AsyncGenerator[str, None]:
    """流式执行 / 恢复 plan pipeline。

    - 首次启动:brand_input != None, resume_payload == None
    - 从审核点恢复:brand_input == None, resume_payload == None(approve)
                    或 resume_payload != None(修改再通过)
    """
    config = {"configurable": {"thread_id": run_id}}
    if brand_input is not None:
        input_state = {"brand_input": brand_input, ...}   # 初始 state
        yield _sse("workflow.start", {"run_id": run_id})
    else:
        input_state = Command(resume=resume_payload) if resume_payload else None

    async for event in _pipeline.astream_events(input_state, config=config, version="v2"):
        # 把 LangGraph 事件翻译成本项目 SSE 协议
        translated = _translate_event(run_id, event)
        if translated:
            yield translated

    # 检查是否停在审核点
    snapshot = await _pipeline.aget_state(config)
    if snapshot.next:
        awaiting_node = snapshot.next[0]
        yield _sse("workflow.paused", {
            "run_id": run_id,
            "awaiting_node": awaiting_node,
            "snapshot": _serialize_state(snapshot.values),
        })
    else:
        yield _sse("workflow.complete", {"run_id": run_id, "outputs": snapshot.values})
```

`_translate_event` 把 LangGraph 原生事件(`on_chain_start`/`on_chain_end` 等)映射成本项目的 `node.start` / `node.complete` / `node.failed`,以及 `node.log`(如果 handler 有日志则由 astream_events 自然带出;若无,可以在 handler 里主动 `astream` 一些进度消息)。

**`node.log` 处理**:当前 `_NODE_LOG_STEPS` 是硬编码的假日志"正在搜索…/正在提取…"。这份草稿保留这个假日志,由 `_translate_event` 在收到 `on_chain_start` 时按 `_NODE_LOG_STEPS[nid]` 逐条 yield。**长期看应改由 agent 内部主动 emit 真实进度**,但不属于本次改动范围。

### API 表面

| 方法 | 路径 | 用途 |
|------|-----|-----|
| POST | `/api/v1/plan/run` | 启动新 run,SSE 流式返回。响应头 `X-Run-Id`。跑到审核点自动 `workflow.paused` 后关闭流 |
| POST | `/api/v1/plan/runs/{run_id}/approve` | 审核点通过。SSE 流式返回,继续跑到下一个审核点或完成 |
| POST | `/api/v1/plan/runs/{run_id}/reject` | 打回上一步重生成。body:`{target_node: string, patch?: dict}`。回滚 checkpoint 到 target_node,SSE 流式返回 |
| POST | `/api/v1/plan/runs/{run_id}/cancel` | 取消并清除 checkpoint。返回 `{status: "cancelled"}` |
| GET  | `/api/v1/plan/runs/{run_id}/status` | 查询当前 state 快照(用于前端刷新恢复) |

**说明**:
- 前端现有 `resumePlanRun` → `POST /plan/runs/{run_id}/approve`
- 前端现有 `controlPlanRun` → `POST /plan/runs/{run_id}/reject` 或 `cancel`,前端 API 层拆成两个函数
- 前端现有 `getPlanRunStatus` → `GET /plan/runs/{run_id}/status`
- 前端 `useWorkflowSSE.ts` 名字保留(不改),内部 hook 方法更新对应路径。或改名 `usePlanRun`,由 `/opsx:explore` 阶段决定。

### 请求体 schema

新增 `schemas/plan_run.py`:

```python
class PlanRunRequest(BaseModel):
    brand_input: BrandInput

class ApproveRequest(BaseModel):
    patch: dict[str, Any] | None = None   # 用户修改的字段,None 表示"原样通过"

class RejectRequest(BaseModel):
    target_node: str    # 打回到哪个节点重跑
    patch: dict[str, Any] | None = None
```

`plan_run(request: PlanRunRequest)`——请求体顶层就是 `{brand_input: {...}}`。**前端 `startPlanRun` 需要去掉多余的 `input` 包装层**,发 `{brand_input: {...}}` 而不是 `{input: {brand_input: {...}}}`。

### SSE 协议

每帧标准三行:

```
id: <单调递增整数>
event: <事件类型>
data: <JSON>

```

事件表:

| event | data 字段 | 何时发 |
|-------|-----------|--------|
| `workflow.start` | `run_id` | 每个 SSE 响应最开始 |
| `node.start` | `run_id, node_id, label` | LangGraph `on_chain_start` |
| `node.log` | `run_id, node_id, message` | 由 `_NODE_LOG_STEPS` 假数据驱动(短期) |
| `node.complete` | `run_id, node_id, data` | LangGraph `on_chain_end` |
| `node.failed` | `run_id, node_id, error` | handler 抛异常 |
| `workflow.paused` | `run_id, awaiting_node, snapshot, reason` | 跑到 `interrupt_before` 节点前;`reason` = `"review" \| "failure"` |
| `chapter.start` | `run_id, chapter_index, title, subtitle` | `plan_generator` 内部开始生成某章 |
| `chapter.complete` | `run_id, chapter_index, title, subtitle, content` | 某章生成完成 |
| `workflow.complete` | `run_id, outputs` | 全部完成 |
| `workflow.cancelled` | `run_id` | cancel 端点响应流末尾 |

`chapter.*` 事件夹在 `plan_generator` 的 `node.start` 和 `node.complete` 之间发。`node.complete` 的 `data` 里仍包含完整 9 章数组,便于 checkpoint / state 一致性。

### 章节级流式生成 (`plan_generator`)

**范围内**:`plan_generator` 节点改造成按 9 章顺序流式生成,每章一次 LLM 调用,通过 SSE 增量推送。

**9 章固定 schema**(title / subtitle 由本 change 在代码 + spec 中定死,LM 只填 content):

| index | title | subtitle |
|-------|-------|-----|
| 0 | 项目概述 | 品牌与目标 |
| 1 | 市场分析 | 趋势与竞争 |
| 2 | 营销策略 | 核心定位与打法 |
| 3 | 执行方案 | 赛事与内容 |
| 4 | 数字化运营 | 平台工具 |
| 5 | 达人体系 | KOL / KOC 网络 |
| 6 | 时间规划 | 阶段与节奏 |
| 7 | KPI | 效果指标 |
| 8 | 预算 | 分配与测算 |

`title` / `subtitle` 序列写入 `backend/app/schemas/plan_generation.py` 的 `PLAN_CHAPTER_SPEC` 常量,`plan_generator` 循环读取,不允许 LLM 覆盖。

**LangGraph 内实现路径**(路径 A):

```python
from langgraph.config import get_stream_writer

async def run_plan_generator(state: dict[str, Any]) -> dict[str, Any]:
    writer = get_stream_writer()
    chapters: list[PlanChapter] = []
    for idx, chapter_spec in enumerate(PLAN_CHAPTER_SPEC):
        writer({
            "custom_event": "chapter.start",
            "chapter_index": idx,
            "title": chapter_spec.title,
        })
        content = await _generate_chapter(idx, chapter_spec, state, chapters)  # 逐章 LLM 调用
        chapter = PlanChapter(
            index=idx,
            title=chapter_spec.title,
            subtitle=chapter_spec.subtitle,
            content=content,
        )
        chapters.append(chapter)
        writer({
            "custom_event": "chapter.complete",
            "chapter_index": idx,
            "title": chapter.title,
            "subtitle": chapter.subtitle,
            "content": chapter.content,
        })
    return {"chapters": [c.model_dump() for c in chapters]}
```

上游 `run_stream` 消费 `astream_events` 时,识别 `on_custom_event` / `on_chain_stream` 里的自定义 payload,翻译成 SSE `chapter.start` / `chapter.complete` 事件推给前端。

**SSE 事件表增补**:

| event | data 字段 | 何时发 |
|-------|-----------|-------|
| `chapter.start` | `run_id, node_id="plan_generator", chapter_index, title` | 每章 LLM 调用开始 |
| `chapter.complete` | `run_id, node_id="plan_generator", chapter_index, title, subtitle, content` | 每章生成完成 |

`plan_generator` 的 `node.complete` 依然携带完整 `chapters` 数组(与 checkpointer 落盘的 state 对齐),前端可以选择基于 `chapter.complete` 增量渲染,或基于 `node.complete` 一次性刷新——两条路径最终一致。

**上下文传递**:每章生成时 handler 把已生成章节数组塞进 prompt,让下游章节能引用上游章节的具体表述(比如「预算」章节引用「营销策略」里的定位),叙事更连贯。tradeoff:总 token 消耗略上升;但每次 LLM 调用短了,首字节延迟低,产品可感的响应速度更快。

**审核点交互**:`plan_generator` 前的审核点(3 个中的最后一个)语义不变——用户在**空的 chapters 位置**审批,approve 之后才开始逐章生成。approve 的 patch 允许覆盖 `strategy_generation` / `execution_planning` 等上游 state,不能覆盖 `chapters`(还没生成)。

### 前端配合改动(不属于本 spec,但连锁)

- `frontend/src/api/plan.ts`:
  - `startPlanRun` 请求体改成 `{ brand_input }`
  - `resumePlanRun` 拆成 `approvePlanRun(run_id, patch?)` + `rejectPlanRun(run_id, target_node, patch?)`
  - `getPlanRunStatus` 改路径 `/plan/runs/{run_id}/status`
  - 新增 `cancelPlanRun(run_id)`
- `frontend/src/hooks/useWorkflowSSE.ts`:方法名 `control` → 拆成 `approve` / `reject` / `cancel`
- `frontend/src/pages/PlanPage.tsx`:审核点 UI —— 在 `workflow.paused` 时渲染节点产出预览 + 编辑器 + 三个按钮(通过 / 改再通过 / 打回)

## 关键设计权衡

- **为什么不做主动 pause**:模型 A 决策后,用户唯一暂停时机就是审核点,没有"跑到一半停一下"的产品需求。省一个 API + 一套 abort 状态机。
- **为什么删 `run_pipeline`**:调用方只有一处,`astream` 消费到末尾等价于同步结果。留两份实现只会漂移。
- **为什么 checkpoint 不加租户前缀**:MVP 不做多租户。`thread_id = run_id` 已经全局唯一(uuid4)。
- **为什么审核点 snapshot 序列化用 `snapshot.values` 而非 `snapshot`**:snapshot 里含 checkpoint 元数据,前端不需要,只要 state 值。
- **为什么保留假 `node.log`**:agent 层真进度改造不在本次范围;前端已经渲染这个,先兼容。

## /opsx:explore 阶段补充的关键结论

### 与现有 OpenSpec 库的对齐

**探索发现,`openspec/specs/` 下的 4 个 workflow 相关 spec 与代码库严重不一致——归档 change `2026-07-03-simplify-workflow-orchestration` 只删了代码,没同步 spec。本次 change 要一并清理:**

| Capability | 现有 spec 状态 | 本次 change 动作 |
|---|---|
| `workflow-orchestration` | 描述 YAML runtime / `orchestrator.py` / `/workflows` router,代码全无 | **REMOVE**——概念已死 |
| `workflow-sse-streaming` | 描述通用 `/workflows/{id}/run?stream=true` 协议,代码全无 | **REMOVE**——新协议归入 `plan-generation-pipeline` |
| `plan-generation-pipeline` | 端点还是 `/workflows/plan_generation_pipeline/run`,retry/skip/abort 语义 | **MODIFY**——端点改 `/plan/*`,control 语义换成 approve/reject/cancel;新增 checkpointer + interrupt 相关 requirement |
| `plan-generation-workbench` | 提到"重试/跳过/终止"按钮、"关闭自动继续"开关、章节流式 | **MODIFY**——按钮改成 approve/reject/cancel;去掉"自动继续"开关(概念已作废);章节流式改成对齐 `chapter.*` SSE 事件的 requirement |

**capability 划分**:所有 checkpointer / interrupt / SSE / API 端点相关的 requirement 全部并入 `plan-generation-pipeline`(即用户拍板的 1.B/2.A/3.A 组合)。本次不新增独立的 `plan-run-checkpoint` capability——`/opsx:propose` 若发现单一 capability 过大,可再拆分。

### 待澄清点结论

1. **`reject` 的 target_node 范围**:限制为"当前审核点 || 上一个审核点"。跨多个审核点回滚在数据侧不安全(上游 state 已被后续节点消费,回滚可能不一致)。propose 阶段在 spec 里明写。
2. **`approve` 的 patch 覆盖粒度**:整节点输出替换。JSON merge 在 Pydantic 结构化产出上语义不清,且用户 UI 端拿的就是整节点数据,替换语义直接。
3. **`node.log` 保留**:短期保留 `_NODE_LOG_STEPS` 假日志(前端已经渲染)。spec 里定义 `node.log` 事件是**协议级**的,不承诺"必然发送"——由服务端决定是否发,agent 层真进度改造属于后续独立 change。
4. **`snapshot` 在 `workflow.paused` 里的 schema**:只发**当前 awaiting 节点即将读取的完整 state 视图**——具体就是即将执行的那个 `_build_node` 会读到的字段(比如 `strategy_generation` 前发的是 `brand_input` + 所有上游节点输出)。前端要展示"审核依据"就是这些数据。全 state 太大,只发单节点输出又缺上下文。
5. **checkpoint 清理**:
   - `cancel` 立即删该 thread_id 的所有 checkpoint
   - `completed` 保留 7 天,后台任务扫过期清理(propose 阶段决定用 cron 还是启动时清)
   - 磁盘兜底:超过 500MB 触发告警(不阻断)
6. **`node.failed` 视为虚拟审核点**:失败后 checkpoint 已落盘,前端在 `workflow.paused` 事件里带 `reason: "failure"` 字段,UI 用相同的审核面板,`approve` = 忽略错误往下(不推荐,一般 disable)、`reject` = 回退重跑、`cancel` = 终止。**不新增独立 retry 端点**——action 语义在 approve/reject 内闭环。
7. **前端 hook 改名**:`useWorkflowSSE` → `usePlanRun`。文件路径 `frontend/src/hooks/useWorkflowSSE.ts` → `usePlanRun.ts`。名字里的 "workflow" 已经名不副实。同步改测试文件名 `useWorkflowSSE.test.tsx`。

### 显式 out-of-scope(propose 阶段确认)

- **`node.log` 真进度**:短期保留假日志,agent 层 emit 真进度改造独立 change。
- **多租户 / 认证 / run 归属**:MVP 后仍不做。thread_id 全局唯一即可。
- **主动 pause API**:模型 A 敲定后不需要,不实现。
- **章节级 patch**:`approve` 的 patch 只支持整节点替换,不支持"改某章不改其他章"。这种粒度改动通过 reject → 重跑 → 再 approve 走。
- **章节 title/subtitle 可配置**:9 章模板本次写死在代码 + spec。做成可配置留给后续 change。

## 相关文件

- 后端
  - `backend/app/services/plan_generation_service.py` — 重写
  - `backend/app/routers/plan.py` — 扩展
  - `backend/app/schemas/plan_run.py` — 新增
  - `backend/.gitignore` 或 `backend/data/.gitkeep` — 新增
- 前端
  - `frontend/src/api/plan.ts` — 改 URL / 拆分函数
  - `frontend/src/hooks/useWorkflowSSE.ts` — 改方法 / 可选改名
  - `frontend/src/pages/PlanPage.tsx` — 审核点 UI
- 依赖
  - `backend/pyproject.toml` — 加 `langgraph-checkpoint-sqlite` 或等价 extras
