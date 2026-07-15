---
capability: market-research-intent
name: 市场调研意图
description: 意图识别支持 market_research，复用市场分析端点，前端流式消费进度和结果，不集成方案流水线
---

## ADDED Requirements

### Requirement: 意图识别新增 market_research

系统 SHALL 在意图识别模块中新增 `market_research` 意图，当用户输入包含市场调研、竞品分析、行业分析等关键词时，识别为 `market_research`。

#### Scenario: 用户输入包含竞品分析关键词
- **WHEN** 用户输入"帮我分析一下娃哈哈的竞品"
- **THEN** 意图识别 SHALL 返回 `intent: "market_research"`
- **AND** `market_name` SHALL 从输入中提取

#### Scenario: 用户输入包含市场调研关键词
- **WHEN** 用户输入"我想做一下运动饮料的市场分析"
- **THEN** 意图识别 SHALL 返回 `intent: "market_research"`
- **AND** `market_name` SHALL 从输入中提取（如"运动饮料"）

#### Scenario: 字段齐全但意图是调研而非生成方案
- **WHEN** 用户输入"分析一下可口可乐，碳酸饮料，预算100万，周期3个月"
- **AND** brand_input 5 字段齐全
- **THEN** 意图识别 SHALL 优先返回 `market_research` 而非 `generate_plan`
- **AND** 关键词含"分析"/"调研"/"竞品"时优先走调研意图

### Requirement: IntentRecognitionOutput 新增 market_name 字段

系统 SHALL 在 `IntentRecognitionOutput` 顶层新增 `market_name: str | None` 字段，独立于 `BrandInput`。

#### Scenario: market_research intent 时携带 market_name
- **WHEN** 意图识别结果为 `market_research`
- **THEN** `output.market_name` SHALL 为从输入提取的研究目标名称（可为 null）
- **AND** `output.brand_input.brand_name` SHALL 保持为方案流水线使用的品牌名，不受 market_research 影响

#### Scenario: 非 market_research intent 时 market_name 为 null
- **WHEN** 意图识别结果为 `generate_plan` / `chat` / 其他非调研意图
- **THEN** `output.market_name` SHALL 为 null

### Requirement: market_research 字段补齐

`market_research` 需要 `market_name` 和 `category`（取自 `brand_input.category`）两个必填字段齐全才能执行字段反攪补齐。

#### Scenario: 缺 market_name 和 category
- **WHEN** 用户输入"帮我做竞品分析"
- **THEN** `missing_fields` SHALL 包含 `["market_name", "category"]`
- **AND** `reply` SHALL 包含反问话术，询问研究目标和品类

#### Scenario: 只缺 market_name
- **WHEN** 用户输入"帮我分析一下饮料行业"
- **AND** 已识别出 `category: "饮料"`
- **THEN** `missing_fields` SHALL 包含 `["market_name"]`
- **AND** `reply` SHALL 询问具体研究目标

#### Scenario: 只缺 category
- **WHEN** 用户输入"分析一下娃哈哈"
- **AND** 已识别出 `market_name: "娃哈哈"`
- **THEN** `missing_fields` SHALL 包含 `["category"]`
- **AND** `reply` SHALL 询问品类归属

#### Scenario: 字段齐全时开始分析
- **WHEN** `market_name` 和 `category` 均非空
- **THEN** `missing_fields` SHALL 为空
- **AND** `reply` SHALL 提示用户可点击开始分析按钮

### Requirement: 前端消费 market_research intent

系统 SHALL 在 ScreenChat 的 intent handler 中新增 `market_research` 分支：字段齐全时展示"开始分析"按钮，用户点击后调用 `POST /market-analysis/stream`，SSE 流式渲染进度和最终报告，停留在对话屏不跳转。

#### Scenario: 收到 market_research intent + 字段齐全
- **WHEN** ScreenChat 收到 SSE event `intent: "market_research"`
- **AND** `missing_fields` 为空
- **THEN** 气泡 SHALL 展示 `reply` 内容
- **AND** 气泡底部 SHALL 展示"开始分析"按钮
- **AND** 按钮 SHALL 调用 `handleStartMarketResearch`

#### Scenario: 开始市场分析
- **WHEN** 用户点击"开始分析"按钮
- **THEN** SHALL 追加"🔍 正在启动市场分析…"到气泡内容
- **AND** SHALL 调用 `POST /market-analysis/stream({market_name, category})`
- **AND** SHALL 消费 SSE progress 事件追加阶段名称
- **AND** SHALL 消费 SSE node_end 事件标记阶段完成
- **AND** SHALL 消费 SSE result 事件替换气泡内容为 full_report markdown
- **AND** SHALL 不跳转屏

#### Scenario: market_research 失败时显示错误
- **WHEN** 市场分析流返回错误或网络失败
- **THEN** 对话流 SHALL 显示错误消息
- **AND** 不阻塞用户其他操作

### Requirement: 前端 type 扩展

系统 SHALL 在 `ChatMessage` 类型中新增 `canStartMarketResearch`、`marketName` 字段。

#### Scenario: ChatMessage 类型新增字段
- **WHEN** INTENT_RECEIVED action dispatch
- **AND** `intent === "market_research"` 且 `missing_fields` 为空
- **THEN** SHALL 设置 `canStartMarketResearch: true`
- **AND** SHALL 设置 `marketName` 为返回的 `market_name`
