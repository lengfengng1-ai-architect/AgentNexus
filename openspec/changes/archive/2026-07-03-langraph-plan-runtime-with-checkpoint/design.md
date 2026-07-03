## Context

**现状**：

- `plan_generation_service.py` 存在两个漂移实现：`run_pipeline`(走 `_pipeline.ainvoke()`) vs `run_stream`(手写 for 循环调 `get_handler`，绕过 LangGraph astream)。两条路径的 handler 入参形态并不一致，任何 pipeline 拓扑修改都必须双改，维护成本 2x。
- LangGraph `StateGraph` 已经在用，但没接 checkpointer，也没有 `interrupt_before`。所以「跑到一半让人审核」这个产品语义在代码层根本不存在，只能靠"跑完全部 → 让人看"这种反馈周期极长的方式。
- commit `1470bcb` 删掉了通用 YAML runtime 后端代码，但没同步前端和 spec：前端 `useWorkflowSSE` 解析条件要求每帧带 `run_id` + `id`(后端只发 `event/data`)、`startPlanRun` 请求体多包一层 `input`(后端签名不接受，422)、`resumePlanRun`/`controlPlanRun`/`getPlanRunStatus` 打 `/workflows/*`(404)。`openspec/specs/` 下 `workflow-orchestration` / `workflow-sse-streaming` / `plan-generation-pipeline` / `plan-generation-workbench` 4 份 spec 仍描述已删除代码。

**约束**：

- 依赖管理必须用 uv，Agent 框架必须是 LangGraph + DeepAgents(见 `.claude/CLAUDE.md § 1`)。
- MVP 阶段不引入 Postgres 等外部服务，checkpointer 只能选 SQLite。
- 不做多租户/认证，thread_id 全局唯一即可。
- 前端 `PlanPage` 是已存在页面，改动尽量对齐现有 hook API 表面。

**stakeholders**：品牌运营用户(在 `/plan` 审核方案)、后续 Reviewer(读 spec 与实现)。

## Goals / Non-Goals

**Goals**:

- 单一 pipeline 执行入口(`run_stream`)，删除 `run_pipeline`。
- 引入 `AsyncSqliteSaver` checkpointer + `interrupt_before=[strategy_generation, execution_planning, plan_generator]`，实现「跑到审核点自然停」的产品语义。
- 提供 `approve` / `reject` / `cancel` / `status` 4 个审核 API，语义闭环覆盖失败节点(视为虚拟审核点)。
- SSE 协议规范化：`id/event/data` 三行、首帧 `workflow.start`、审核点 `workflow.paused`、`chapter.*` 增量事件。
- `plan_generator` 内部改造成章节级流式，9 章 `title/subtitle` 由 `PLAN_CHAPTER_SPEC` 常量固定，LLM 只填 `content`。
- 前后端契约与 SSE 帧格式对齐(前端 4 个 API 函数、`useWorkflowSSE` 名字/内部方法、`PlanPage` 审核 UI)。
- 陈旧 spec 清理：`workflow-orchestration` / `workflow-sse-streaming` REMOVE，`plan-generation-pipeline` / `plan-generation-workbench` MODIFY 对齐新实现。

**Non-Goals**:

- 不重建通用 YAML workflow runtime。
- 不实现主动 pause API：审核点是唯一暂停时机，不需要「跑到一半停一下」。
- 不改 agent 层进度日志：短期继续用 `_NODE_LOG_STEPS` 假日志兼容前端渲染。
- 不做多租户 / 认证 / run 归属：`thread_id = run_id`(uuid4) 已全局唯一。
- 不做章节级 patch：`approve` 的 patch 只支持整节点替换，改单章通过 reject → 重跑走。
- 不做跨多审核点回滚：`reject.target_node` 限制为「当前审核点 || 上一个审核点」。
- 不接真实 API：Mock 模式 `USE_MOCK_DATA=true` 行为保持不变。

## Decisions

