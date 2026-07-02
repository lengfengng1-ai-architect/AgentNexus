## MODIFIED Requirements

### Requirement: Users can send natural language messages

The system SHALL provide a fixed bottom input area where users can type and send messages.

#### Scenario: User sends a generate_plan message
- **WHEN** the user types "我们是 Nike，想在上海做跑步活动，预算 50 万，周期 3 个月"
- **THEN** the message SHALL appear in the message stream
- **AND** the system SHALL call `POST /api/v1/workflows/chat_pipeline/run`
- **AND** the request body SHALL contain `{ input: { message } }`

### Requirement: AI responses are displayed in the message stream

The system SHALL display AI replies along with the extracted brand input fields.

#### Scenario: AI returns generate_plan with complete brand_input
- **WHEN** the backend responds with `outputs.intent.intent="generate_plan"`
- **AND** `outputs.intent.brand_input` contains all five required fields
- **AND** `outputs.reply_builder.reply` is present
- **THEN** the message stream SHALL show the AI reply from `outputs.reply_builder.reply`
- **AND** the progress track SHALL mark all five slots as confirmed
- **AND** the AI reply card SHALL display a "生成方案" button

#### Scenario: User clicks generate plan button
- **GIVEN** the AI reply card shows the "生成方案" button
- **WHEN** the user clicks the button
- **THEN** the system SHALL persist the current `brand_input` and session context to localStorage
- **AND** the system SHALL navigate to `/plan?session=<session_id>`

### Requirement: Loading and error states are handled

The system SHALL provide visual feedback while waiting for AI responses and allow retry on failure.

#### Scenario: Waiting for generate_plan intent response
- **WHEN** the user sends a message that triggers `generate_plan`
- **THEN** a loading skeleton SHALL appear in the message stream
- **AND** the input SHALL be disabled until the response arrives
