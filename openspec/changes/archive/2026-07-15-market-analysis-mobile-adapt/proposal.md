## Why

MarketResearchProgressCard 和 MarketResearchResultCards 在移动端（`variant='mobile'`）的样式与桌面端基本相同——卡片 padding 偏大、市场规模卡三列布局在 360px 宽度下过于拥挤、间距浪费空间，影响移动端阅读体验。

## What Changes

### 修改

- **MarketResearchProgressCard** — 移动端 max-h 从 20vh 调到 30vh，给更多空间
- **MarketResearchResultCards 容器** — 移动端 `space-y-4` → `space-y-3`
- **MarketSummaryCard** — 移动端 padding 缩级、标题降字号
- **MarketSizeCard** — 移动端 `grid-cols-3` → `grid-cols-1`（TAM/SAM/SOM 垂直堆叠）
- **TrendSignalsCard** — 移动端 padding 缩级
- **TargetUsersCard** — 移动端 padding 缩级
- **OpportunityCard** — 移动端 padding 缩级、评级标签堆叠
- **EvidenceCard** — 移动端 padding 缩级

### 不变

- 桌面端零改动
- 后端零改动

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- 无（纯样式调整，不改变 spec-level requirements）

## Impact

| 范围 | 影响 |
|---|---|
| `MarketResearchProgressCard.tsx` | 移动端 `max-h` 值调整 |
| `MarketResearchResultCards.tsx` | 每个子卡片组件内部增加 `isMobile` 条件样式分支 |
| 桌面端 | 零影响 |
| 测试 | 更新移动端变体的快照/断言 |
