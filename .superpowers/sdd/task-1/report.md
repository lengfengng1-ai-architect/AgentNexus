# Task 1 Report — scrollToAgent 高度防御

## Status: DONE

## Commits
- `fb0ab5d` fix(plans): guard scrollToAgent against zero-height flex container

## Compile
- `cd frontend && npx tsc --noEmit` → exit 0, no errors

## Tests
- `cd frontend && npx vitest run src/__tests__/usePlanRun.test.tsx` → 6/6 passed (no regressions)

## What changed
Added early-return guards in `scrollToAgent` (PlanPage.tsx:121-135):
- if `target` is missing → return (was: silently did nothing inside `if (target)` block)
- if `containerRect.height === 0 || targetRect.height === 0` → return (new defense)

This prevents the NaN scroll position that occurs during flex container collapse and silently breaks the tab click handler.

## Concerns
None.
