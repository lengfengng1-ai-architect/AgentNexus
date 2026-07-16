## ADDED Requirements

### Requirement: 移动端分析完成态只渲染完整报告

移动端市场分析完成后，SHALL 只渲染 `full_report`（marked markdown），不渲染 MarketResearchResultCards 结构卡片。

#### Scenario: 移动端完成态展示完整报告
- **WHEN** 移动端（ScreenChat）市场分析 SSE 流完成且收到 `result` 事件
- **THEN** ChatBubble 渲染 `full_report` 字段的 marked markdown，不展示结构化卡片
- **AND** 使用 `market-report-mobile` CSS class 渲染

#### Scenario: PC 端不受影响
- **WHEN** PC 端（ChatContainer）市场分析完成
- **THEN** 仍然渲染 MarketResearchResultCards

### Requirement: 移动端报告字体统一

移动端完整报告 SHALL 使用统一字号体系。

#### Scenario: 字号比例
- **WHEN** 移动端渲染完整报告
- **THEN** 正文 font-size 为 14px，h1 为 17px，h2 为 15px，h3 为 14px

## REMOVED Requirements

### Requirement: 移动端完成态展示 EvidenceCard

移动端完成态不再展示 EvidenceCard 结构卡片。

**Reason**: 移动端完成态只渲染 `full_report` markdown，无需单独的证据来源 UI 组件。
