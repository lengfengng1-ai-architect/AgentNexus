## ADDED Requirements

### Requirement: SSE stream emits data events per completed node
The system SHALL emit an SSE `data` event immediately after each node completes, containing that node's structured output.

#### Scenario: define node completes
- **WHEN** the define node finishes LLM call
- **THEN** the stream SHALL emit `event: data` with `node: "define"` and `result`: market_definition
- **AND** the stream SHALL emit `event: node_end` with `status: "completed"`

#### Scenario: all nodes complete
- **WHEN** all 7 nodes complete
- **THEN** the stream SHALL emit `event: result` with full `MarketResearchResult`