### D1: Checkpointer 用 `AsyncSqliteSaver`，文件放 `backend/data/checkpoints.db`

**选择**：`langgraph.checkpoint.sqlite.aio.AsyncSqliteSaver`，`from_conn_string("backend/data/checkpoints.db")`，模块级持有单例。目录 `backend/data/` 通过 `.gitkeep` 保留，`checkpoints.db*` 加入 `.gitignore`。

**替代方案**：

- `MemorySaver`：进程重启即丢，用户刷新页面就没了 run 状态，不满足产品诉求。
- `PostgresSaver`：MVP 不引入 Postgres，运维成本超预算。

**理由**：SQLite 文件方案零依赖零运维、进程重启后 run 状态保留、后续要迁 Postgres 只是换一行 factory。异步版本(`aio`) 与 FastAPI async 栈匹配。

### D2: interrupt 策略选「强审核点 `interrupt_before`」

**选择**：编译时 `_pipeline = _build_graph().compile(checkpointer=..., interrupt_before=["strategy_generation","execution_planning","plan_generator"])`。用户无需主动 pause，跑到这 3 个节点前自动停。

**替代方案**：

- 主动 pause API(`POST /pause`)：需要额外的 abort/pause 状态机 + 前端主动触发 UI，且实际产品里用户"跑到一半停一下"的场景不存在。
- `interrupt` 函数内部调用(`from langgraph.types import interrupt`)：更灵活但把审核点耦合进 agent 代码，本次涉及的 3 个节点场景固定，写在 compile 参数里更清晰。

**理由**：审核点是**产品级契约**(策略/执行/最终稿必须人审)，不是 agent 内部临时行为，暴露在 graph 编译层更合理。少一个 API + 一套状态机。

### D3: 审核点交互模型 = 通过 / 修改再通过 / 打回上一步

**选择**：3 个动作 3 个语义：

- `approve(patch=None)`：patch=None → 原样通过；patch != None → 用 patch 覆盖当前审核点上游节点输出(整节点替换)，再 resume。
- `reject(target_node, patch=None)`：`target_node` 限制在「当前审核点 || 上一个审核点」，回滚 checkpoint 到 target 并重跑。可带 patch 修改上游输入。
- `cancel`：删除 thread_id 对应所有 checkpoint，run_id 不复活。

**替代方案**：

- retry / skip / abort(原 workflow-sse-streaming spec 的做法)：语义与 approve/reject 高度重叠但抽象得更弱(retry 是 reject 的子集，skip 会污染下游 state)。
- 独立 `retry` 端点：`node.failed` 后 checkpoint 已落盘，reject 直接覆盖了「回退到失败节点重跑」的语义，独立端点冗余。

**理由**：3 动作 vs 4 动作是最小完备集。`node.failed` 视为**虚拟审核点** — `workflow.paused` 带 `reason: "failure"`，UI 用同一套面板，approve = 忽略错误往下(通常 disable)、reject = 回退重跑、cancel = 终止。

### D4: 删除 `run_pipeline`，`run_stream` 消费 `astream_events(version="v2")`

**选择**：

```python
async def run_stream(run_id, brand_input=None, resume_payload=None):
    config = {"configurable": {"thread_id": run_id}}
    input_state = (
        {"brand_input": brand_input, ...} if brand_input is not None
        else (Command(resume=resume_payload) if resume_payload else None)
    )
    if brand_input is not None:
        yield _sse("workflow.start", {"run_id": run_id})
    async for event in _pipeline.astream_events(input_state, config=config, version="v2"):
        translated = _translate_event(run_id, event)
        if translated: yield translated
    snapshot = await _pipeline.aget_state(config)
    if snapshot.next:
        yield _sse("workflow.paused", {...})
    else:
        yield _sse("workflow.complete", {...})
```

**替代方案**：

- 保留 `run_pipeline`：唯一调用方(non-streaming path) 消费 `astream` 到末尾就等价，两份实现只会漂移。
- 手写 for 循环调 handler(当前 `run_stream`)：绕过 LangGraph checkpointer/interrupt，跟 D1/D2 冲突。

