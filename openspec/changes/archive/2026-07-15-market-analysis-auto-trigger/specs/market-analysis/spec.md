## ADDED Requirements

### Requirement: 市场分析自动触发

系统 SHALL 在后端识别到 `market_research` intent 且 `missingFields` 为空时自动发起市场分析 SSE 流，无需用户点击按钮。

#### Scenario: 自动触发分析
- **WHEN** `INTENT_RECEIVED` 的 `intent` 为 `'market_research'` 且 `missingFields` 为空
- **THEN** 自动调用 `handleStartMarketResearch`
- **THEN** 不展示任何确认按钮
