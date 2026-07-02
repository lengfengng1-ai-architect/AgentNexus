# Capability: market-analysis

## Purpose

Provide market research analysis for the AllyGo marketing plan pipeline.
The system SHALL accept a brand name and product category, then conduct a
4-dimension market analysis via web search and LLM synthesis.

## Requirements

### Requirement: Market analysis sync endpoint
The system SHALL expose a `POST /api/v1/market-analysis` endpoint that
synchronously returns a structured market analysis report.

#### Scenario: Valid request returns full report
- **GIVEN** the market analysis agent is initialized
- **WHEN** a client sends a `POST` request to `/api/v1/market-analysis`
  with `{"brand_name": "AllyGo", "category": "运动饮料"}`
- **THEN** the system SHALL respond with HTTP status `200`
- **AND** the response body SHALL contain `report` with `industry_trends`,
  `trend_signals`, `consumer_insights`, `competitive_landscape`, and `full_report`
- **AND** the response body SHALL contain `confidence` (`"high"`, `"medium"`, or `"low"`)

#### Scenario: Missing brand_name returns 422
- **WHEN** a client sends a `POST` request without `brand_name` or with empty string
- **THEN** the system SHALL respond with HTTP status `422`

#### Scenario: Missing category returns 422
- **WHEN** a client sends a `POST` request without `category` or with empty string
- **THEN** the system SHALL respond with HTTP status `422`

#### Scenario: Agent failure returns 500
- **WHEN** the market analysis agent raises an internal exception
- **THEN** the system SHALL respond with HTTP status `500`
- **AND** the response body SHALL contain `detail` with error description

### Requirement: Market analysis SSE stream endpoint
The system SHALL expose a `POST /api/v1/market-analysis/stream` endpoint
that returns analysis progress and results as Server-Sent Events.

#### Scenario: Stream delivers progress and result events
- **GIVEN** the market analysis agent is initialized
- **WHEN** a client sends a `POST` request to `/api/v1/market-analysis/stream`
- **THEN** the response SHALL be `text/event-stream`
- **AND** the stream SHALL emit `progress` events with `stage` for each dimension
  (`searching_industry`, `searching_trend`, `searching_consumer`,
   `searching_competitive`, `analyzing`)
- **AND** the stream SHALL emit a final `result` event containing `report` and `confidence`
- **AND** the response headers SHALL include `Cache-Control: no-cache`,
  `Connection: keep-alive`, and `X-Accel-Buffering: no`

### Requirement: Market analysis supports mock mode
The system SHALL support a mock mode (via `USE_MOCK_DATA=true` env var)
that returns canned data without calling the LLM agent.

#### Scenario: Mock mode returns mock progress and response
- **GIVEN** `USE_MOCK_DATA=true` is set
- **WHEN** a client sends a request to either endpoint
- **THEN** the response SHALL use data from `backend/mock_data/market.json`
- **AND** the stream endpoint SHALL emit simulated progress events before the result

### Requirement: Market analysis Agent
The system SHALL implement a LangGraph agent that performs the 4-dimension
analysis using web search and LLM integration.

#### Scenario: Agent searches web per dimension and synthesizes
- **GIVEN** a brand name and category
- **WHEN** the agent is invoked
- **THEN** the agent SHALL search the web for each of 4 dimensions
  (industry trends, trend signals, consumer insights, competitive landscape)
- **AND** the agent SHALL synthesize findings into a structured `MarketAnalysisReport`
- **AND** each finding SHALL include a source URL (or `"LLM 推理"` for inferred content)

### Requirement: 4 analysis dimensions
The market analysis SHALL cover exactly 4 dimensions:

- **Industry Trends**: GDP/market size change over 5 years, current market scale, narrative summary
- **Trend Signals**: Policy direction signals with assessment (`positive`/`neutral`/`negative`) and sources
- **Consumer Insights**: Behavior shifts with specific changes and sources (at least 2-3)
- **Competitive Landscape**: Competing brands with product highlights, pricing, and sources (at least 2-3 brands)
