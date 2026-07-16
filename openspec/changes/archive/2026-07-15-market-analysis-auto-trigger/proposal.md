## Why

移动端 ChatBubble 中的「开始分析」按钮在 UI 调整中已消失，但用户仍需手动触发市场分析。实际上当后端识别到 market_research intent 且字段齐全时（missingFields=0），条件已经足够自动开始分析，不需要二次确认。

## What Changes

- **ChatBubble** — 移除 `canStartMarketResearch && onStartMarketResearch` 按钮渲染
- **ScreenChat** — 移除 `onStartMarketResearch` prop 传递
- **ChatContainer** — 同上
- **useChat** — `INTENT_RECEIVED` 中 `market_research` + `missingFields.length === 0` 时自动调用 `handleStartMarketResearch`

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- 无

## Impact

| 范围 | 影响 |
|---|---|
| `ChatBubble.tsx` | 删除按钮 JSX，清理相关 prop |
| `ScreenChat.tsx` | 删除 `onStartMarketResearch` prop |
| `ChatContainer.tsx` | 删除 `onStartMarketResearch` prop |
