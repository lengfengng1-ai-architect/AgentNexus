## Why

项目经过多轮快速迭代后积累了大量架构债务：Service 层重复 Agent 内部 node 调用逻辑、Agent 反向依赖 Service、同步 LLM 调用阻塞事件循环、注册名歧义导致 plan pipeline 中 `audience_insight` 节点实际上只跑了画像生成而缺少全流程（搜索→提取→画像）。这些不影响外部 API 契约，但严重降低可维护性、可测试性和并发性能。

## What Changes

### 架构修复（核心）

- **C1: 解除 Agent → Service 反向依赖**：将 `AUDIENCE_DIR`、`PERSONA_DIR`、`_sanitize` 等缓存路径常量提取到共享模块 `backend/app/config/cache_paths.py`，agent 和 service 统一引用，消除 `service → agent → service` 循环依赖链。
- **C2: Service 层重构为 astream_events 模式**：将 `audience_insight_service.py`、`product_info_service.py`、`market_analysis_service.py` 中的手动 node 调用+手写 SSE 逻辑，替换为通过 agent 的 `StateGraph.astream_events()` 消费流并统一转发为 SSE 事件（参照 `plan_generation_service.py` 模式）。
- **C3: 修正 audience_insight 注册名 + 全流程**：将 `register("audience_insight", run_generate_persona)` 改为指向全流程 handler（search → fetch → extract → generate_persona），确保 plan pipeline 中人群洞察节点产出完整数据。

### 行为修复

- **B1: 同步 invoke → 异步 ainvoke**：`llm_utils.invoke_json()` 和 `market_analysis_agent.py` 中 7 个 `call_node_*` 函数由同步 `.invoke()` 改为异步 `.ainvoke()`，修复事件循环阻塞。
- **B2: 提取重复工具函数到共享模块**：`_sanitize`（3 处）、`_parse_budget`/`_parse_period`（2 处）、`_extract_text_from_html`（2 处）提取到 `backend/app/utils.py`。

### 机械清理

- **A1**: 删除 4 个孤儿 `.pyc` 文件（`reply_builder_agent`、`orchestrator`、`chat_extraction_agent`、`requirement_collector_agent`）
- **A2**: `.gitignore` 补上 `mock_data/product_info/` 和 `**/.DS_Store`；删除仓库中 `.DS_Store`
- **A3**: 删除未使用的 `mock_intent_recognition_agent.py` 及相关 import
- **A4**: 修复 `check-opsx-change.sh` 硬编码路径（改用 `git rev-parse --show-toplevel`）

### 配置修复

- **D1**: `pyproject.toml` 清理（删重复 `langchain-openai`、删死依赖 `deepagents`、补缺少运行时依赖 `lxml`/`aiosqlite`/`httpx`）

### 文档同步

- **E1**: 同步 `docs/conventions/directory-structure.md` / `agent-registry.md` / `agent-node-dev-guide.md` 到当前架构（删除已移除的 orchestrator、workflows router 等引用）

## Capabilities

### New Capabilities

无新增能力。

### Modified Capabilities

无 spec 级变更。所有修复均为内部代码质量重构，不影响 API 端点、Pydantic schema 字段或业务规则。

## Non-goals

- 不创建 `/workflows` 路由器（该 OpenAPI YAML 定义的项目级能力暂搁置）
- 不创建 `reply_builder` agent（`end_reply_agent.py` 已覆盖）
- 不重构 API 端点或 Pydantic schema
- 不改变外部业务行为

## Impact

| 领域 | 影响 |
|------|------|
| `backend/app/agents/` | 13 个文件修改（llm_utils、market_analysis_agent、audience_insight_agent、product_research_agent 等 + `__init__.py`） |
| `backend/app/services/` | 3 个 Service 核心重构（audience_insight、product_info、market_analysis） |
| `backend/app/config/` | 新建 `cache_paths.py` 共享模块 |
| `backend/app/utils.py` | 新建共享工具函数模块 |
| `pyproject.toml` | 依赖增删改 |
| `.gitignore` | 追加模式 |
| `.claude/hooks/` | `check-opsx-change.sh` 修复 |
| `docs/conventions/` | 3 个文件同步 |
