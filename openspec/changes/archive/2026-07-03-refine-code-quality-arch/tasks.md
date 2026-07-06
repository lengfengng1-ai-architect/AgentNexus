## 1. 机械清理（无风险，不改变行为）

- [x] 1.1 删除 `backend/app/agents/__pycache__/` 中 4 个无源文件的 `.pyc`
- [x] 1.2 `.gitignore` 追加 `mock_data/product_info/` 和 `**/.DS_Store`；删除仓库中发现的 `.DS_Store`
- [x] 1.3 删除 `backend/app/agents/mock_intent_recognition_agent.py` 及 `__init__.py` 中的 import
- [x] 1.4 修复 `.claude/hooks/check-opsx-change.sh` 硬编码路径（改用 `git rev-parse --show-toplevel`）

## 2. 异步修复 + 工具函数提取

- [x] 2.1 `llm_utils.invoke_json()` 改为 `async def` + `.ainvoke()`，更新全部 13 个调用方加 `await`
- [x] 2.2 `market_analysis_agent._llm_json()` 改为 async + `.ainvoke()`，7 个 `call_node_*` 函数和 `call_node_synthesize` 同步改 async
- [x] 2.3 `market_research_agent.run_market_research()` 中调用 `call_node_*` 处加 `await`
- [x] 2.4 提取重复工具函数到 `backend/app/utils.py`（`sanitize`、`parse_budget`、`parse_period`、`extract_text_from_html`），更新 import

## 3. 架构修复（C 类）

- [x] 3.1 创建 `backend/app/config/cache_paths.py`，放 `AUDIENCE_DIR`/`PERSONA_DIR`/`_sanitize` 等；更新 `audience_insight_agent.py` 和 `audience_insight_service.py` 统一引用
- [x] 3.2 修正 `audience_insight_agent.py` 中 `register("audience_insight", ...)` 改为指向全流程 handler（search → fetch → extract → generate_persona）
- [x] 3.3 为 `market_analysis_agent.py` 添加 StateGraph，导出 `_graph`；重构 `market_analysis_service.py` 使用 `astream_events()` 消费
- [x] 3.4 重构 `audience_insight_service.py`：改为通过 `audience_insight_agent._graph.astream_events()` 消费，删除手动 node 调用
- [x] 3.5 重构 `product_info_service.py`：改为通过 `product_research_agent._graph.astream_events()` 消费，删除手动 node 调用

## 4. 依赖修复

- [x] 4.1 `pyproject.toml`：删除重复 `langchain-openai`、删除 `deepagents`、补 `lxml`/`aiosqlite`/`httpx`（主依赖）
- [x] 4.2 运行 `uv lock && uv sync` 验证依赖解析成功

## 5. 测试验证

- [x] 5.1 运行 `uv run pytest` 确保全部已有测试通过
- [x] 5.2 如果有因异步签名变更而需要更新的测试，同步调整

## 6. 文档同步

- [x] 6.1 同步 `docs/conventions/directory-structure.md`（移除已删除文件条目）
- [x] 6.2 同步 `docs/conventions/agent-registry.md` 和 `agent-node-dev-guide.md`（反映当前非 YAML 编排架构）
