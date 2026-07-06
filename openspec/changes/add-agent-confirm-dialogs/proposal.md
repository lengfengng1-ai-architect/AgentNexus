## Why

当前工作流的 10 个 agent 串行执行，中间没有人工干预环节。用户希望在每个 agent 执行完成后，都能查看结果并决定是否继续——只有用户点击"确认继续"后才执行下一个 agent，若结果不满意可以重新执行当前 agent。

## What Changes

- **后端**: 在全部 10 个 agent 节点后添加 interrupt，每个 agent 执行完成后 workflow paused，等待用户确认
- **后端**: 新增 `agent.complete` SSE 事件，在 agent 执行完成时发送该节点的执行结果摘要
- **后端**: 新增"重新执行"API，允许用户清空当前 agent 输出后重新调用 handler
- **前端**: 每个 agent 执行完成后自动弹出确认对话框，展示执行结果摘要
- **前端**: 确认对话框含 2 个按钮：**确认继续** → resume workflow；**重新执行** → 重新运行当前 agent
- **前端**: Tab 栏从 10 个 tab 改为与 10 个 agent 一一映射，当前执行的 agent 对应的 tab 高亮
- **前端**: 点击 tab 滚动到 PipelineTimeline 中对应 agent 行
- **确认框支持用户点击已完成的 agent 重新打开查看**

## Capabilities

### New Capabilities
- `agent-confirm-dialog`: 每个 agent 执行完成后的用户确认机制，包括确认继续和重新执行

### Modified Capabilities
- `plan-generation-pipeline`: 串行 pipeline 改为每个节点执行完毕后暂停等待用户确认
- `workflow-orchestration`: SSE 事件类型增加 `agent.complete`，用于传输 agent 执行结果

## Impact

- **后端**: `plan_generation_service.py` — 图构建方式从 interrupt_before 3 个节点改为每个节点后 pause，新增重新执行 API
- **前端**: `PlanPage.tsx` — Tab 改为 10 个 agent 映射，点击 tab scroll 到 agent
- **前端**: `PipelineTimeline.tsx` — 新增确认对话框组件
- **前端**: `usePlanRun.ts` — 处理 `agent.complete` 事件和重新执行流程
- **前端**: `plan.ts` (API) — 新增重新执行 API 调用
