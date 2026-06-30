## 1. 项目依赖与目录骨架

- [x] 1.1 创建 `backend/app/config/settings.py`，使用 `pydantic-settings` 定义基础配置
- [x] 1.2 创建 `backend/pyproject.toml`，声明 FastAPI、Pydantic、LangGraph、DeepAgents、pytest、pytest-asyncio、httpx 等依赖
- [x] 1.3 创建 `backend/mock_data/.gitkeep`

## 2. FastAPI 入口与健康检查

- [x] 2.1 创建 `backend/app/main.py`，实例化 FastAPI app
- [x] 2.2 创建 `backend/app/routers/health.py`，实现 `GET /health` 返回 `{"status": "ok"}`
- [x] 2.3 在 `main.py` 中注册 health router，前缀 `/api/v1`

## 3. 测试基础设施

- [x] 3.1 创建 `backend/tests/conftest.py`，提供全局 `client` fixture（`httpx.AsyncClient` + `lifespan`）
- [x] 3.2 创建 `backend/tests/test_routers/test_health.py`，覆盖健康检查 200 响应

## 4. 验证

- [x] 4.1 在 `backend/` 下安装依赖并运行 `pytest -v`，确认测试通过
- [x] 4.2 运行 `python -m app.main` 或等效命令，确认服务可启动
- [x] 4.3 检查 `backend/` 下目录结构符合 `docs/conventions/directory-structure.md`

## 5. OpenSpec 收尾

- [x] 5.1 运行 `openspec status --change bootstrap-project` 确认所有 artifact 完成
- [x] 5.2 按 `docs/conventions/git-workflow.md` 提交功能分支
- [x] 5.3 合并后运行 `codegraph update`