**理由**：LangGraph astream 是官方推荐路径，checkpointer/interrupt/状态恢复全部原生支持。`_translate_event` 把 `on_chain_start`/`on_chain_end` 映射到项目 SSE 事件表，这层适配是不可避免的成本，但只需要一份。

### D5: `plan_generator` 章节级流式 + 9 章 `title/subtitle` 固定

**选择**：

```python
# app/schemas/plan_generation.py
PLAN_CHAPTER_SPEC: tuple[ChapterSpec, ...] = (
    ChapterSpec(title="项目概述", subtitle="品牌与目标"),
    ChapterSpec(title="市场分析", subtitle="趋势与竞争"),
    ChapterSpec(title="营销策略", subtitle="核心定位与打法"),
    ChapterSpec(title="执行方案", subtitle="赛事与内容"),
    ChapterSpec(title="数字化运营", subtitle="平台工具"),
    ChapterSpec(title="达人体系", subtitle="KOL / KOC 网络"),
    ChapterSpec(title="时间规划", subtitle="阶段与节奏"),
    ChapterSpec(title="KPI",     subtitle="效果指标"),
    ChapterSpec(title="预算",     subtitle="分配与测算"),
)

# app/agents/plan_generator.py
from langgraph.config import get_stream_writer
async def run_plan_generator(state):
    writer = get_stream_writer()
    chapters: list[PlanChapter] = []
    for idx, spec in enumerate(PLAN_CHAPTER_SPEC):
        writer({"custom_event": "chapter.start", "chapter_index": idx, "title": spec.title})
        content = await _generate_chapter(idx, spec, state, chapters)  # 每章一次 LLM 调用
        chapters.append(PlanChapter(index=idx, title=spec.title, subtitle=spec.subtitle, content=content))
        writer({"custom_event": "chapter.complete", "chapter_index": idx, "title": spec.title,
                "subtitle": spec.subtitle, "content": content})
    return {"chapters": [c.model_dump() for c in chapters]}
```

上游 `run_stream` 从 `astream_events` 里识别 `on_custom_event` 翻译成 SSE。

**替代方案**：

- 一次 LLM 调用生成 9 章 JSON：延迟高(首字节要等所有章都生成)、单次 prompt 超长易触发 token limit、无法让下游章引用上游章的具体表述。
- LLM 自主决定章节结构：模板不稳定，前端 UI 无法预铺占位卡。

**理由**：产品语义上章 N 生成时能读到章 1..N-1 已有内容，叙事连贯性直接提升。每次 LLM 调用短了，首字节延迟低，可感响应速度更好。`title/subtitle` 固定的代价是"灵活性缺失"，但方案文档结构本身就是固定套路，不需要 LLM 决策。

### D6: SSE 协议标准三行帧 + 事件表

**选择**：每帧 `id/event/data` 三行，`data` 是 JSON 字符串。事件全表：

| event | data 字段 | 何时发 |
|---|---|---|
| `workflow.start` | `run_id` | 每个 SSE 响应最开始(仅首次 start，`approve`/`reject` 后续流不重发) |
| `node.start` | `run_id, node_id, label` | LangGraph `on_chain_start` |
| `node.log` | `run_id, node_id, message` | `_NODE_LOG_STEPS` 假日志驱动(短期) |
| `node.complete` | `run_id, node_id, data` | LangGraph `on_chain_end` |
| `node.failed` | `run_id, node_id, error` | handler 抛异常 |
| `chapter.start` | `run_id, node_id="plan_generator", chapter_index, title` | `plan_generator` 内部开始生成某章 |
| `chapter.complete` | `run_id, node_id="plan_generator", chapter_index, title, subtitle, content` | 某章生成完成 |
| `workflow.paused` | `run_id, awaiting_node, snapshot, reason` | 到达 `interrupt_before` 节点前;`reason` = `"review"` \| `"failure"` |
| `workflow.complete` | `run_id, outputs` | 全部完成 |
| `workflow.cancelled` | `run_id` | cancel 端点响应流末尾 |

