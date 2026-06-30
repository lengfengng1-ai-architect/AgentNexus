## 1. 依赖与配置

- [ ] 1.1 在 `backend/pyproject.toml` 添加阿里百炼相关依赖（如 `langchain-community`）
- [ ] 1.2 在 `backend/app/config/settings.py` 添加 `DASHSCOPE_API_KEY` 和 `DASHSCOPE_MODEL` 配置
- [ ] 1.3 创建 `backend/.env.example`
- [ ] 1.4 运行 `uv sync` 安装依赖

## 2. Prompt 模板

- [ ] 2.1 创建 `backend/app/prompt_templates/chat_extraction.md.j2`
- [ ] 2.2 模板中声明提取字段、单位、JSON 输出格式、禁止编造数据

## 3. Agent 实现

- [ ] 3.1 创建 `backend/app/agents/__init__.py` 和 `backend/app/agents/chat_extraction_agent.py`
- [ ] 3.2 定义 `ChatExtractionState`（输入消息、提取字段、是否完整、回复）
- [ ] 3.3 实现 LangGraph StateGraph：`extract` 节点调用 LLM，`check` 节点判断完整性
- [ ] 3.4 使用 `ChatTongyi` 或等效封装调用阿里百炼
- [ ] 3.5 实现解析 LLM JSON 输出为 Pydantic model 的逻辑，含重试

## 4. Schemas

- [ ] 4.1 创建 `backend/app/schemas/chat.py`
- [ ] 4.2 定义 `ChatRequest`、`BrandInput`、`ChatResponse` 模型

## 5. Service 层

- [ ] 5.1 创建 `backend/app/services/chat_service.py`
- [ ] 5.2 实现 `extract_brand_input(message: str) -> ChatResponse`

## 6. Router

- [ ] 6.1 创建 `backend/app/routers/chat.py`
- [ ] 6.2 实现 `POST /api/v1/chat`，返回 ChatResponse
- [ ] 6.3 在 `app/main.py` 注册 chat router

## 7. 测试

- [ ] 7.1 创建 `backend/tests/test_routers/test_chat.py`
- [ ] 7.2 覆盖 200 完整输入、200 不完整输入、422 缺字段、500 LLM 失败
- [ ] 7.3 创建 `backend/tests/test_agents/test_chat_extraction_agent.py`
- [ ] 7.4 使用 mock LLM 响应测试提取逻辑
- [ ] 7.5 运行 `uv run pytest -v`，确认全部通过

## 8. 文档与收尾

- [ ] 8.1 更新 `README.md` 中的功能状态
- [ ] 8.2 运行 `openspec status --change plan-generation-chat-preview` 确认 artifact 完成
- [ ] 8.3 按 Git 工作流提交功能分支并合并到 develop
- [ ] 8.4 合并后运行 `codegraph sync`
