# Capability: plan-generation-chat-preview

## Purpose

Provide a conversational entry point for marketing plan generation. The agent extracts structured brand input fields from natural language messages and asks clarifying questions when information is missing.

## Requirements

### Requirement: 方案触发流程从聊天内生成改为聊天确认 → 跳转工作台

系统 SHALL 将方案生成入口从聊天内直接触发改为：聊天内多轮补全信息 → 用户确认 → 跳转工作台 → 工作台自动生成。

#### Scenario: 聊天中确认后跳转工作台
- **GIVEN** `intent_recognition` 返回 `intent: "generate_plan"`
- **AND** `missing_fields` 为空列表
- **WHEN** 用户点击"确认生成方案"
- **THEN** 前端 SHALL 跳转到 `/plan` 页面
- **AND** URL 参数 SHALL 携带 `brand_input`（JSON 编码）
- **AND** 工作台 SHALL 自动使用该信息启动 `plan_generation_pipeline`

#### Scenario: 工作台自动预填表单
- **GIVEN** 用户从聊天携带 `brand_input` 跳转到工作台
- **WHEN** 工作台页面加载
- **THEN** 表单字段 SHALL 自动填充从聊天携带的品牌信息
- **AND** 流水线 SHALL 自动开始执行

### Requirement: Chat endpoint accepts natural language brand input
The system SHALL expose a `POST /api/v1/chat` endpoint that accepts a user's natural language message and returns the AI reply along with extracted brand input fields.

#### Scenario: Complete input returns structured brand input
- **WHEN** the client sends a POST request to `/api/v1/chat` with body `{"message": "我们是 Nike，想在上海做跑步活动，预算 50 万，周期 3 个月"}`
- **THEN** the system SHALL respond with HTTP status `200`
- **AND** the response SHALL contain `is_complete: true`
- **AND** the response SHALL contain `brand_input.brand_name: "Nike"`
- **AND** the response SHALL contain `brand_input.city: "上海"`

#### Scenario: Incomplete input asks clarifying question
- **WHEN** the client sends a POST request to `/api/v1/chat` with body `{"message": "我们是 Nike"}`
- **THEN** the system SHALL respond with HTTP status `200`
- **AND** the response SHALL contain `is_complete: false`
- **AND** the response SHALL contain a non-empty `reply` asking for missing fields

### Requirement: Chat agent extracts brand input fields
The system SHALL use a DeepAgents agent built on LangGraph to parse the user's message and extract the following fields: brand_name, category, city, budget, period.

#### Scenario: Agent extracts all fields from natural language
- **WHEN** the agent receives "我们是 Nike，想在上海做跑步活动，预算 50 万，周期 3 个月"
- **THEN** the agent SHALL return `brand_name="Nike"`, `category="running"`, `city="上海"`, `budget=50`, `period=3`
- **AND** the agent SHALL be implemented using `deepagents.create_deep_agent`
- **AND** the agent SHALL use a Pydantic `response_format` to produce structured output

#### Scenario: Agent handles missing fields gracefully
- **WHEN** the agent receives "我们是 Nike"
- **THEN** the agent SHALL return `brand_name="Nike"` and null or omitted values for other fields
- **AND** the agent SHALL set `is_complete=false`

### Requirement: LLM provider configuration is environment-driven
The system SHALL read the 阿里百炼 API key, base URL, and model name from environment variables.

#### Scenario: Default model loads when only API key is provided
- **WHEN** the application starts with `DASHSCOPE_API_KEY` set and no `DASHSCOPE_MODEL`
- **THEN** the system SHALL use the default model `qwen-turbo`
- **AND** the system SHALL use the default base URL `https://dashscope.aliyuncs.com/compatible-mode/v1`

#### Scenario: Custom model overrides default
- **WHEN** the application starts with `DASHSCOPE_MODEL=qwen-plus`
- **THEN** the system SHALL use `qwen-plus` for LLM calls

### Requirement: LLM output follows strict JSON format
The system SHALL constrain the LLM to return only valid JSON matching the ChatResponse schema, without markdown code blocks.

#### Scenario: Response is parseable JSON
- **WHEN** the chat endpoint processes a valid message
- **THEN** the agent SHALL produce output matching the `ChatResponse` Pydantic schema
- **AND** the response SHALL contain `reply`, `brand_input`, and `is_complete` keys
- **AND** the system SHALL NOT manually strip markdown code fences

### Requirement: Chat endpoint handles errors gracefully
The system SHALL return structured error responses for invalid input, LLM failures, and unexpected errors.

#### Scenario: Missing message field returns 422
- **WHEN** the client sends a POST request without a `message` field
- **THEN** the system SHALL respond with HTTP status `422`

#### Scenario: LLM failure returns 500
- **WHEN** the LLM call fails or returns unparseable output after retries
- **THEN** the system SHALL respond with HTTP status `500`
- **AND** the error response SHALL use the `APIError` model
