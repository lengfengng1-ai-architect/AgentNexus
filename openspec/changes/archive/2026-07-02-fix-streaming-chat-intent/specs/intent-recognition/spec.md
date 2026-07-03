## ADDED Requirements

### Requirement: 系统 SHALL 支持多轮对话补全品牌信息

当 intent 为 `clarify` 时，前端 SHALL 显示 agent 的追问文案，用户继续输入后 SHALL 携带已积累的 brand_input 重新调用 `/chat/stream`，在此次上下文中更新品牌信息，直到 intent 变为 `generate_plan`。

#### Scenario: 用户先发"我想做方案"再补充信息
- **WHEN** 用户发送"我想做方案"
- **THEN** `intent_recognition` SHALL 返回 `intent: "clarify"`，`missing_fields` 包含缺失字段
- **WHEN** 用户继续输入"我是 Nike，在上海做推广，预算 300 万，周期 3 个月"
- **AND** 调用时携带上一轮 `brand_input` 作为上下文
- **THEN** `intent_recognition` SHALL 返回 `intent: "generate_plan"`
- **AND** 前端显示"确认生成方案"卡片

### MODIFIED Requirements

### Requirement: 意图识别 Agent 可以判断用户输入的意图

系统 SHALL 提供一个 `intent_recognition` Agent 节点，接收用户消息和当前上下文（含已积累的 brand_input），输出用户意图、置信度、直接回复文案、提取的品牌字段、缺失字段和已更新字段。

#### Scenario: 用户想生成营销方案（材料齐全时显示确认）
- **GIVEN** 用户输入"我是 Nike，在上海做推广，预算300万，周期3个月"
- **AND** `missing_fields` 为空列表
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `generate_plan`
- **AND** `reply` SHALL 包含确认文案

#### Scenario: 信息不完整需要追问（支持多轮对话）
- **GIVEN** 用户输入"我想做营销方案"
- **AND** 当前上下文中 `brand_input` 某些字段为空
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `clarify`
- **AND** `missing_fields` SHALL 包含缺失字段
- **AND** `reply` SHALL 提示缺失字段
- **WHEN** 用户补充信息后再次调用
- **AND** 携带上一轮 `brand_input` 作为上下文
- **THEN** `missing_fields` SHALL 减少或为空
