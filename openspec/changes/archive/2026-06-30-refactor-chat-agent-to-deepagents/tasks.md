## 1. Configuration

- [x] 1.1 Add `dashscope_base_url` to `backend/app/config/settings.py` with default `https://dashscope.aliyuncs.com/compatible-mode/v1`
- [x] 1.2 Add `DASHSCOPE_BASE_URL` to `backend/.env.example`
- [x] 1.3 Remove `dashscope>=1.14` from `backend/pyproject.toml` dependencies

## 2. Agent Refactor

- [x] 2.1 Rewrite `backend/app/agents/chat_extraction_agent.py` to use `deepagents.create_deep_agent` with `response_format=ChatOutput`
- [x] 2.2 Initialize the model via `langchain.chat_models.init_chat_model` with `model_provider="openai"`
- [x] 2.3 Remove `TypedDict(total=False)` state, manual markdown stripping, and `ChatTongyi` import
- [x] 2.4 Keep `extract_brand_input(message: str) -> ChatResponse` public signature unchanged
- [x] 2.5 Introduce a `_build_agent()` factory for testability

## 3. Prompt Template Update

- [x] 3.1 Update `backend/app/prompt_templates/chat_extraction.md.j2` to work as a system prompt and instruct the model to fill the `ChatOutput` schema

## 4. Tests

- [x] 4.1 Update `backend/tests/test_agents/test_chat_extraction_agent.py` to mock `create_deep_agent` (via `_build_agent`) and return structured `ChatOutput` data
- [x] 4.2 Ensure router tests still pass without changes
- [x] 4.3 Run full test suite and verify no `langchain-community` deprecation warnings

## 5. Verification

- [x] 5.1 Run `cd backend && uv run pytest -v --cov=app --cov-report=term-missing`
- [x] 5.2 Confirm coverage remains >= 80%
- [x] 5.3 Confirm `from langchain_community` no longer appears in backend source
