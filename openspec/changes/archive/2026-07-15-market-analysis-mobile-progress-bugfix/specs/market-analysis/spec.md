## ADDED Requirements

### Requirement: 流过程中正确展示进度态

SSE `data` 事件不SHALL触发完成态渲染。`setMarketResearchResult` SHALL 仅在 `result` 事件中调用。

#### Scenario: data 事件不触发完成态
- **WHEN** ChatContainer/ScreenChat 收到 SSE `data` 事件
- **THEN** 不从该事件提取的内容调用 `setMarketResearchResult`
- **THEN** ChatBubble 保持进度态（MarketResearchProgressCard 可见）

#### Scenario: result 事件触发完成态切换
- **WHEN** ChatContainer/ScreenChat 收到 SSE `result` 事件
- **THEN** 调用 `setMarketResearchResult` 设置最终完整结果
- **THEN** ChatBubble 自动从进度态切换为完成态（MarketResearchResultCards 可见）
