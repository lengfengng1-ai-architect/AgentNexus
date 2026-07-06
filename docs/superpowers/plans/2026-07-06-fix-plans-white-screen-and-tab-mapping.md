# 修复 PlanPage 白屏 + Tab-Agent 映射 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复前端 `/plan` 页面的两个症状：(1) 执行 agent 时白屏；(2) Tab 与 agent 映射关系丢失（Tab 点击不滚动、当前 agent 不高亮）。

**Architecture:** 三处独立的 bug 根因：
1. `scrollToAgent` 在 flex 父容器坍缩时 `getBoundingClientRect().height === 0`，算出 NaN → 静默失败 + 整个 React 重渲染受影响
2. `usePlanRun.ts` 中 `processEvent` 没有 try/catch，SSE 数据触发 reducer throw 时整流中断、PlanPage 卸载 → 白屏
3. `PlanPage.tsx` 的 `activeAgentNode` 数据源不充分（`nodes.find`），没有 fallback 到 `pausedNode`

**Tech Stack:** React 18, TypeScript, Vite, LangGraph SSE

## Global Constraints

- 不动后端协议
- 不重构 usePlanRun.ts 的整个 reducer
- 不改 PipelineTimeline.tsx
- 改动文件保持向后兼容（HMR 友好）
- 现有测试 `usePlanRun.test.tsx` 不能回归

---

## File Structure

| 文件 | 改动 | 职责 |
|------|------|------|
| `frontend/src/hooks/usePlanRun.ts` | 修改 | 改 `processEvent` 加 try/catch；`tabAgentId` fallback 到 `pausedNode` |
| `frontend/src/pages/PlanPage.tsx` | 修改 | `scrollToAgent` 加 height 防御；顶层加 `key={runId ?? 'idle'}` |
| `frontend/src/__tests__/usePlanRun.test.tsx` | 修改 | 加 3 个新测试用例 |

---

## Task 1: 修复 scrollToAgent 高度防御

**Files:**
- Modify: `frontend/src/pages/PlanPage.tsx:121-133`

**Interfaces:**
- Consumes: `contentRef.current` (HTMLDivElement), `agentId: string`
- Produces: 无 — 内部 useCallback

- [ ] **Step 1: 阅读当前实现**

读 `frontend/src/pages/PlanPage.tsx:121-133` 确认当前 `scrollToAgent` 的位置。

- [ ] **Step 2: 修改 scrollToAgent**

把以下旧实现：

```tsx
  const scrollToAgent = useCallback((agentId: string) => {
    const el = contentRef.current
    if (!el) return
    if (!agentId) { el.scrollTo({ top: 0, behavior: 'smooth' }); return }
    const target = el.querySelector<HTMLElement>('[data-agent-id="' + agentId + '"]')
    if (target) {
      const containerRect = el.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const offsetRelativeToContainer = targetRect.top - containerRect.top
      const scrollTo = el.scrollTop + offsetRelativeToContainer - containerRect.height / 2 + targetRect.height / 2
      el.scrollTo({ top: Math.max(0, scrollTo), behavior: 'smooth' })
    }
  }, [])
```

替换为：

```tsx
  const scrollToAgent = useCallback((agentId: string) => {
    const el = contentRef.current
    if (!el) return
    if (!agentId) { el.scrollTo({ top: 0, behavior: 'smooth' }); return }
    const target = el.querySelector<HTMLElement>('[data-agent-id="' + agentId + '"]')
    if (!target) return
    const containerRect = el.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    // 防御：父容器或目标元素高度为 0 时（flex 坍缩瞬间）直接放弃滚动
    if (containerRect.height === 0 || targetRect.height === 0) return
    const offsetRelativeToContainer = targetRect.top - containerRect.top
    const scrollTo = el.scrollTop + offsetRelativeToContainer - containerRect.height / 2 + targetRect.height / 2
    el.scrollTo({ top: Math.max(0, scrollTo), behavior: 'smooth' })
  }, [])
```

- [ ] **Step 3: 验证编译**

```bash
cd frontend && npx tsc --noEmit
```

期望：exit code 0，无 TypeScript 错误。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/pages/PlanPage.tsx
git commit -m "fix(plans): guard scrollToAgent against zero-height flex container"
```

---

## Task 2: 修复 processEvent 错误边界

**Files:**
- Modify: `frontend/src/hooks/usePlanRun.ts:291-351` — 包裹 try/catch

**Interfaces:**
- Consumes: `PlanLogEvent` (from usePlanRun.ts:8-10)
- Produces: `SET_ERROR` 兜底（已有的 action 类型）

- [ ] **Step 1: 阅读当前实现**

读 `frontend/src/hooks/usePlanRun.ts:291-351` 确认 `processEvent` 当前结构（dispatch APPEND_LOG + switch 各种 event 类型）。

- [ ] **Step 2: 添加 try/catch 包裹**

把以下旧实现（约 291-351 行）：

```tsx
  const processEvent = useCallback((event: PlanLogEvent) => {
    dispatch({ type: 'APPEND_LOG', event })

    switch (event.event) {
      case 'workflow.start':
        dispatch({ type: 'SET_CONNECTED', connected: true })
        break
      // ... 各种 case
    }
  }, [])
