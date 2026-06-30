## Why

当前项目仅有 `superpowers.yaml` 能力定义和开发约束文档，没有可运行的代码骨架。团队无法验证技术栈选型（FastAPI + LangGraph + DeepAgents），也无法开始后续业务端点的 TDD 开发。本 change 建立最小可运行的项目基础结构，让第一个业务功能可以增量接入。

## What Changes

- 创建 `backend/` 目录结构，包含 `app/`、`tests/`、`mock_data/`
- 添加 `backend/pyproject.toml`，声明 FastAPI、Pydantic、LangGraph、DeepAgents、pytest 等核心依赖
- 实现 FastAPI 入口 `app/main.py`，提供 `/health` 健康检查端点
- 添加 `app/config/settings.py`，使用 `pydantic-settings` 加载环境变量
- 创建 `tests/conftest.py` 和 `tests/test_routers/test_health.py`，验证测试链路
- 在 `mock_data/` 下放置 `.gitkeep`，后续业务功能按 `docs/conventions/mock-data.md` 填充
- 不引入任何业务 router、service 或 prompt 模板

## Capabilities

### New Capabilities

- `health-check`: 应用健康检查端点，用于验证 FastAPI 服务可启动、测试可运行

### Modified Capabilities

- 无

## Impact

- 新增 Python 项目依赖（首次 `uv sync` 或 `pip install -e`）
- 新增 `backend/` 为项目根目录下的首个代码目录
- 为后续 `brand-input` 等 in_scope 功能提供基础设施

## Non-goals

- 不实现任何业务 API（属于后续 `feat/brand-input` change）
- 不接入真实数据库或外部 API
- 不实现 LLM 调用或完整 Agent 工作流
- 不处理用户认证（out_scope）
