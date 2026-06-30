# Capability: plan-generation-chat-preview

## Purpose

Provide a conversational entry point for marketing plan generation. The agent extracts structured brand input fields from natural language messages and asks clarifying questions when information is missing.

## Requirements

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
The system SHALL use a LangGraph agent to parse the user's message and extract the following fields: brand_name, category, city, budget, period.

#### Scenario: Agent extracts all fields from natural language
- **WHEN** the agent receives "我们是 Nike，想在上海做跑步活动，预算 50 万，周期 3 个月"
- **THEN** the agent SHALL return `brand_name="Nike"`, `category="running"`, `city="上海"`, `budget=50`, `period=3`

#### Scenario: Agent handles missing fields gracefully
- **WHEN** the agent receives "我们是 Nike"
- **THEN** the agent SHALL return `brand_name="Nike"` and null or omitted values for other fields
- **AND** the agent SHALL set `is_complete=false`

### Requirement: LLM provider configuration is environment-driven
The system SHALL read the阿里百炼 API key and model name from environment variables.

#### Scenario: Default model loads when only API key is provided
- **WHEN** the application starts with `DASHSCOPE_API_KEY` set and no `DASHSCOPE_MODEL`
- **THEN** the system SHALL use the default model `qwen-turbo`

#### Scenario: Custom model overrides default
- **WHEN** the application starts with `DASHSCOPE_MODEL=qwen-plus`
- **THEN** the system SHALL use `qwen-plus` for LLM calls

### Requirement: LLM output follows strict JSON format
The system SHALL constrain the LLM to return only valid JSON matching the ChatResponse schema, without markdown code blocks.

#### Scenario: Response is parseable JSON
- **WHEN** the chat endpoint processes a valid message
- **THEN** the LLM output SHALL be parseable as JSON
- **AND** the parsed JSON SHALL contain `reply`, `brand_input`, and `is_complete` keys

### Requirement: Chat endpoint handles errors gracefully
The system SHALL return structured error responses for invalid input, LLM failures, and unexpected errors.

#### Scenario: Missing message field returns 422
- **WHEN** the client sends a POST request without a `message` field
- **THEN** the system SHALL respond with HTTP status `422`

#### Scenario: LLM failure returns 500
- **WHEN** the LLM call fails or returns unparseable output after retries
- **THEN** the system SHALL respond with HTTP status `500`
- **AND** the error response SHALL use the `APIError` model
