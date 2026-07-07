# Agent 执行日志终端展示改进

## Why

当前 Agent 执行流水线（PipelineTimeline）展开面板中，日志信息显示不完整 — `node.start`、`node.complete` 等核心事件因为没有 `message` 字段被跳过，用户看不到完整的执行进度。日志展示样式也是普通文本列表，在密集信息场景下可读性差。

改进后用户能清晰看到每个 Agent 的实时执行日志、自动跟随最新进度，完成后一眼看到执行结果摘要。

## What Changes

- **nodeLogs 数据补齐** — `usePlanRun.ts` 中的 `nodeLogs` memo 改为对所有事件类型生成默认消息，不再依赖后端 SSE 是否携带 `message` 字段
- **PipelineTimeline 日志区改造** — 展开面板内的日志展示改为终端风格（深色背景、等宽字体、竖滚），新日志自动滚动到底部
- **自动展开优化** — 运行中（`running`）的节点也自动展开日志面板，不限于暂停节点
- **执行摘要** — 运行完成后在日志区下方展示摘要（状态、耗时、日志条数）
- **无后端改动** — 不改 SSE 协议，不改后端代码

## Capabilities

### New Capabilities

无 — 这是一个前端 UI 增强，不引入新能力。

### Modified Capabilities

- `plan-generation-pipeline` — PipelineTimeline 组件日志展示样式和内容增强，计划生成流水线的视觉反馈改进
- `plan-generation-workbench` — PlanPage 中展开面板的日志体验提升

## Impact

| 层面 | 影响 |
|------|------|
| 前端文件 | `frontend/src/hooks/usePlanRun.ts` — nodeLogs 数据逻辑 (≤20 行改动) |
| 前端文件 | `frontend/src/pages/PipelineTimeline.tsx` — 组件 JSX 和样式重写 (≤100 行净增) |
| 测试文件 | `frontend/src/__tests__/PipelineTimeline.test.tsx` — 需补充新样式测试 |
| 后端 | 无改动 |
| API/SSE 协议 | 无改动 |
