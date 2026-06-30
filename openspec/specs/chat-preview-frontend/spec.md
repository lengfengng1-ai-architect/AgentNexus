# Capability: chat-preview-frontend

## Purpose

Provide a browser-based chat interface for the marketing plan generation agent. Users can describe their brand needs in natural language, see extraction progress, and resume conversations from local history.

## Requirements

### Requirement: Chat preview page is accessible
The system SHALL provide a frontend page at `/chat` that loads the chat interface.

#### Scenario: User navigates to chat page
- **WHEN** the user opens `/chat` in a browser
- **THEN** the page SHALL load within 3 seconds on a 4G connection
- **AND** the page SHALL display the chat interface on both desktop and mobile viewports

### Requirement: Chat interface displays a progress track
The system SHALL display a progress track at the top of the chat interface showing five field slots: brand_name, category, city, budget, period.

#### Scenario: Empty progress track on first load
- **WHEN** the chat page loads with no conversation history
- **THEN** the track SHALL display five empty slots with icon and minimal label

#### Scenario: Progress track updates as fields are extracted
- **WHEN** the AI response contains `brand_input.brand_name="Nike"` and `brand_input.city="上海"`
- **THEN** the brand and city slots SHALL switch to confirmed state
- **AND** the remaining slots SHALL remain empty

### Requirement: Users can send natural language messages
The system SHALL provide a fixed bottom input area where users can type and send messages.

#### Scenario: User sends a message
- **WHEN** the user types "我们是 Nike，想在上海做跑步活动" and presses Enter
- **THEN** the message SHALL appear in the message stream
- **AND** the system SHALL call `POST /api/v1/chat`

#### Scenario: Shift+Enter inserts a newline
- **WHEN** the user holds Shift and presses Enter
- **THEN** a newline SHALL be inserted into the input instead of sending

### Requirement: AI responses are displayed in the message stream
The system SHALL display AI replies along with the extracted brand input fields.

#### Scenario: AI returns a complete response
- **WHEN** the backend responds with `is_complete=true`
- **THEN** the message stream SHALL show the AI reply
- **AND** the progress track SHALL mark all five slots as confirmed

#### Scenario: AI asks a clarifying question
- **WHEN** the backend responds with `is_complete=false`
- **THEN** the message stream SHALL show the AI clarifying reply
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

### Requirement: Field slots support editing via input prefill
The system SHALL allow users to click a confirmed field slot to prefill the input with an edit prompt.

#### Scenario: User clicks budget slot
- **WHEN** the user clicks the budget slot showing 50
- **THEN** the bottom input SHALL be focused
- **AND** the input text SHALL be prefilled with "把预算改成 "

### Requirement: Welcome state guides first-time users
The system SHALL display a welcome card with scenario cards when no messages exist.

#### Scenario: First visit
- **WHEN** the chat page loads with no messages
- **THEN** a welcome card SHALL display a title and three scenario cards
- **AND** clicking a scenario card SHALL prefill the input with the scenario text

### Requirement: Conversation history is stored locally
The system SHALL persist the full message array to localStorage so users can resume on reload.

#### Scenario: Page reload
- **WHEN** the user reloads the page after a conversation
- **THEN** the previous messages SHALL be restored
- **AND** the progress track SHALL reflect the latest extracted fields

### Requirement: Interface is responsive
The system SHALL adapt the chat layout for mobile and desktop viewports.

#### Scenario: Mobile viewport
- **WHEN** the viewport width is 375px
- **THEN** the message stream width SHALL fill the screen
- **AND** the progress track SHALL scroll horizontally or wrap
- **AND** the input area SHALL remain fixed at the bottom

#### Scenario: Desktop viewport
- **WHEN** the viewport width is 1440px
- **THEN** the message stream SHALL be centered with a max-width of 720px
- **AND** the progress track SHALL align horizontally above the messages
