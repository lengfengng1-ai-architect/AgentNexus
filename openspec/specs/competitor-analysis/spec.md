# competitor-analysis spec

> in_scope ID: competitor-analysis

## ADDED Requirements

### Requirement: 竞品搜索

系统 SHALL 基于 category（品类，必填）和 brand_name（品牌名，可选）触发 Web 搜索，获取竞品信息。

- 当 brand_name 为空时执行品类级搜索：搜索品类竞争格局、市场份额、Top 竞品品牌
- 当 brand_name 非空时执行品牌级搜索：先发现竞品品牌，再逐个深度搜索产品矩阵、定价、渠道、动态
- 搜索结果 SHALL 标注 source URL，不得编造未覆盖的信息

### Requirement: SSE 流式推送

系统 SHALL 通过 SSE 事件流实时推送搜索和分析进度：

- `event: status` — 搜索/分析步骤更新，含 `step` 和 `message`
- `event: result` — 最终结果，含 `competitor_analysis_id`

#### Scenario: 完整的搜索流

- **WHEN** 用户触发竞品分析
- **THEN** 系统推送 status 事件（search_overview → search_brand… → analyzing）
- **AND THEN** 最终推送 result 事件含完整结果

### Requirement: 竞品对比结果

系统 SHALL 输出结构化竞品对比报告，包含：

- `category` — 分析品类
- `brand_name` — 用户指定的品牌名（如有）
- `competitors` — 竞品列表，每项含 name / product_matrix / price_range / positioning / marketing_channels / recent_moves / sources
- `market_overview` — 品类竞争格局概述
- `suggestion` — LLM 基于对比的策略建议

#### Scenario: 品类级竞品分析

- **WHEN** 用户只传入 category 未传入 brand_name
- **THEN** 系统搜索品类竞争格局并提取 Top 竞品
- **AND** 返回的 competitors 数组不为空，每个元素含 name 和 sources

#### Scenario: 品牌级竞品分析

- **WHEN** 用户传入 category 和 brand_name
- **THEN** 系统先搜索指定品牌的竞品列表
- **AND** 对每个竞品进行深度搜索（产品矩阵、定价、渠道、动态）
- **AND** 最终报告的 market_overview 包含竞争格局分析
- **AND** suggestion 包含针对用户品牌的差异化建议

### Requirement: 结果持久化

- 每次竞品分析结果 SHALL 保存为 `mock_data/competitor_analysis/results/ca-<uuid8>.json`
- 竞品 ID SHALL 匹配正则 `^ca-[0-9a-f]{8}$`
- 系统 SHALL 提供 `GET /competitor-analysis/results/{id}` 端点供前端拉取

#### Scenario: 持久化存取

- **WHEN** 竞品分析完成
- **THEN** 结果保存到本地 JSON 文件
- **AND** ID 可用于 GET 端点拉取完整结果

### Requirement: 入口卡展示

系统 SHALL 在聊天消息中渲染 `CompetitorAnalysisEntryCard` 入口卡，包含：

- 品类名 + 竞品数量摘要
- Top 维度差异一句话
- 核心 LLM 建议
- "查看完整竞品分析"按钮 → 跳转详情页

#### Scenario: 入口卡渲染

- **WHEN** 竞品分析结果返回
- **THEN** 聊天中显示入口卡
- **AND** 点击按钮跳转详情页（slide-in-right 动画）

### Requirement: 详情页展示

系统 SHALL 提供独立详情页 `ScreenCompetitorAnalysis`，glassmorphism 风格，slide-in-right 转场：

- 毛玻璃 topbar（品类标题 + 返回按钮）
- 市场概况卡片
- 竞品对比表格卡片
- 策略建议卡片
- 数据来源列表卡片
- 骨架屏加载态、404 过期态、500 错误态

#### Scenario: 详情页加载

- **WHEN** 用户点击"查看完整竞品分析"
- **THEN** 详情页以 slide-in-right 动画进入
- **AND** 骨架屏显示直到数据返回
- **AND** 各卡片展示对应数据
