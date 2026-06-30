## Context

当前项目没有任何可运行代码，需要先建立最小可运行的技术骨架。本 change 只解决"项目能启动、测试能跑、依赖能装"的问题，为后续业务功能提供基础设施。

## Goals / Non-Goals

**Goals:**
- 建立 `backend/` 目录结构（`app/`、`tests/`、`mock_data/`）
- 配置 Python 依赖（FastAPI、Pydantic、LangGraph、DeepAgents、pytest）
- 实现 FastAPI 入口和 `/health` 健康检查端点
- 配置 `pydantic-settings` 管理环境变量
- 编写第一个测试，验证 pytest + httpx 链路可用

**Non-Goals:**
- 不实现业务 router、service 或 schema
- 不实现 prompt 模板或 LLM 调用
- 不接入真实数据库或外部 API
- 不实现 LangGraph agent（本 change 只装好依赖，供后续 change 使用）

## Decisions

### 1. 使用 `pyproject.toml` 作为项目配置中心

- 用 `pyproject.toml` 声明依赖、脚本入口、pytest 配置，避免多配置文件
- 依赖管理工具不强制指定，可用 `uv`、`pip` 或 `pdm`

### 2. 使用 `pydantic-settings` 加载配置

- 所有环境变量统一走 `app.config.settings`
- 默认配置可在本地 `.env` 覆盖，避免硬编码

### 3. `/health` 端点保持极简

- 返回 `{"status": "ok"}`，仅验证服务启动成功
- 这是 bootstrap 阶段的探针，后续业务端点基于此模式扩展

### 4. 测试使用 `httpx.AsyncClient`

- FastAPI 官方推荐的 async client
- conftest 提供全局 `client` fixture，后续 router 测试复用

### 5. LangGraph / DeepAgents 仅声明依赖

- 不在 bootstrap 中实现 agent
- 确认依赖版本兼容即可

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| 依赖版本冲突（LangGraph + DeepAgents 较新） | 在 `pyproject.toml` 中固定主版本，首次安装后 lock |
| 团队成员 Python 环境不一致 | 使用 `uv` 或 `pip` 虚拟环境，README 中补充环境说明 |
| 后续业务端点破坏 `/health` | `/health` 独立 router，不依赖业务代码 |

## Migration Plan

- 合并本 change 后，团队可运行 `cd backend && pytest` 验证环境
- 后续业务 change 直接复用 `conftest.py` 中的 fixture

## Open Questions

- 是否统一使用 `uv` 作为依赖管理工具？（建议，但不强制）
- 是否需要 CI 脚本在 bootstrap 阶段就加入？（建议 P1 阶段再补）
