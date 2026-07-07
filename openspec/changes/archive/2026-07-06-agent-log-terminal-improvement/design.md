# Agent 执行日志终端展示 — 设计

## Context

当前 PipelineTimeline 组件展开面板展示日志的方式存在两个缺陷：

1. **数据不完整**：`usePlanRun.ts` 中 `nodeLogs` 的 `useMemo` 过滤条件为 `log.nodeId && log.message`，而 SSE 推来的 `node.start`、`node.complete`、`workflow.paused` 等核心事件没有 `message` 字段，导致这些事件全部被忽略
2. **展示样式弱**：日志以普通 `<p>` 列表渲染，没有视觉层次，密集信息下可读性差

数据流：

```
后端 SSE 流 → state.logs (PlanLogEvent[]) → nodeLogs (Record<string, string[]>) → PipelineTimeline 渲染
                                      ↑                          ↑
                                 所有事件都存了             只取有 message 的
                                                          node.start/complete 丢失
```

这是一个纯前端改动，不涉及后端和 SSE 协议变更。

## Goals / Non-Goals

**Goals:**
- 展开 Agent 日志面板时，显示该 Agent 从开始到当前的全部执行日志
- 日志以终端风格（深色背景、等宽字体、竖滚）展示
- 新日志自动滚动到最新行
- 运行中（running）的节点自动展开日志面板
- 执行完成后在日志下方展示摘要（状态、耗时、日志条数）

**Non-Goals:**
- 不改后端 SSE 协议和数据格式
- 不改 Node 启动/完成计时逻辑（reducer 已记录 startedAt/completedAt）
- 不改 PlanLogStream 组件（顶部横幅单独保留）

## Decisions

### Decision 1: nodeLogs 数据补齐策略

**方案**：在 `usePlanRun.ts` 的 `nodeLogs` memo 中，当 `log.message` 为空时，根据 `log.event` 类型生成默认消息：

| 事件 | 消息 |
|------|------|
| `node.start` | "开始执行…" |
| `node.complete` | "✓ 执行完成" |
| `node.failed` | "✗ 执行失败: {message}" |
| `workflow.paused` | "⏸ 等待人工确认" |
| 其他 | `log.event` 原文 |

**为什么不是后端加 message 字段？** — 不改后端，减少沟通成本和回归风险。前端纯推导即可。

### Decision 2: 日志容器样式

**方案**：在 PipelineTimeline 的展开面板内用内联 style 实现终端式深色容器。

```
┌─────────────────────────────────┐
│ ▸ 产品调研 Agent：开始执行…      │  背景: #0f172a (slate-900)
│   ✓ 执行完成                    │  字体: monospace 12px
│                                │  颜色: 按语义着色
│ [自动滚动到底部]                │  max-height: 200px, overflow-y: auto
└─────────────────────────────────┘
```

- 运行中：最新行前加 `▸` 前缀，颜色随语义（开始蓝、完成绿、失败红、等待黄）
- 自动滚动：`useRef` 指向末尾，在 `logs.length` 变化时 `scrollIntoView`
- 自定义 scrollbar：4px 窄滚动条适配深色背景

### Decision 3: 自动展开策略

将自动展开从仅 `pausedNode` 改为同时覆盖 `running` 节点：

```tsx
const runningNode = nodes.find(n => n.status === 'running')
const target = runningNode?.id ?? pausedNode
```

用户仍然可以手动收起。

### Decision 4: 执行摘要

完成（complete）或暂停（paused）状态时，在日志下方显示摘要区：

```
✅ 执行摘要
状态：已完成 · 耗时：1分02秒 · 日志：共 5 条
```

耗时从 `PlanNode.startedAt` / `PlanNode.completedAt` 计算。

## Risks / Trade-offs

- [低] 日志行数过多时面板高度固定 200px + 竖滚，超出部分不展示 — 用户预期合理，与终端行为一致
- [低] 自动滚动对用户手动翻看历史日志有干扰 — 仅在 `logs.length` 变化时触发，用户手动滚动不会被打断