**替代方案**：

- 只发 `event/data`(当前实现)：前端 `useWorkflowSSE` 已经要求 `id` 单调递增用于断线重连的 `Last-Event-ID`，不发 = 前端过滤掉全部事件。
- 更细粒度的 `node.progress`：`node.log` 已覆盖，且 agent 层没有真进度可推。

**理由**：`id` 由 SSE spec 定义为断线重连的定位符，backend 单调递增维护。`data` 里冗余 `run_id` 让前端不用维护「哪次响应属于哪个 run」的映射(尤其是 approve 后新流)。

### D7: `snapshot` 在 `workflow.paused` 里只发「即将执行节点的输入视图」

**选择**：`snapshot` 字段 = 即将执行的 `_build_node` 会读取到的字段集合(而非完整 state)。例：`strategy_generation` 前的 snapshot = `brand_input` + 所有已完成上游节点(product_research / market_research / audience_insight / plan_data_query / fitness_analysis) 的输出。

**替代方案**：

- 全 state：容易过大，前端要分辨"审核依据"和"无关字段"。
- 只发单节点输出：缺上下文，用户没法判断上游是否需要一并改。

**理由**：审核 UI 需要展示「你为什么要审这个 → 因为上游产出这些数据」，正好是即将执行节点会读到的输入。

### D8: capability 划分 — 不拆独立 `plan-run-checkpoint` capability

**选择**：checkpointer / interrupt / SSE / API 全部并入 `plan-generation-pipeline`，作为其新增/修改的 requirement。

**替代方案**：新建 `plan-run-checkpoint` capability。

**理由**：checkpoint / interrupt / 审核 API 都是 pipeline 的执行属性，不构成独立能力。一条 pipeline 拆两个 capability 反而模糊了责任边界。如果 `/opsx:propose` 发现 modified 段过大，`/opsx:apply` 阶段可再拆。

### D9: `useWorkflowSSE` → `usePlanRun` 改名

**选择**：`frontend/src/hooks/useWorkflowSSE.ts` → `usePlanRun.ts`，内部方法 `control` 拆成 `approve` / `reject` / `cancel`，测试文件同步改名。

**替代方案**：名字保留。

**理由**：`workflow` 概念已随代码删除了，hook 名字里的 "workflow" 名不副实。改名一次比留个错误名字长期误导小。

### D10: checkpoint 清理策略

**选择**：

- `cancel` → 立即删该 thread_id 所有 checkpoint。
- `completed` → 保留 7 天，启动时 + 每 6h 后台任务扫描过期删除。
- 磁盘超 500MB → 日志告警不阻断。

**替代方案**：

- 永不清理：SQLite 文件会无限增长，MVP 阶段小问题但 6 个月后就是 bug。
- 完成即删：违反「用户可回看已完成 run」的直觉。

**理由**：7 天满足「用户下周想再看看昨天的方案」的场景；磁盘告警而非阻断避免影响正常流程。定时任务用 FastAPI startup event 起 asyncio 后台协程即可，不引入 celery。

## Risks / Trade-offs

