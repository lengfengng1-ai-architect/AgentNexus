# Top Tab Scroll Fix — Design Doc

## Problem

点击 PlanPage 顶部导航 Tab（"产品调研"、"市场研究"等）后，预期页面内容区自动滚动到对应的 Agent 条目位置，但实际**完全无滚动发生**。

## Root Cause

两层 overflow 滚动容器冲突：

1. **App.tsx** 的 `<main>`（`flex:1; overflow:auto`）是整页真正的滚动容器，因为 PlanPage 内部 `.app div` 设了 `minHeight: var(--app-height)`，始终撑满窗口。
2. PlanPage 内部的 `contentRef`（`flex:1; overflowY:auto`）装不下全部内容，溢出由外层 App `<main>` 处理。
3. `scrollToAgent` 对 `contentRef.current` 调用 `.scrollTo()`，但这个容器从未真正溢出，调用静默无效果。

## Fix

### 1. App.tsx — 外层 `<main>` 改 `overflow:hidden`

移除外层 `<main>` 的滚动能力，使 PlanPage 内部的 `contentRef` 成为唯一滚动容器。

```diff
- <main style={{ flex: 1, overflow: 'auto' }}>
+ <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
```

### 2. PlanPage.tsx — 使用 `useEffect` 响应 `activeTab` 变化

原来的 `onClick={() => { setActiveTab(); scrollToAgent() }}` 因 state 更新与 scroll 在同一事务中，DOM 尚未完成 re-render。改为：

```tsx
const scrollToAgent = useCallback((agentId: string) => { ... }, [])

useEffect(() => {
  scrollToAgent(TABS[activeTab]?.agentId ?? '')
}, [activeTab, scrollToAgent])
```

### 3. PlanPage.tsx — 移除 PlanPage 内部 `<main>` 的 `overflow: auto`

避免两层 overflow 在同一个组件层级内。

## Files Changed

| 文件 | 改动 |
|------|------|
| `frontend/src/App.tsx:65` | `<main>` overflow: auto → overflow:hidden, +flex column |
| `frontend/src/pages/PlanPage.tsx:313-316` | 移除 PlanPage `<main>` 的 overflow: auto |
| `frontend/src/pages/PlanPage.tsx:128-146` | 新增 `useEffect` 监听 activeTab 触发滚动 |
| `frontend/src/pages/PlanPage.tsx:390` | onClick 简化为仅 setActiveTab |
