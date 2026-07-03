# intent-recognition Specification

## Purpose
TBD - created by archiving change add-intent-recognition-agent. Update Purpose after archive.
## Requirements
### Requirement: 意图识别 Agent 可以判断用户输入的意图

系统 SHALL 提供一个 `intent_recognition` Agent 节点，接收用户消息和当前上下文，输出用户意图、置信度、直接回复文案、提取的品牌字段、缺失字段和已更新字段。

#### Scenario: 用户想生成营销方案
- **GIVEN** 用户输入 "我是娃哈哈，想在上海推广果汁，预算300万，周期3个月"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `generate_plan`
- **AND** `brand_input.brand_name` SHALL 为 "娃哈哈"
- **AND** `brand_input.city` SHALL 为 "上海"
- **AND** `missing_fields` SHALL 为空列表

#### Scenario: 用户想查询数据
- **GIVEN** 用户输入 "查询上海的盟域数据"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `query_data`
- **AND** `brand_input.city` SHALL 为 "上海"
- **AND** `reply` SHALL 非空

#### Scenario: 用户打招呼
- **GIVEN** 用户输入 "你好"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `chat`
- **AND** `reply` SHALL 为欢迎/能力说明文案

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

#### Scenario: 用户想生成营销方案（材料齐全时显示确认）
- **GIVEN** 用户输入"我是 Nike，在上海做推广，预算300万，周期3个月"
- **AND** `missing_fields` 为空列表
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `generate_plan`
- **AND** `reply` SHALL 包含确认文案

#### Scenario: 用户修改已有上下文
- **GIVEN** 当前上下文中 `brand_input.city` 为 "上海"
- **AND** 用户输入 "改成北京"
- **WHEN** 调用 `intent_recognition` 节点
- **THEN** 输出 `intent` SHALL 为 `update_context`
- **AND** `updated_fields` SHALL 包含 `city: "北京"`
- **AND** `brand_input.city` SHALL 为 "北京"

### Requirement: 意图识别输出使用统一结构化 Schema

系统 SHALL 使用 Pydantic schema `IntentRecognitionOutput` 约束 `intent_recognition` 节点的输出，字段包括 `intent`、`confidence`、`reply`、`brand_input`、`missing_fields`、`updated_fields`。

#### Scenario: 输出结构校验
- **WHEN** `intent_recognition` 节点返回结果
- **THEN** 结果 SHALL 能通过 `IntentRecognitionOutput` 校验
- **AND** `intent` SHALL 为 `generate_plan`、`query_data`、`chat`、`clarify`、`update_context` 之一
- **AND** `confidence` SHALL 在 0.0 到 1.0 之间

### Requirement: 意图识别 Prompt 模板使用 Jinja2 且不可运行时自修改

系统 SHALL 将 `intent_recognition` 的 prompt 放在 `backend/app/prompt_templates/intent_recognition.md.j2`，使用 Jinja2 渲染，禁止在运行时拼接或自修改 prompt。

#### Scenario: Prompt 模板渲染
- **GIVEN** 模板包含变量 `message` 和 `context`
- **WHEN** 调用渲染函数并传入参数
- **THEN** 系统 SHALL 返回完整 prompt 字符串
- **AND** prompt 中 SHALL 包含用户输入消息

### Requirement: 系统 SHALL 支持多轮对话补全品牌信息

当 intent 为 `clarify` 时，前端 SHALL 显示 agent 的追问文案，用户继续输入后 SHALL 携带已积累的 brand_input 重新调用 `/chat/stream`，在此次上下文中更新品牌信息，直到 intent 变为 `generate_plan`。

#### Scenario: 用户先发"我想做方案"再补充信息
- **WHEN** 用户发送"我想做方案"
- **THEN** `intent_recognition` SHALL 返回 `intent: "clarify"`，`missing_fields` 包含缺失字段
- **WHEN** 用户继续输入"我是 Nike，在上海做推广，预算 300 万，周期 3 个月"
- **AND** 调用时携带上一轮 `brand_input` 作为上下文
- **THEN** `intent_recognition` SHALL 返回 `intent: "generate_plan"`
- **AND** 前端显示"确认生成方案"卡片

