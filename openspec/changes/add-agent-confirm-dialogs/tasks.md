## 1. 后端：修改图结构为 interrupt_after 全部节点

- [x] 1.1 将 `plan_generation_service.py` 中的 `interrupt_before` 改为 `interrupt_after=_NODE_ORDER`，确保每个 agent 执行后 pause
- [x] 1.2 更新 `_translate_event` 在 `on_chain_end` 时发送 `agent.complete` 事件，携带 output 摘要
- [x] 1.3 修改 `_checkpoint_tuple`/`aget_state` 相关逻辑，确保从 paused 状态能正确获取当前节点和输出

## 2. 后端：新增重新执行 API

- [x] 2.1 新增 `rerun_run(run_id)` 函数，清空当前节点的 state 输出后 resume
- [x] 2.2 在 `plan.py` router 中新增 `POST /plan/runs/{run_id}/rerun` 端点
- [x] 2.3 在 `plan.ts` (前端 API) 中新增 `rerunPlanRun(runId)` 函数

## 3. 前端：修改 Tab 映射为 agent 映射

- [x] 3.1 重写 `PlanPage.tsx` 中的 TABS 常量，改为 10 个 agent 映射
- [x] 3.2 实现 tab 高亮逻辑：当前 running 的 agent 对应 tab 高亮，已完成 agent 对应 tab 显示完成标记
- [x] 3.3 实现点击 tab 滚动到 PipelineTimeline 对应 agent 行的功能

## 4. 前端：实现确认对话框

- [x] 4.1 新增 `AgentConfirmDialog.tsx` 组件，包含"确认继续"和"重新执行"按钮
- [x] 4.2 在 `PipelineTimeline.tsx` 中集成确认对话框，workflow.paused 时自动弹出
- [x] 4.3 在 `usePlanRun.ts` 中处理 rerun 流程
- [x] 4.4 支持点击已完成的 agent 重新打开确认框

## 5. 测试

- [x] 5.1 后端测试：测试 rerun API 的正确性
- [x] 5.2 前端测试：测试确认框的渲染和按钮交互
