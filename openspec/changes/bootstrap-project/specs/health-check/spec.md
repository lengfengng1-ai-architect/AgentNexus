## ADDED Requirements

### Requirement: Health endpoint returns service status
The system SHALL expose a `GET /health` endpoint that returns the service status.

#### Scenario: Service is healthy
- **WHEN** a client sends a `GET` request to `/health`
- **THEN** the system SHALL respond with HTTP status `200`
- **AND** the response body SHALL contain `{"status": "ok"}`

### Requirement: Tests can run against the application
The system SHALL provide a pytest fixture that creates an async HTTP client for testing the FastAPI application.

#### Scenario: Health endpoint test passes
- **WHEN** the test invokes `GET /health` through the async client fixture
- **THEN** the test SHALL assert the response status is `200`
- **AND** the test SHALL assert the response JSON contains `status: ok`

### Requirement: Application configuration is environment-driven
The system SHALL load application settings from environment variables using `pydantic-settings`.

#### Scenario: Default settings load successfully
- **WHEN** the application starts without custom environment variables
- **THEN** the default configuration SHALL be valid and the application SHALL boot
