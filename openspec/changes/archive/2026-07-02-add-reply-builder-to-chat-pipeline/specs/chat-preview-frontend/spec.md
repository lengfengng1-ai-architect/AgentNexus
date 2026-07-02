## MODIFIED Requirements

### Requirement: Users can send natural language messages
The system SHALL provide a fixed bottom input area where users can type and send messages.

#### Scenario: User sends a message
- **WHEN** the user types "我们是 Nike，想在上海做跑步活动" and presses Enter
- **THEN** the message SHALL appear in the message stream
- **AND** the system SHALL call `POST /api/v1/workflows/chat_pipeline/run`
- **AND** the request body SHALL contain `{ input: { message } }`

#### Scenario: Shift+Enter inserts a newline
- **WHEN** the user holds Shift and presses Enter
- **THEN** a newline SHALL be inserted into the input instead of sending

### Requirement: AI responses are displayed in the message stream
The system SHALL display AI replies along with the extracted brand input fields.

#### Scenario: AI returns a complete response
- **WHEN** the backend responds with `outputs.intent.intent="generate_plan"`
- **AND** `outputs.reply_builder.reply` is present
- **THEN** the message stream SHALL show the AI reply from `outputs.reply_builder.reply`
- **AND** the progress track SHALL mark all five slots as confirmed

#### Scenario: AI asks a clarifying question
- **WHEN** the backend responds with `outputs.intent.intent="clarify"`
- **AND** `outputs.intent.missing_fields` is non-empty
- **THEN** the message stream SHALL show the clarifying reply from `outputs.reply_builder.reply`
- **AND** the progress track SHALL only confirm the extracted fields

### Requirement: Loading and error states are handled
The system SHALL provide visual feedback while waiting for AI responses and allow retry on failure.

#### Scenario: Waiting for AI response
- **WHEN** the user sends a message
- **THEN** a loading skeleton SHALL appear in the message stream
- **AND** the input SHALL be disabled until the response arrives

#### Scenario: Request fails
- **WHEN** the backend returns HTTP 500 or the network fails
- **THEN** an error bar SHALL appear above the input area
- **AND** the failed user message SHALL display a retry button
- **AND** clicking retry SHALL resend the same message

### Requirement: Conversation history is stored locally
The system SHALL persist the full message array to localStorage so users can resume on reload.

#### Scenario: Page reload
- **WHEN** the user reloads the page after a conversation
- **THEN** the previous messages SHALL be restored
- **AND** the progress track SHALL reflect the latest `brand_input` from `outputs.intent.brand_input`
