## Context

MarketResearchProgressCard 和 MarketResearchResultCards 在 `variant='mobile'` 时已接收 prop，但样式适配不充分：padding 和桌面端一致（p-4=16px）、市场规模卡使用 grid-cols-3 三列布局在 278px 可见宽度下非常拥挤、卡片之间间距 space-y-4 偏大。

移动端在 ScreenChat 中的 ChatBubble 可用内容宽度约 278px（360px phone - 12px padding - 84% max-width 气泡）。

## Goals / Non-Goals

**Goals:**
- 所有移动端样式仅在 `variant === 'mobile'` 条件分支生效
- 缩小 padding，释放内容空间
- 市场规模卡三列改为垂直堆叠
- 缩小卡片之间间距

**Non-Goals:**
- 不改动桌面端样式
- 不改动 CompetitiveLandscapeCard（复用桌面组件）
- 不改动后端、API、测试逻辑

## Decisions

所有改动在各自组件内部通过 `isMobile && <mobile-class>` 方式实现，不引入外部 CSS 文件。每组容器或标签（如卡片外层的 `p-4`）做三目运算：

```
className={`rounded-xl border border-line bg-white ${isMobile ? 'p-3' : 'p-4'} shadow-sm`}
```

对于 MarketSizeCard 的 grid 布局：
```
className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-3`}
```

## Risks / Trade-offs

| 风险 | 缓解 |
|---|---|
| 三目运算符增多导致可读性下降 | 纯展示组件，复杂度有限；可后续抽离 mobileClasses 对象 |
| 移动端字号压降后信息密度降低 | 只在 grid 紧凑处降级，不影响段落文本可读性 |
