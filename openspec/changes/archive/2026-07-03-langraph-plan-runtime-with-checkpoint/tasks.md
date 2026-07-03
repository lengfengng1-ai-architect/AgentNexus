## 当前进度

- 已完成：1-14 全部完成。后端全量测试 125 passed，覆盖率 82%；前端 `npx tsc -b` 通过，测试 39 passed；Playwright 视觉回归 3 passed / a11y 2 passed / 真实 LLM E2E（chat → plan 首次暂停）1 passed；后端真实 LLM 全链路验证：approve 连续 3 次到 complete、reject 回滚、cancel 404 均通过。
- 待完成：无。等待 `/opsx:archive` 归档。

## 1. 清理陈旧 spec

- [x] 1.1 删除 `openspec/specs/workflow-orchestration/` 整个目录
- [x] 1.2 删除 `openspec/specs/workflow-sse-streaming/` 整个目录
- [x] 1.3 确认 `openspec/specs/plan-generation-pipeline/spec.md` 与 `plan-generation-workbench/spec.md` 会由 `/opsx:archive` 阶段自动合入 delta，本步不手改

## 2. API 契约(OpenAPI YAML)

- [x] 2.1 新建 `docs/api/paths/plan.yaml`,定义 5 个端点:`plan_run` / `plan_run_approve` / `plan_run_reject` / `plan_run_cancel` / `plan_run_status`
- [x] 2.2 补上响应头 `X-Run-Id`(仅 `plan_run` 端点)
- [x] 2.3 为每个端点定义 200/400/422/500 响应,复用 `APIError` 组件
- [x] 2.4 定义 SSE 事件负载 schema:`WorkflowStart` / `NodeStart` / `NodeLog` / `NodeComplete` / `NodeFailed` / `WorkflowPaused` / `ChapterStart` / `ChapterComplete` / `WorkflowComplete` / `WorkflowCancelled`

## 3. 后端依赖与配置

- [x] 3.1 `cd backend && uv add langgraph-checkpoint-sqlite`
- [x] 3.2 `.gitignore` 追加 `backend/data/checkpoints.db*`
- [x] 3.3 `backend/data/.gitkeep` 占位

## 4. 后端 schema

- [x] 4.1 新建 `backend/app/schemas/plan_run.py`,定义 `PlanRunRequest` / `ApproveRequest` / `RejectRequest` / `RunStatus` / `PausedSnapshot`
- [x] 4.2 在 `backend/app/schemas/plan_generation.py` 新增 `PLAN_CHAPTER_SPEC: tuple[PlanChapterSpec, ...]` 常量(9 章 title/subtitle 固定)
- [x] 4.3 字段 description / 类型 / 校验规则与 `docs/api/paths/plan.yaml` 逐字段对齐

## 5. 后端 service — plan_generation_service.py 重写

- [x] 5.1 顶部初始化 `AsyncSqliteSaver.from_conn_string("backend/data/checkpoints.db")`,模块级单例
- [x] 5.2 `_build_graph()` 保留;`_pipeline = _build_graph().compile(checkpointer=..., interrupt_before=["strategy_generation","execution_planning","plan_generator"])`
- [x] 5.3 删除 `run_pipeline` 函数与所有调用
- [x] 5.4 重写 `run_stream(run_id, brand_input=None, resume_payload=None) -> AsyncGenerator[str, None]`,消费 `_pipeline.astream_events(..., version="v2")`
- [x] 5.5 实现 `_translate_event(run_id, event)`:LangGraph 原生事件 → 本项目 SSE 帧(`node.start` / `node.complete` / `node.failed` / `chapter.start` / `chapter.complete`)
- [x] 5.6 每帧使用标准三行 `id: N\nevent: <type>\ndata: <json>\n\n`,`id` 从 1 单调递增,过程中缓存在闭包变量
- [x] 5.7 首帧发 `workflow.start {run_id}`;跑到 `interrupt_before` 前 emit `workflow.paused {run_id, awaiting_node, snapshot, reason: "review"}`
- [x] 5.8 通过 `_pipeline.aget_state(config)` 读 snapshot 判断当前处于哪个 awaiting_node,若 `snapshot.next` 为空则 emit `workflow.complete {run_id, outputs}`
- [x] 5.9 保留 `_NODE_LOG_STEPS` 假日志逻辑,在 `on_chain_start` 触发时逐条 emit `node.log`(短期方案,ponytail 注释标注升级路径)
- [x] 5.10 新增 `delete_checkpoint(run_id) -> None`,用于 cancel 端点清除 thread_id 对应 checkpoint
- [x] 5.11 新增 `get_status(run_id) -> RunStatus`,读 checkpointer 返回当前 state 快照