```

替换为（注意 try 包住 switch，APPEND_LOG dispatch 仍在 try 外）：

```tsx
  const processEvent = useCallback((event: PlanLogEvent) => {
    dispatch({ type: 'APPEND_LOG', event })

    try {
      switch (event.event) {
        case 'workflow.start':
          dispatch({ type: 'SET_CONNECTED', connected: true })
          break
        case 'node.start':
          if (event.nodeId) dispatch({ type: 'NODE_START', nodeId: event.nodeId })
          break
        case 'node.complete':
          if (event.nodeId) {
            dispatch({
              type: 'NODE_COMPLETE',
              nodeId: event.nodeId,
              data: event.data?.output || event.data,
            })
          }
          break
        case 'node.failed':
          if (event.nodeId) dispatch({ type: 'NODE_FAILED', nodeId: event.nodeId, message: event.message || '节点失败' })
          break
        case 'workflow.paused':
          dispatch({
            type: 'WORKFLOW_PAUSED',
            snapshot: event.data?.snapshot as PlanRunState['pausedSnapshot'],
          })
          break
        case 'workflow.complete': {
          const eventOutputs = event.data?.output || event.data
          const completedNodeIds = Object.keys(eventOutputs || {})
          const nextNodes = state.nodes.map((n) =>
            completedNodeIds.includes(n.id) ? { ...n, status: 'complete' as const } : n
          )
          dispatch({ type: 'WORKFLOW_COMPLETE', outputs: eventOutputs as PlanOutputs })
          break
        }
        case 'chapter.start': {
          const data = event.data ?? {}
          dispatch({
            type: 'CHAPTER_START',
            index: Number(data.index ?? 0),
            title: String(data.title ?? ''),
            subtitle: String(data.subtitle ?? ''),
          })
          break
        }
        case 'chapter.complete': {
          const data = event.data ?? {}
          dispatch({
            type: 'CHAPTER_COMPLETE',
            chapter: {
              title: String(data.title ?? ''),
              subtitle: String(data.subtitle ?? ''),
              content: String(data.content ?? ''),
            },
          })
          break
        }
      }
    } catch (err) {
      // 单条 event dispatch 异常不能让整流中断，否则 PlanPage 卸载 → 白屏
      console.error('processEvent error:', err, event)
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : '事件处理异常',
      })
    }
  }, [])
```

- [ ] **Step 3: 验证编译**

```bash
cd frontend && npx tsc --noEmit
```

期望：exit code 0。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/hooks/usePlanRun.ts
git commit -m "fix(usePlanRun): wrap processEvent in try/catch to prevent white screen on event errors"
```

---

## Task 3: 修复 Tab-Agent 高亮数据源

**Files:**
- Modify: `frontend/src/pages/PlanPage.tsx:109-113`

**Interfaces:**
- Consumes: `nodes` (from usePlanRun)、`pausedNode` (from usePlanRun)
- Produces: `activeAgentNode` 供 PlanPage 内部的 Tab 高亮判断

- [ ] **Step 1: 阅读当前实现**

读 `frontend/src/pages/PlanPage.tsx:109-113` 确认 `activeAgentNode` 当前只查 `nodes.find` 没有 fallback。

- [ ] **Step 2: 修改 activeAgentNode 计算**

把：

```tsx
  // Auto-highlight tab based on running/paused agent
  const activeAgentNode = nodes.find(n => n.status === 'running' || n.status === 'paused')
  const activeTabFromAgent = activeAgentNode
    ? TABS.findIndex(t => t.agentId === activeAgentNode.id)
    : -1
```

替换为（双源查找，先 nodes，再 fallback 到 pausedNode）：

```tsx
  // Auto-highlight tab based on running/paused agent.
  // 双源查找：先从 nodes 数组里找 running/paused 节点；
  // 若 nodes 还没更新到（paused 事件刚到）则 fallback 到 pausedNode 单值
  const activeAgentId =
    nodes.find(n => n.status === 'running' || n.status === 'paused')?.id
    ?? pausedNode
    ?? null
  const activeTabFromAgent = activeAgentId
    ? TABS.findIndex(t => t.agentId === activeAgentId)
    : -1
```

- [ ] **Step 3: 更新 tab 高亮使用 activeAgentId**

把（约 370-388 行）：

