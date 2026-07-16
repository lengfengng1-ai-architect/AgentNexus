## MODIFIED Requirements

### Requirement: 结构化结果卡片集合

PC 端市场分析完成后 SHALL 渲染 `full_report` marked markdown，不再展示 MarketResearchResultCards 结构化卡片。

#### Scenario: 流完成切换（PC 端）
- **WHEN** ChatContainer 收到 SSE `result` 事件
- **THEN** 隐藏搜索来源和进度小窗口
- **THEN** 使用 `.market-report` class 渲染 `full_report` 的 marked markdown
- **THEN** 不展示 MarketResearchResultCards 结构化卡片
