# Task 1 Brief — scrollToAgent 高度防御

## What this task does

修复 PlanPage 中 `scrollToAgent` 在 flex 父容器坍缩瞬间算出 NaN 的问题。

## Where it fits in the project

这是 5 个修复任务中的第 1 个（Task 1/5），位于 `feature-new-ds` 分支。后续 Task 2-4 改其他文件，Task 5 加测试。这个任务是独立可提交的（PR 友好）。

## Files to modify

- `frontend/src/pages/PlanPage.tsx` (lines 121-133, the `scrollToAgent` useCallback)

## Implementation (EXACT code — do not deviate)

Read `frontend/src/pages/PlanPage.tsx` lines 121-133. Replace this EXACT block:

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

with this EXACT block:

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

## Steps to execute

1. Read `frontend/src/pages/PlanPage.tsx:121-133` to confirm location
2. Apply the edit above (string replace, exact match)
3. Run: `cd /c/Users/hxqu/Desktop/AgentNexus/frontend && npx tsc --noEmit`
4. Verify exit code 0
5. Commit: `git add frontend/src/pages/PlanPage.tsx && git commit -m "fix(plans): guard scrollToAgent against zero-height flex container"`
6. Report status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED)

## Test commands

- Compile: `cd /c/Users/hxqu/Desktop/AgentNexus/frontend && npx tsc --noEmit` — expect exit 0
- Existing tests: `cd /c/Users/hxqu/Desktop/AgentNexus/frontend && npx vitest run src/__tests__/usePlanRun.test.tsx` — must stay 6/6 green
- DO NOT add tests in this task (Task 5 owns that)

## What to return

Report to `.superpowers/sdd/task-1-report.md`:
- Status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED)
- Commits created (full SHA list)
- TypeScript compile result
- Vitest result
- Any concerns
- One-line summary of what changed