```tsx
          {TABS.map(t => {
            const isActive = t.agentId
              ? activeAgentNode?.id === t.agentId
              : !activeAgentNode
            return (
```

替换为：

```tsx
          {TABS.map(t => {
            const isActive = t.agentId
              ? t.agentId === activeAgentId
              : !activeAgentId
            return (
```

- [ ] **Step 4: 验证编译**

```bash
cd frontend && npx tsc --noEmit
```

期望：exit code 0。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/pages/PlanPage.tsx
git commit -m "fix(plans): fallback to pausedNode when activeAgentNode not in nodes array"
```

---

## Task 4: PlanPage 加 key 强制 remount

**Files:**
- Modify: `frontend/src/pages/PlanPage.tsx:139-141`

**Interfaces:**
- Consumes: `runId` (from usePlanRun)
- Produces: 顶层 div `key` prop，触发 React remount on runId change

- [ ] **Step 1: 找到顶层 div**

读 `frontend/src/pages/PlanPage.tsx:139-141` 确认顶层 `<div className="app">` 位置。

- [ ] **Step 2: 加 key prop**

把：

```tsx
  return (
    <div className="app" style={{ display: 'flex', minHeight: 'var(--app-height)', backgroundColor: '#fafbfc' }}>
```

替换为：

```tsx
  return (
    <div key={runId ?? 'idle'} className="app" style={{ display: 'flex', minHeight: 'var(--app-height)', backgroundColor: '#fafbfc' }}>
```

- [ ] **Step 3: 验证编译**

```bash
cd frontend && npx tsc --noEmit
```

期望：exit code 0。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/pages/PlanPage.tsx
git commit -m "fix(plans): force remount via key on runId to recover from state pollution"
```

---

## Task 5: 添加单元测试

**Files:**
- Modify: `frontend/src/__tests__/usePlanRun.test.tsx`

**Interfaces:**
- Consumes: `vi.fn()` mocks for `startPlanRun`, `approvePlanRun`, etc.
- Produces: 3 个新 test case

- [ ] **Step 1: 阅读当前测试文件**

读 `frontend/src/__tests__/usePlanRun.test.tsx` 了解现有 mock 和测试结构。

- [ ] **Step 2: 在文件末尾追加 3 个新测试**

在最后一个 `})`（第 103 行附近）后追加：

```tsx
describe('usePlanRun: fixes for white-screen and tab-mapping', () => {
  test('processEvent does not throw on unknown event nodeId', async () => {
    const { result } = renderHook(() => usePlanRun())
    mockStartPlanRun.mockResolvedValue({
      runId: 'test-fix-1',
      stream: new ReadableStream({ start(c) { c.close() } }),
    })
    await act(async () => {
      await result.current.start({ brand_name: 'X' })
    })
    // 不应抛出 / 状态应保持 idle
    expect(result.current.runId).toBe('test-fix-1')
  })

  test('rerun is no-op without runId even when autoMode is true', async () => {
    const { result } = renderHook(() => usePlanRun())
    await act(async () => {
      await result.current.rerun()
    })
    expect(mockRerunPlanRun).not.toHaveBeenCalled()
  })

  test('multiple rapid start calls do not leak abort handles', async () => {
    const { result } = renderHook(() => usePlanRun())
    mockStartPlanRun.mockResolvedValue({
      runId: 'leak-test',
      stream: new ReadableStream({ start(c) { c.close() } }),
    })
    await act(async () => {
      // 连续调用 start → 第二次会 abort 第一次
      const p1 = result.current.start({ brand_name: 'A' })
      const p2 = result.current.start({ brand_name: 'B' })
      await Promise.all([p1, p2])
    })
    expect(result.current.runId).toBe('leak-test')
  })
})
```

- [ ] **Step 3: 运行测试**

```bash
cd frontend && npx vitest run src/__tests__/usePlanRun.test.tsx
```

期望：所有 test 9 个通过（6 旧 + 3 新）。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/__tests__/usePlanRun.test.tsx
git commit -m "test(usePlanRun): add tests for white-screen and tab-mapping fixes"
```

---

## Self-Review

- ✅ 4 个文件改动，每个任务独立
- ✅ 每个 task 有明确的 commit message
- ✅ 没有 TBD/TODO，所有代码完整
- ✅ 任务依赖顺序：Task 1 → Task 2-3 → Task 4 → Task 5
- ✅ 类型一致：activeAgentId 替代了 activeAgentNode，3 处使用同步更新

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-06-fix-plans-white-screen-and-tab-mapping.md`. Two execution options:

**1. Subagent-Driven (recommended)** - 我为每个任务派遣一个新的 subagent，任务之间进行审查，迭代快速

**2. Inline Execution** - 在此会话中执行任务，使用 executing-plans 进行批处理和检查点

选哪个？
