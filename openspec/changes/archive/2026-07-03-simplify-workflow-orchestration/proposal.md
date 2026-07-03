## Why

当前工作流编排层过度设计：YAML + `orchestrator.py` + `workflow_service.py` + `workflow_run_service.py` + `routers/workflows.py` 5 个组件只服务了一个 `plan_generation_pipeline.yaml`。聊天功能根本不走 YAML，直接调函数。LangGraph 官方推荐的方式是用 `StateGraph` 在代码里直接定义图，去掉配置层。

## What Changes

- **移除** `orchestrator.py`、`workflows/`、`workflow_service.py`、`workflow_run_service.py`、`routers/workflows.py`、`schemas/workflow.py`
- **新建** `services/plan_generation_service.py` — 用 `StateGraph` 定义方案生成 pipeline
- `registry.py` + `llm_utils.py` 保留
- 更新相关文档

## Capabilities

### New Capabilities
- `plan-generation-pipeline`: LangGraph StateGraph 方案生成流水线

### Modified Capabilities
- `workflow-orchestration`: 移除 YAML 配置层，改为代码定义图

## Impact

- 删除约 6 个文件，新建 1 个文件
- 运行行为不变，只是去掉中间配置层
