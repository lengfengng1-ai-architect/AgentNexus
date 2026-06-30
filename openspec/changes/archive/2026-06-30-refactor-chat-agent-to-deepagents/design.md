## Context

`backend/app/agents/chat_extraction_agent.py` currently uses `langchain_community.chat_models.ChatTongyi` and manually strips markdown fences from the LLM response before parsing JSON. This approach is deprecated, fragile, and diverges from the project's mandated agent stack (LangGraph + DeepAgents). The API contract (`POST /api/v1/chat`) and response schema (`ChatResponse`) are already defined and must remain unchanged.

## Goals / Non-Goals

**Goals:**
- Migrate the chat extraction agent to `deepagents.create_deep_agent` with a Pydantic `response_format`.
- Initialize the Qwen model via `langchain.chat_models.init_chat_model` + `langchain-openai` using DashScope's OpenAI-compatible endpoint.
- Add `DASHSCOPE_BASE_URL` to settings.
- Remove the `dashscope` direct dependency and `langchain-community` ChatTongyi usage.
- Keep all existing tests passing without changing the router/service API.

**Non-Goals:**
- No change to `POST /api/v1/chat` request/response contract.
- No new business logic or additional fields extracted.
- No frontend work.

## Decisions

1. **Use `create_deep_agent` with `response_format=ChatOutput`**
   - Rationale: DeepAgents recommends structured output for deterministic schema extraction; this eliminates manual JSON parsing and markdown stripping.

2. **Model initialization via `init_chat_model` + `langchain-openai`**
   - Rationale: The docs recommend `init_chat_model` for provider-specific configuration. DashScope exposes an OpenAI-compatible endpoint, so `langchain-openai` is the correct adapter rather than the sunsetted `ChatTongyi`.

3. **Keep `ChatResponse` as the public schema; introduce `ChatOutput` only as the agent's internal response format**
   - Rationale: `ChatResponse` is already part of the OpenAPI contract. `ChatOutput` can mirror it exactly so the agent output maps 1:1 to the public schema.

4. **Move model construction into a factory function `_build_agent()` for testability**
   - Rationale: Tests can patch `_build_agent` to inject a mock agent without touching global state.

## Risks / Trade-offs

- [DeepAgents structured output behavior may differ from manual JSON parsing] → Mitigation: tests cover complete/incomplete/error cases before and after refactor.
- [Tongyi via `langchain-openai` may require specific model string formatting] → Mitigation: keep `DASHSCOPE_MODEL` configurable and default to `qwen-turbo`.
- [Removing `dashscope` dependency is safe because it was only used by ChatTongyi] → Verified: no other file imports `dashscope`.
