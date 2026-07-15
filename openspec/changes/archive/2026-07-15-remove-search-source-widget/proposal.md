## Why

PC 端和移动端 MarketResearchProgressCard 中的「搜索来源」区域（灰色盒子 + "🔍 搜索来源" 标题 + "正在搜索…" 占位）在实际使用中无用户价值。来源卡片已经通过 ToolCallStatusBar + SourceCard 动画滚动展示，额外的搜索来源 window 是冗余信息。

## What Changes

删除 `MarketResearchProgressCard.tsx` 第 51-74 行的搜索来源窗口（灰色盒子 + 🔍 搜索来源标题 + 正在搜索… 占位 / SourceCard 列表）。

保留 ToolCallStatusBar（蓝色搜索状态条 + spinner）。

## Capabilities

### Modified Capabilities

- `market-analysis`: 删除 MarketResearchProgressCard 中的搜索来源窗口

## Impact

| 文件 | 说明 |
|------|------|
| `frontend/src/components/MarketResearchProgressCard.tsx` | 删除第 51-74 行搜索来源窗口 |
- 
PC/移动端同时生效。进度日志窗口保留不变。
