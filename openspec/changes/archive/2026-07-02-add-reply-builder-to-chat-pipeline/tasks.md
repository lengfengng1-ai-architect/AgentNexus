## 1. 后端：新增 reply_builder Agent

- [x] 1.1 创建 `backend/app/agents/reply_builder_agent.py`，实现 `run_reply_builder(state: dict) -> dict`，使用 LLM 生成 `reply: str`。
- [x] 1.2 创建 `backend/app/prompt_templates/reply_builder.md.j2`，定义口语化回复生成 prompt。
- [x] 1.3 在 `backend/app/agents/__init__.py` 中 import 并自动注册 `reply_builder` 到 registry。

## 2. 后端：修改 chat_pipeline 工作流

- [x] 2.1 修改 `backend/workflows/chat_pipeline.yaml`，增加 `reply_builder` 节点作为统一收口。
- [x] 2.2 配置 `reply_builder` 的 `input_mapping`，传入 `intent`、`branch_output`、`message`。
- [x] 2.3 后端启动后，通过 curl 验证 `POST /api/v1/workflows/chat_pipeline/run` 返回 `outputs.reply_builder.reply`。

## 3. 前端：主对话调用工作流

- [x] 3.1 修改 `frontend/src/hooks/useChat.ts`，把 `sendChatMessage` 替换为 `runChatPipeline`。
- [x] 3.2 在 `RECEIVE_MESSAGE` action 中，从工作流输出提取 `reply_builder.reply` 和 `intent.brand_input`。
- [x] 3.3 扩展 `frontend/src/types/chat.ts` 中的 `ChatMessage` 类型，支持保存 `intent` 和 `brand_input`（可选）。

## 4. 前端：兼容性与验证

- [x] 4.1 保留「意图测试」tab 的现有行为不变。
- [x] 4.2 运行 `cd frontend && npm run build` 确认 TypeScript 编译通过。
- [x] 4.3 运行 `cd frontend && npm run lint` 检查无新增 lint 问题。
- [x] 4.4 启动前后端，手动验证主对话输入能正确展示口语化回复。

## 5. 测试

- [x] 5.1 为 `reply_builder_agent.py` 编写单元测试，覆盖 `generate_plan`、`query_data`、`clarify`、`chat`、`update_context` 五种意图。
- [x] 5.2 为修改后的 `chat_pipeline.yaml` 补充工作流测试或集成测试，验证 `reply_builder` 节点输出。
- [x] 5.3 运行 `cd backend && uv run pytest -v --cov=app --cov-report=term-missing` 确认覆盖率 ≥80%。
