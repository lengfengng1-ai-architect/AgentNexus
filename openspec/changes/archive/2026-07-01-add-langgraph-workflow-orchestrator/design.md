## Context

当前 `backend/app/agents/` 只有一个 `chat_extraction_agent.py`，它自己管理自己的 LangGraph，没有统一的注册与编排机制。随着团队成员并行开发市场调研、方案生成等 Agent，需要一个公共底座来管理：
- Agent 节点如何注册；
- 工作流如何用 YAML 定义；
- 主流程如何按配置执行 LangGraph。

该底座属于 `workflow-orchestration` 能力，服务于已有的 `plan-generation` 和 `brand-input` 能力，但不改变它们的外部契约。

## Goals / Non-Goals

**Goals:**
- 提供 Agent 注册表，新 Agent 节点只需实现 `run_<name>(state: dict)` 并注册即可；
- 工作流通过 YAML 文件定义节点、边、输入映射，便于非开发角色调整编排；
- 对外暴露 `/api/v1/workflows/{id}/run` 运行工作流；
- MVP 实现串行执行，保证简单稳定；
- 测试覆盖率 ≥80%。

**Non-Goals:**
- 不实现竞品分析节点（out_scope）；
- 不实现并行节点、条件分支、持久化、人机协同；
- 不实现前端界面；
- 不引入 LangGraph 之外的 Agent 框架。

## Decisions

1. **Agent 入口统一为 `async def run_<name>(state: dict) -> dict`**
   - 选择原因：与 LangGraph 节点函数形态一致，state 通用，便于不同 Agent 之间传递数据。
   - 替代方案：让 handler 直接接收 `WorkflowState` Pydantic 对象；但这样每个 Agent 都要依赖 orchestrator 的 state 定义，耦合度高。

2. **输入/输出映射使用简化 JSONPath（`$.input.xxx`、`$.outputs.node_id.xxx`）**
   - 选择原因：足够表达节点间数据依赖，实现简单，不需要引入完整 JSONPath 库。
   - 替代方案：完整 JSONPath 规范；增加解析复杂度和依赖，MVP 不需要。

3. **工作流定义文件放在 `backend/workflows/*.yaml`**
   - 选择原因：与代码分离，产品经理或主流程负责人可直接调整编排，无需改 Python。

4. **MVP 串行执行，按拓扑排序确定节点顺序**
   - 选择原因：避免 LangGraph `Send`/checkpoint 复杂度，先验证注册-编排-API 主链路。
   - 后续扩展：并行节点可作为独立 change 引入。

5. **同步 Agent handler 通过 `run_in_executor` 包装**
   - 选择原因：保持 async 主流程不阻塞，同时允许简单同步 handler 接入。

6. **注册表在 `backend/app/agents/__init__.py` 中统一 import 触发**
   - 选择原因：保证 FastAPI 启动时所有 Agent 已注册，与 FastAPI 生命周期解耦。

## Risks / Trade-offs

- **[Risk]** 拓扑排序隐藏了显式边，若 YAML 边与依赖不一致可能产生意外执行顺序。
  - **Mitigation**: 服务层校验边中引用的节点必须存在，并检测环；测试覆盖多节点链路。
- **[Risk]** 状态使用通用 dict，字段错误在运行时才暴露。
  - **Mitigation**: input_mapping 在节点 wrapper 中解析，缺失字段返回 `None` 并在 handler 内做必填校验；Pydantic schemas 校验请求和响应。
- **[Risk]** 新增 Agent 忘记在 `__init__.py` import 导致注册失败。
  - **Mitigation**: `docs/conventions/agent-registry.md` 中明确自检清单；工作流校验时检查 agent 是否已注册并返回明确错误。

## Migration Plan

- 新文件新增，不修改现有数据库或外部系统。
- 现有 `/api/v1/chat` 路由保持原行为不变。
- 部署时只需确保 `backend/workflows/` 目录随代码一起发布。

## Open Questions

1. 是否需要工作流定义热重载？MVP 阶段不实现，重启服务后重新加载。
2. 后续是否需要支持条件分支（如 `is_complete` 为 false 时直接结束）？作为独立 change 处理。
