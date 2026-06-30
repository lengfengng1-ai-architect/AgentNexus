## Why

The current chat extraction agent in `backend/app/agents/chat_extraction_agent.py` is built on `langchain_community.chat_models.ChatTongyi`, which is deprecated and no longer actively maintained. It also manually strips markdown code blocks from the LLM output, making the code fragile and harder to test. We need to migrate it to the latest LangGraph + DeepAgents stack mandated by `docs/conventions/agent-framework.md` so the codebase stays aligned with the project's official tech stack and future-proofs the agent layer.

## What Changes

- **BREAKING**: Replace `ChatTongyi` with `langchain.chat_models.init_chat_model` + `langchain-openai` calling DashScope's OpenAI-compatible endpoint.
- Add `DASHSCOPE_BASE_URL` to `backend/app/config/settings.py` with the DashScope compatible-mode URL.
- Refactor `chat_extraction_agent.py` to use `create_deep_agent` from `deepagents` with a Pydantic `response_format` (`ChatOutput`), removing manual JSON stripping and `TypedDict(total=False)` state.
- Update `backend/app/prompt_templates/chat_extraction.md.j2` to work as a system prompt for `create_deep_agent` and to instruct the model to populate the `ChatOutput` schema.
- Update tests in `backend/tests/test_agents/test_chat_extraction_agent.py` to mock `create_deep_agent` instead of `_build_llm`.
- Remove the direct `dashscope` dependency from `backend/pyproject.toml` (keep `langchain-openai`).

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `plan-generation-chat-preview`: implementation-only refactor; API behavior (`POST /api/v1/chat`) and response schema remain unchanged.

## Impact

- Affected files:
  - `backend/app/agents/chat_extraction_agent.py`
  - `backend/app/config/settings.py`
  - `backend/app/prompt_templates/chat_extraction.md.j2`
  - `backend/tests/test_agents/test_chat_extraction_agent.py`
  - `backend/pyproject.toml`
- No API contract changes; no OpenSpec YAML changes.
- No new mock data required.
