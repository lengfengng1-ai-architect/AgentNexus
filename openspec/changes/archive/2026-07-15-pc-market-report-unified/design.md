## Context

当前 ChatBubble.tsx 第 78-94 行渲染分支：

```
有 marketResearchResult:
  移动端 → full_report marked markdown
  PC 端  → MarketResearchResultCards（7 张卡片）
```

用户反馈 PC 端也应该是一份整体报告，不是分离的卡片。

## Goals / Non-Goals

**Goals:**
- PC 端也改为渲染 `full_report` marked markdown

**Non-Goals:**
- 不删除 MarketResearchResultCards 组件文件（保留供参考）
- 不改 CSS

## Decisions

改动一行：删除 `variant === 'mobile' ?` 条件，统一渲染 full_report。

```tsx
// Before:
variant === 'mobile' ? (
  <div className="market-report-mobile" ... />
) : (
  <MarketResearchResultCards ... />
)

// After:
<div className="market-report" dangerouslySetInnerHTML={{ __html: marked.parse(full_report || content || '') }} />
```

PC 端使用已有的 `.market-report` class（字体略大于移动端）。
