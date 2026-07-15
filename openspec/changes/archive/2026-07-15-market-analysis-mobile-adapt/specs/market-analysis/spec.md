## ADDED Requirements

### Requirement: 移动端样式适配 — MarketResearchProgressCard

移动端 MarketResearchProgressCard 的各窗口高度 SHALL 调整为 `max-h-[30vh]`。

#### Scenario: 移动端窗口高度适配
- **WHEN** `variant` 为 `'mobile'`
- **THEN** 搜索来源窗口和进度日志窗口的 max-height 均为 30vh

### Requirement: 移动端样式适配 — MarketResearchResultCards

移动端 MarketResearchResultCards 及其子卡片组件 SHALL 使用更紧凑的尺寸：padding p-3、space-y-3，MarketSizeCard 三列改为垂直排列。

#### Scenario: 移动端卡片尺寸
- **WHEN** `variant` 为 `'mobile'`
- **THEN** 所有卡片 padding 从 p-4 降为 p-3
- **THEN** 卡片之间间距从 space-y-4 降为 space-y-3

#### Scenario: 移动端市场规模三列改一列
- **WHEN** `variant` 为 `'mobile'`
- **THEN** MarketSizeCard 的 grid 从 grid-cols-3 变为 grid-cols-1（TAM/SAM/SOM 垂直堆叠）
- **THEN** 数字字号保持 text-sm 不变（单行更宽裕）

#### Scenario: 移动端机会评估标签堆叠
- **WHEN** `variant` 为 `'mobile'`
- **THEN** OpportunityCard 的评级标签区域从 flex-wrap 变为 flex-col（垂直堆叠）
