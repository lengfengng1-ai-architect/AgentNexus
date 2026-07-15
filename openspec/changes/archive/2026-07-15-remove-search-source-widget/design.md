## Context

MarketResearchProgressCard 有三个区域：ToolCallStatusBar（蓝色搜索条）、搜索来源窗口（灰色盒子 + 🔍 搜索来源标题 + 来源卡片）、进度日志窗口。用户反馈搜索来源窗口是冗余的——来源卡片已经通过 ToolCallStatusBar + SourceCard 动画展示；分析完成后移动端改为全报告渲染后更不需要它。

## Goals / Non-Goals

**Goals:**
- 删除 MarketResearchProgressCard 中的搜索来源窗口（🔍 搜索来源标题 + 正在搜索… / SourceCard 列表）

**Non-Goals:**
- 保留 ToolCallStatusBar（蓝色 🔍 正在搜索信息 + spinner）
- 保留进度日志窗口
- 不改动其他组件

## Decisions

删除 `MarketResearchProgressCard.tsx` 第 51-74 行块：

```tsx
{/* 搜索来源窗口 */}
<div className=...>
  <div className=...>🔍 搜索来源</div>
  {sources.length === 0 ? ... : ...}
  <div ref={sourcesEndRef} />
</div>
```

同时清理不再使用的 `import { SourceCard }` 和 `sourcesEndRef`。

## Risks / Trade-offs

**风险**：无。PC/移动端同时生效，两者都不再需要这个窗口。ToolCallStatusBar + 进度日志窗口继续提供搜索状态和节点进度信息。
