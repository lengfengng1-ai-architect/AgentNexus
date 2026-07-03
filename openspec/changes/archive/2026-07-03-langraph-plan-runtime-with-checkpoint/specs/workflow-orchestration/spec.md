## REMOVED Requirements

### Requirement: Agent 节点可以通过注册表接入底座

**Reason**: 通用 Agent 注册表在 `2026-07-03-simplify-workflow-orchestration` 中已删除代码（`registry.py` 只剩 plan pipeline 内部使用的静态映射），不再作为对外能力暴露。plan pipeline 现在通过 LangGraph `StateGraph` 直接在 `plan_generation_service.py` 里编译节点，不再走"注册后被 YAML 引用"的路径。

**Migration**: 无。register/get_handler API 从未有外部调用者。

### Requirement: 工作流可以通过 YAML 文件定义

**Reason**: 通用 YAML workflow runtime（`orchestrator.py` + `workflow_service.py` + `workflows/*.yaml`）已在 `2026-07-03-simplify-workflow-orchestration` 中删除。plan pipeline 是本项目**唯一**的 workflow，直接用 LangGraph `StateGraph` 代码定义更简单也更符合 LangGraph 官方推荐。

**Migration**: `plan_generation_pipeline.yaml` 已删除；新的图定义位于 `backend/app/services/plan_generation_service.py::_build_graph()`。

### Requirement: 工作流节点之间可以通过输入映射传递数据

**Reason**: YAML `input_mapping` / `$.state` / `$.outputs` JSONPath 简化表达式随 YAML runtime 一同废弃。LangGraph `StateGraph` 通过 typed `PlanState` + 节点函数签名直接传递数据，节点读什么字段由 Python 代码显式声明。

**Migration**: 原 YAML 中的 `input_mapping` 语义现在体现在 `plan_generation_service.py::_build_node()` 里每个节点函数的入参 slice。

### Requirement: 工作流可以按拓扑顺序串行或并行执行

**Reason**: 并行 fan-out / fan-in / condition 边等能力属于通用 YAML runtime。plan pipeline 是纯串行的 9 节点线性图，`StateGraph.add_edge` 完全覆盖，通用能力不再需要。

**Migration**: plan pipeline 的顺序在 `_build_graph()` 中用 `add_edge` 显式声明，见新版 `plan-generation-pipeline` capability spec。

### Requirement: 对外暴露工作流运行 API

**Reason**: `/api/v1/workflows/*` 一整套端点在 `2026-07-03-simplify-workflow-orchestration` 中已删除路由（`app/routers/workflows.py` 不存在）。plan pipeline 的运行 API 转由 `/api/v1/plan/*` 承接，且语义完全不同（不再是通用 workflow_id，而是 plan-specific 端点）。

**Migration**:
- `POST /api/v1/workflows/plan_generation_pipeline/run` → `POST /api/v1/plan/run`
- `GET  /api/v1/workflows/{workflow_id}` → 删除，无替代（前端不再需要读取图结构）
- `GET  /api/v1/workflows` → 删除，无替代

### Requirement: 工作流节点支持 condition 字段

**Reason**: 条件边（JSONPath 布尔表达式）随 YAML runtime 废弃。plan pipeline 无条件分支需求。

**Migration**: 无。

### Requirement: 条件表达式解析错误返回 400

**Reason**: 与"节点支持 condition 字段"配套，一并移除。

**Migration**: 无。

### Requirement: 系统 SHALL 提供工作流运行控制接口

**Reason**: `POST /api/v1/workflows/runs/{run_id}/control` 的 `retry` / `skip` / `abort` 三段控制语义在新方案里由 plan-specific 端点承接，且语义演化为 `approve` / `reject` / `cancel`（详见新版 `plan-generation-pipeline` capability spec）。

**Migration**:
- `action: retry` → `POST /api/v1/plan/runs/{run_id}/reject`（打回上一个审核点重跑）
- `action: skip` → 无直接替代；改用 `POST /plan/runs/{run_id}/approve` 带 patch 覆盖失败节点输出往下走
- `action: abort` → `POST /api/v1/plan/runs/{run_id}/cancel`

### Requirement: 系统 SHALL 支持工作流运行状态查询

**Reason**: 通用 `GET /api/v1/workflows/runs/{run_id}/status` 由 plan-specific `GET /api/v1/plan/runs/{run_id}/status` 替代。

**Migration**: 前端 `getPlanRunStatus` 从旧路径切换到新路径，字段语义保持一致（`run_id` / `status` / `outputs` / `failed_node`）。
