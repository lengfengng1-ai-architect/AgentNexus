# 前端白屏 & Tab-Agent 映射失修复 — 设计

日期: 2026-07-06  
关联: feature-new-ds 分支  
关联 change: add-agent-confirm-dialogs（已归档）

## 1. Problem（问题描述）

用户运行工作流时遇到两个症状：

1. **完全白屏**：执行产品调研 agent 时页面变成完全白色。
2. **Tab 映射失灵**：Tab 栏显示了但点击 Tab 后没有滚动到对应 agent，且当前正在运行的 agent 没有高亮。

## 2. Root Cause（根因分析）

通过代码 review 定位到三个相互独立的问题：

### 2.1 scrollToAgent 在 flex 父容器坍缩时算出 NaN
- `PlanPage.tsx:121-133` 中 `scrollToAgent` 调用 `getBoundingClientRect()`
- `contentRef.current`（即 `<div style={{flex: 1, overflowY: 'auto'}}>`）的 `clientHeight` 在某些 SSE 重渲染瞬间为 0
- `clientHeight / 2 = NaN`，导致 `scrollTo({top: NaN})` 浏览器静默忽略 + 整个 React 重渲染受影响

### 2.2 Tab-Agent 状态源不充分
- `PlanPage.tsx:110` `activeAgentNode = nodes.find(n => n.status === 'running' || n.status === 'paused')`
- 但 usePlanRun reducer 中 `NODE_START` 后没有把节点的 `status` 重新改成 `'running'`（已存在，但其依赖 `pausedNode` 才能找到 "暂停" 节点）
- 当 SSE 流结束时 `_stream_events` 推了一个 `workflow.paused`，但 `pausedNode` 可能已过期

### 2.3 SSE processEvent 没有错误边界
- `usePlanRun.ts:291-351` `processEvent` 中任意 reducer 的 dispatch 错误（例如后端返回了 nodes 中不存在的 agent_id）会抛出
- 由于 fetch stream 的消费是 async 的，错误会冒泡到 React 渲染层 → 整个 PlanPage 卸载 → 白屏

## 3. Goals

- ✅ 用户在 `/plan` 页面点开始 → 工作流正常执行，不会白屏
- ✅ 当前正在运行的 agent 对应的 Tab 自动亮蓝
- ✅ 用户点击 Tab → 滚动到对应 agent 的 PipelineTimeline 行

## 4. Non-Goals

- 不重构 PipelineTimeline
- 不动 SSE 后端协议
- 不动 pause 错误提示位置
- 不重写 usePlanRun.ts 的整个 reducer

## 5. Decisions

### 5.1 PlanPage 层加 `key={runId ?? 'idle'}` 强制重挂

**问题：** SSE 数据流动中 PlanPage 子树可能因 React 错误卸载而清空。

**方案：** 顶层 JSX 加 `key` prop — runId 变化（包括首次生成、清空）时 React 会卸载旧子树重新挂载。

**实现：**
```tsx
return <div key={runId ?? 'idle'} className="app" ...>...</div>
```

### 5.2 processEvent 加 try/catch + Error 事件兜底

**问题：** reducer throw 会让 PlanPage 整个 unmount。

**方案：** 包裹 switch 整个 dispatch 逻辑，catch 后写一条 `node.failed` 事件继续 stream。

**实现：**
```tsx
const processEvent = useCallback((event: PlanLogEvent) => {
  dispatch({ type: 'APPEND_LOG', event })
  try {
    switch (event.event) {
      // ... 现有的 case
    }
  } catch (err) {
    console.error('processEvent error:', err, event)
    dispatch({
      type: 'SET_ERROR',
      error: err instanceof Error ? err.message : '事件处理异常'
    })
  }
}, [])
```

### 5.3 scrollToAgent 加 height 防御

**问题：** containerRect.height 为 0 时算 NaN。

**方案：** 早返回，不做任何滚动。

**实现：**
```tsx
const targetRect = target.getBoundingClientRect()
if (containerRect.height === 0 || targetRect.height === 0) return
```

### 5.4 Tab-Agent 高亮同时使用 `runningNode || pausedNode`

**问题：** 当前只查 `nodes.find` 可能漏失。

**方案：** 双源查找，先 nodes，再 fallback 到 pausedNode 单值。

**实现：**
```tsx
const activeAgentId =
  nodes.find(n => n.status === 'running' || n.status === 'paused')?.id
  ?? pausedNode
  ?? null
```

然后用 `TABS.findIndex(t => t.agentId === activeAgentId)` 决定高亮。

### 5.5 click handler 调用 useCallback 引用

确认 `scrollToAgent` 在 `useCallback` 内且依赖项为 `[]`，但 onClick 内闭包能拿到最新 props。

## 6. Risks / Trade-offs

- **性能**：try/catch 每个 event 微小开销可忽略；React key remount 在 runId 真的变化时才发生，正常操作只触发 reconcile。
- **数据丢失**：try/catch 包裹后，单条 event dispatch 失败不会让整流终止，但用户可能看不到那条 event 的 UI 反馈 → 已用 `SET_ERROR` 提示。
- **重挂代价**：每次新 runId 触发完整 PlanPage 重挂，scroll 位置会丢。可接受，因为新 runId 含义就是"新工作流"。

## 7. Migration / Rollback

- 改动均为前端热更兼容，无需 backend 协调
- 三处加 try/catch 或早返回 → 不影响正常路径性能
- 加 `key` prop 是显式的 React 推荐用法，向后兼容

## 8. Open Questions

无 — 设计已自包含。

## 9. Test Plan

### 手动测试
1. 打开 `/plan`，点"生成营销方案" → 不白屏
2. 观察 tab 高亮跟随 running agent 变化
3. 点任一 tab → 滚动到对应 agent
4. 点"确认继续" → 下一个 agent 开始运行，tab 同步切换

### 自动化测试
1. 已有 `usePlanRun.test.tsx` 不能回归
2. 加新测试用例：
   - scrollToAgent 在 containerHeight=0 时 early-return（不抛）
   - processEvent reducer throw 不会让 dispatch 失败
   - activeAgentId fallback 到 pausedNode
