## ADDED Requirements

### Requirement: Market analysis page is accessible via Tab navigation
The system SHALL provide a top Tab navigation with "需求提取" and "市场分析" tabs.

#### Scenario: User switches to market analysis
- **WHEN** the user clicks "市场分析" tab
- **THEN** the page SHALL display the market analysis input form
- **AND** clicking "需求提取" tab SHALL return to the existing chat interface

### Requirement: Market analysis form accepts brand name and category
The system SHALL provide a form with two fields: brand_name and category.

#### Scenario: User submits valid input
- **WHEN** the user fills in brand_name and category and clicks "开始分析"
- **THEN** the system SHALL initiate a market analysis request
- **AND** the button SHALL be disabled until the analysis completes

#### Scenario: Missing field validation
- **WHEN** the user clicks "开始分析" with empty brand_name or category
- **THEN** the system SHALL NOT submit and SHALL show inline validation

### Requirement: SSE progress display
The system SHALL display a 5-segment progress bar showing each analysis stage.

#### Scenario: Progress updates during analysis
- **WHEN** the SSE connection delivers a `progress` event
- **THEN** the corresponding segment SHALL fill with the accent color
- **AND** the stage label SHALL update to show the current dimension name

### Requirement: Analysis results display as structured cards
The system SHALL display the completed analysis as a 2×2 grid of structured cards.

#### Scenario: Result is displayed
- **WHEN** the SSE connection delivers a `result` event
- **THEN** the system SHALL replace the progress bar with a 2×2 card grid
- **AND** each card SHALL display its dimension data in structured format
- **AND** the full report SHALL be available via a collapsible section
- **AND** the confidence level SHALL be displayed

### Requirement: Error handling
The system SHALL handle network errors and server errors gracefully.

#### Scenario: SSE connection fails
- **WHEN** the SSE connection fails or returns an error
- **THEN** an error message SHALL be displayed
- **AND** the user SHALL be able to retry

### Requirement: Responsive layout
The market analysis page SHALL adapt to mobile and desktop viewports.

#### Scenario: Mobile viewport
- **WHEN** the viewport width is 375px
- **THEN** the card grid SHALL stack vertically
- **AND** the progress bar SHALL fit within the viewport width

#### Scenario: Desktop viewport
- **WHEN** the viewport width is 1440px
- **THEN** the card grid SHALL display in a 2×2 layout
- **AND** the content SHALL be centered with max-width 1024px
