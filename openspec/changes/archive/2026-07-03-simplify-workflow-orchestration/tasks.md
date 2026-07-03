## 1. 删除旧文件

- [ ] 1.1 删除 `app/agents/orchestrator.py`
- [ ] 1.2 删除 `workflows/` 目录（4 个 YAML）
- [ ] 1.3 删除 `app/services/workflow_service.py`
- [ ] 1.4 删除 `app/services/workflow_run_service.py`
- [ ] 1.5 删除 `app/routers/workflows.py`
- [ ] 1.6 删除 `app/schemas/workflow.py`
- [ ] 1.7 从 `main.py` 移除 workflows router import
- [ ] 1.8 删除相关测试文件

## 2. 新建 plan_generation_service.py

- [ ] 2.1 用 StateGraph 定义 PlanState + 10 个节点
- [ ] 2.2 暴露 `run_pipeline()`（同步返回）和 `run_stream()`（SSE 流式）
- [ ] 2.3 保留原有 mock 路径兼容（直接返回 JSON）

## 3. 更新前端适配

- [ ] 3.1 更新 `frontend/src/api/workflow.ts` 调用新的流式端点
- [ ] 3.2 添加新的路由端点（或复用 chat 路由）

## 4. 更新文档

- [ ] 4.1 更新 `agent-framework.md`
- [ ] 4.2 更新 `directory-structure.md`
