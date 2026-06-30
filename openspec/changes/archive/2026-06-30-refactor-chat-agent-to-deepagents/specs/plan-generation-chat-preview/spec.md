## MODIFIED Requirements

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