## 6. 后端 router — plan.py 扩展

- [x] 6.1 `POST /plan/run`:接收 `PlanRunRequest`,生成 `run_id = uuid4()`,响应头写 `X-Run-Id`,返回 `StreamingResponse(run_stream(run_id, brand_input=...))`
- [x] 6.2 `POST /plan/runs/{run_id}/approve`:接收 `ApproveRequest`,返回 `StreamingResponse(run_stream(run_id, resume_payload=body.patch))`
- [x] 6.3 `POST /plan/runs/{run_id}/reject`:接收 `RejectRequest`,校验 `target_node ∈ {当前 awaiting_node, 上一个审核点}`;不满足返回 400 `bad_request`,满足则回滚 checkpoint 到 target_node,继续 stream
- [x] 6.4 `POST /plan/runs/{run_id}/cancel`:调 `delete_checkpoint(run_id)`,返回 `{status: "cancelled"}`
- [x] 6.5 `GET  /plan/runs/{run_id}/status`:返回 `RunStatus`;checkpoint 不存在返回 404 `not_found`
- [x] 6.6 5 个端点全部对接 `APIError` 统一错误模型,补 400/422/500 分支

## 7. 后端 agent — plan_generator 章节级流式

- [x] 7.1 `backend/app/agents/plan_generator.py`(或对应 handler 文件)改为 `async def run_plan_generator(state)`,遍历 `PLAN_CHAPTER_SPEC`
- [x] 7.2 每章开始前调 `get_stream_writer()({"custom_event":"chapter.start","chapter_index":idx,"title":spec.title})`
- [x] 7.3 每章调一次 LLM 生成 `content`,已生成章节数组塞进 prompt 提供上下文
- [x] 7.4 每章完成 emit `{"custom_event":"chapter.complete","chapter_index":idx,"title":..., "subtitle":..., "content":...}`
- [x] 7.5 handler 最终返回值 `{"chapters":[c.model_dump() for c in chapters]}`,与 checkpointer state 对齐
- [x] 7.6 `_translate_event` 识别 LangGraph `on_custom_event` 类型的 payload,翻译成 SSE `chapter.start` / `chapter.complete` 帧
- [x] 7.7 保留 `plan_generator` 的 `node.complete` 发送完整 9 章数组,前端可选增量或整体渲染

## 8. 后端测试(pytest + pytest-asyncio,禁止 mock 真实 agent)

- [x] 8.1 `tests/services/test_plan_generation_service.py`:测 `run_stream` 首帧 `workflow.start` 携带 `run_id` 且 `X-Run-Id` 头正确
- [x] 8.2 测 SSE 帧格式:每帧三行 `id/event/data`,`id` 从 1 单调递增
- [x] 8.3 测 `interrupt_before` 生效:执行到 `strategy_generation` 前流被 `workflow.paused` 事件中断
- [x] 8.4 测 approve 恢复:同一 run_id 的第二次调用从审核点继续
- [x] 8.5 测 reject 回滚:`target_node` 越权(跨审核点)返回 400
- [x] 8.6 测 cancel:调用后 checkpoint 被删除,`status` 端点返回 404
- [x] 8.7 测 `plan_generator` 章节流式:9 个 `chapter.complete` 事件顺序发出,索引 0-8,title/subtitle 匹配 `PLAN_CHAPTER_SPEC`
- [x] 8.8 `tests/routers/test_plan.py`:5 个端点 200/400/404/422/500 分支覆盖
- [x] 8.9 覆盖率 ≥ 80%

