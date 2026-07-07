## 1. 数据层：补齐 nodeLogs 事件消息

- [x] 1.1 修改 `usePlanRun.ts` 的 `nodeLogs` memo，当 `log.message` 为空时根据 `log.event` 类型生成默认消息
- [x] 1.2 验证日志按 nodeId 正确分组，顺序与 SSE 到达顺序一致

## 2. 展示层：PipelineTimeline 终端样式日志

- [x] 2.1 在 `PipelineTimeline.tsx` 中新增 `LogViewer` 子组件，实现深色终端风格容器（`#0f172a` 背景、monospace 字体、12px 字号、max-height 200px、overflow-y auto）
- [x] 2.2 日志行按语义着色：开始蓝、完成绿、失败红、等待黄；运行中最新行加 `▸` 前缀
- [x] 2.3 使用 `useRef` + `useEffect` 实现新日志到来时自动滚动到底部
- [x] 2.4 替换展开面板中原有的普通日志渲染为 `LogViewer` 组件，传入 `nodeLogs[agent.id]`

## 3. 自动展开优化

- [x] 3.1 将 `useEffect` 自动展开条件从仅 `pausedNode` 扩展为同时覆盖 `running` 状态节点

## 4. 执行摘要

- [x] 4.1 执行完成后（complete / paused），在日志区下方显示摘要面板（状态图标、耗时、日志条数）
- [x] 4.2 耗时从 `PlanNode.startedAt` / `completedAt` 计算

## 5. 测试

- [x] 5.1 更新 `PipelineTimeline.test.tsx` 覆盖终端日志展示、自动展开、摘要等新行为
- [x] 5.2 验证 `nodeLogs` 对无 message 事件生成默认消息的单元测试
