## Why

PC 端市场分析完成后展示 MarketResearchResultCards（7 张结构化卡片），用户反馈"一个一个的框，不是一个整体"。移动端已改为只渲染 full_report markdown，PC 端也应统一。

## What Changes

删除 `ChatBubble.tsx` 第 80-94 行的 `variant === 'mobile'` 条件判断，PC/移动端有 `marketResearchResult` 时统一渲染 `full_report` marked markdown。

## Capabilities

### Modified Capabilities

- `market-analysis`: PC 端市场分析完成态从 MarketResearchResultCards 改为渲染 full_report markdown

## Impact

| 文件 | 说明 |
|------|------|
| `frontend/src/components/ChatBubble.tsx` | 第 80 行 `variant === 'mobile' ?` 三元改为一律渲染 full_report |