## 9. 前端 API 层

- [x] 9.1 `frontend/src/api/plan.ts::startPlanRun` 请求体从 `{input: {brand_input}}` 改为 `{brand_input}`;从响应头读 `X-Run-Id`
- [x] 9.2 移除 `resumePlanRun`,新增 `approvePlanRun(run_id, patch?)`(POST `/plan/runs/{id}/approve`)
- [x] 9.3 移除 `controlPlanRun`,新增 `rejectPlanRun(run_id, target_node, patch?)`(POST `/plan/runs/{id}/reject`) 和 `cancelPlanRun(run_id)`(POST `/plan/runs/{id}/cancel`)
- [x] 9.4 `getPlanRunStatus(run_id)` 路径改 `/plan/runs/{id}/status`

## 10. 前端 hook

- [x] 10.1 `frontend/src/hooks/useWorkflowSSE.ts` 重命名为 `usePlanRun.ts`;测试文件 `useWorkflowSSE.test.tsx` → `usePlanRun.test.tsx`
- [x] 10.2 `readSSEStream` 去掉「必须有 run_id 才 yield」的过滤条件,改为「event 存在即 yield」
- [x] 10.3 hook 内部识别 `workflow.paused` 事件,暴露 `paused: {awaiting_node, snapshot, reason} | null` 状态
- [x] 10.4 hook 内部识别 `chapter.start` / `chapter.complete` 事件,暴露 `chapters: PlanChapter[]` 累积状态
- [x] 10.5 hook 提供 `approve(patch?)` / `reject(target_node, patch?)` / `cancel()` 方法,内部对接对应 API

## 11. 前端 UI — PlanPage 审核点

- [x] 11.1 `frontend/src/pages/PlanPage.tsx` 消费 `usePlanRun` 的 `paused` 状态,在 `paused !== null` 时渲染审核面板
- [x] 11.2 审核面板:节点产出预览 + 编辑区(可选 patch) + 三个按钮「通过」「改再通过」「打回上一步」
- [x] 11.3 移除「关闭自动继续」开关的所有 UI 与状态
- [x] 11.4 移除节点失败时的「重试 / 跳过 / 终止」按钮,失败视为虚拟审核点复用同一审核面板(按钮语义:通过=忽略错误往下(默认 disable)、打回=回退重跑、取消=终止)
- [x] 11.5 方案预览区消费 `chapters` 累积状态,一章生成一章渲染,支持骨架占位(9 个空槽)

## 12. 前端测试

- [x] 12.1 `usePlanRun.test.tsx`:mock SSE 流,断言 `paused` / `chapters` 状态转换
- [x] 12.2 `PlanPage` 视觉回归:审核点面板出现时的截图(320/768/1440)
- [x] 12.3 可访问性:键盘导航到审核按钮、审核对话 aria-label

## 13. 端到端联调

- [x] 13.1 起后端 `cd backend && uv run uvicorn app.main:app --reload`
- [x] 13.2 起前端 `cd frontend && pnpm dev`
- [x] 13.3 从 `/chat` 跳 `/plan`,跑到 `strategy_generation` 前应停在审核面板
- [x] 13.4 通过 → 继续到 `execution_planning` 前停;通过 → 继续到 `plan_generator` 前停;通过 → 章节逐个渲染;`workflow.complete` 后展示行动建议
- [x] 13.5 打回上一步:验证 checkpoint 回滚,重新生成上游节点
- [x] 13.6 cancel:验证 checkpoint 被删,再调 status 返回 404

## 14. 归档与文档

- [x] 14.1 更新 `docs/conventions/agent-framework.md`,写 checkpointer + interrupt_before 章节
- [x] 14.2 `codegraph update` 刷新索引
- [ ] 14.3 `/opsx:archive`:delta spec 合入主 spec,change 归档到 `openspec/changes/archive/<date>-langraph-plan-runtime-with-checkpoint/`