- **[风险] LangGraph `astream_events` 事件形态在版本升级时可能变化** → 通过 `version="v2"` 显式钉死；`_translate_event` 集中在一个函数便于版本迁移。
- **[风险] SQLite 并发写(多个 run 同时跑) 会锁库** → SQLite WAL 模式支持并发读+单写，MVP 阶段并发 < 5 完全够用;上量后迁 Postgres。`ponytail:` 注释标注这个天花板。
- **[风险] `snapshot` 序列化含 Pydantic 对象** → 统一走 `.model_dump()` 递归；`_translate_event` 内做兜底 `pydantic_encoder`。
- **[Trade-off] 章节级流式增加总 token 消耗** → 每章 prompt 需带前 N-1 章上下文，总 token 上升;换来首字节延迟大幅降低 + 叙事连贯性提升。产品优先响应体感，接受成本。
- **[Trade-off] 9 章 title/subtitle 写死** → LLM 无法调整方案结构;但方案模板本身就是行业固定套路(项目概述→市场→策略→执行→...)，灵活性没有实际需求。
- **[风险] 前端 SSE `Last-Event-ID` 重连支持是本 change scope 内还是外** → **scope 外**。后端标准化帧格式和 `id` 单调递增，前端断线重连能力独立 change 推进(需要后端支持 replay from event id)。
- **[风险] 前端改名 `useWorkflowSSE` → `usePlanRun` 会误伤 grep** → 一次性改完；PR 里显式列 rename 列表。
- **[风险] `dispatch_custom_event` / `get_stream_writer` API 在 LangGraph 老版本不存在** → `pyproject.toml` 里锁定 langgraph >= 0.2.34；uv 安装时验证。

## Migration Plan

1. **依赖安装**：`uv add langgraph-checkpoint-sqlite`(如已包含在 langgraph 主包则跳过)；`uv lock` 更新。
2. **后端**：
   - 新增 `backend/data/.gitkeep`；`.gitignore` 追加 `backend/data/checkpoints.db*`
   - 新增 `app/schemas/plan_run.py`(`PlanRunRequest` / `ApproveRequest` / `RejectRequest` / `RunStatus`)
   - `app/schemas/plan_generation.py` 追加 `PLAN_CHAPTER_SPEC` 常量 + `ChapterSpec` 类
   - 重写 `app/services/plan_generation_service.py`：删 `run_pipeline`，`run_stream` 换 astream；`_pipeline.compile(checkpointer=..., interrupt_before=[...])`；新增 `approve` / `reject` / `cancel` / `status` 服务函数
   - `app/routers/plan.py` 新增 4 端点
   - `app/agents/plan_generator.py` 改为章节循环 + `dispatch_custom_event`
   - 启动时后台任务：过期 checkpoint 清理
3. **契约文件**：`docs/api/paths/plan.yaml` 补 5 端点契约(operationId: `plan_run` / `plan_approve` / `plan_reject` / `plan_cancel` / `plan_status`)。
4. **前端**：
   - `src/api/plan.ts`：`startPlanRun` 请求体改 `{brand_input}`；拆 `approvePlanRun` / `rejectPlanRun` / `cancelPlanRun` / `getPlanRunStatus`
   - `mv src/hooks/useWorkflowSSE.ts src/hooks/usePlanRun.ts` + 对应 test 文件
   - `src/pages/PlanPage.tsx`：`workflow.paused` 时渲染审核面板(节点产出预览 + patch 编辑器 + 3 按钮)；`chapter.complete` 时增量渲染方案区
5. **spec**：本 change 归档时 delta 同步到 `openspec/specs/`；`workflow-orchestration` / `workflow-sse-streaming` 目录物理删除。

**Rollback strategy**：本 change 是 BREAKING(前后端契约变更)，无法灰度。回滚方案 = 回退到本 change 的父 commit + 前端旧 `useWorkflowSSE` + 删掉 `backend/data/checkpoints.db`。`/opsx:apply` 阶段 PR 拆分为「后端契约 + 前端契约 + 章节流式」3 个 commit 便于精细回滚(但同一 PR 合入)。

## Open Questions

- `_generate_chapter` 每章的 prompt 模板文件如何组织：一个模板 9 个变体？还是 9 个模板文件？留 `/opsx:apply` 阶段决定(建议：一个 Jinja2 模板 + `PLAN_CHAPTER_SPEC[idx].prompt_hint` 字段驱动，但这属于实现细节)。
- checkpoint 过期清理是启动时一次性 + 前台请求触发 lazy 检查，还是常驻后台协程？倾向后者(async task on startup)，但可在 `/opsx:apply` 复核实际负载。
