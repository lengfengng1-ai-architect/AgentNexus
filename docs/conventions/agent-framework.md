# Agent 框架规范

> 本文件定义本项目 Agent 实现必须使用的技术栈和代码模式。
> 所有新增或重构的 Agent 功能必须遵守本文档。

## 强制技术栈

- **Agent 编排：LangGraph**（`langgraph>=1.0`）——所有状态流转、节点编排、持久化/流式/人机协同的载体
- **Agent 能力增强：DeepAgents**（`deepagents>=0.6`）——在 LangGraph 之上按需使用
- **模型初始化：统一通过 `app.agents.llm_utils.build_chat_model()`，禁止每个 agent 自己写 `_build_model`**
- **依赖管理：uv**

禁止引入其他 Agent 框架，或在 LangGraph 之外手写完整的 ReAct/Plan-and-Execute 等循环。

## 架构分层

```text
┌─────────────────────────────────────────┐
│  Application / Router / Service         │
├─────────────────────────────────────────┤
│  Registry + Orchestrator                │  ← registry.py + orchestrator.py
│  - register("name", handler)            │    可插拔注册 + LangGraph 图构建
│  - build_graph(workflow_def) → graph    │
│  - build_graph(workflow_def) → graph    │
├─────────────────────────────────────────┤
│  Agent 节点层                           │  ← agents/*_agent.py
│  - async def run_xxx(state: dict)->dict │    统一入口，注册到 registry
│  - 内部使用 build_chat_model()          │
│  - 不含 mock 代码                       │
├─────────────────────────────────────────┤
│  Mock Agent 层                          │  ← agents/mock_*.py
│  - 独立文件，以 mock_ 开头               │
├─────────────────────────────────────────┤
│  LangChain 模型层                       │  ← llm_utils.py
│  - build_chat_model()                   │    统一 provider 适配
│  - with_structured_output               │
└─────────────────────────────────────────┘
```

**核心原则：**
- Agent 通过 `registry.register()` 注册到系统，不依赖硬编码的路由。
- Mock Agent 通过 `registry.register_mock()` 注册为独立文件（`mock_` 开头）。
- 真实 Agent 文件**禁止包含任何 mock 代码**（`use_mock_data`、`_MOCK_PATH`、`_load_mock`）。
- `llm_utils.build_chat_model()` 是唯一的模型构建入口，所有 agent 禁止自己写 `_build_model()`。

### Agent 文件头注释规范

每个 Agent 文件头部必须包含标准注释块：

```python
"""Agent: <能力名称>。

注册名称: <registry 名称>
对应 OpenSpec: docs/api/paths/<xxx>.yaml
对应 in_scope ID: <superpowers.yaml ID>
用途: <一句话描述>
输入: <需要的 state 字段>
输出: <返回的 schema>
"""
```

字段说明：

| 字段 | 说明 |
|------|------|
| `注册名称` | `registry.register()` 中的名称，YAML workflow `agent:` 引用 |
| `对应 OpenSpec` | `docs/api/paths/` 下的 YAML 文件路径 |
| `对应 in_scope ID` | `docs/superpowers.yaml` 中 `in_scope` 的 ID |
| `用途` | 一句话描述 |
| `输入` | `state` 中需要的字段 |
| `输出` | 返回的 Pydantic schema |

## 模型配置

`backend/app/config/settings.py` 暴露多 provider 配置（dashscope / agnes / myself），统一通过 `llm_utils.build_chat_model()` 访问：

```python
from app.agents.llm_utils import build_chat_model

model = build_chat_model()
structured_llm = build_chat_model().with_structured_output(MySchema)
```

不需要在每个 agent 文件里复制 `if settings.llm_provider == "agnes":` 分支。

## 可插拔注册模式

每个 agent 模块自己调用 `register()` 注册，无需改主流程代码：

```python
from app.agents.registry import register

async def run_my_agent(state: dict) -> dict:
    ...

register("my_agent", run_my_agent)
```

Mock handler 可选注册：

```python
from app.agents.registry import register, register_mock

async def mock_run_my_agent(state: dict) -> dict:
    ...

register("my_agent", run_my_agent)
register_mock("my_agent", mock_run_my_agent)
```

## 可配置工作流编排

通过 YAML 定义节点、边、条件分支和并行执行（串行/并行/fan-in），Orchestrator 自动转为 LangGraph：

```yaml
nodes:
  - id: product_research
    agent: product_research
    input_mapping:
      brand_name: "$.input.brand_input.brand_name"

  - id: audience_insight
    agent: audience_insight
    depends_on: [product_research]
    input_mapping:
      product_name: "$.input.brand_input.brand_name"

edges:
  - from: product_research
    to: audience_insight
  - from: audience_insight
    to: __end__
```

## 响应信封（非流式端点）

所有非流式 API 响应统一使用 `APIResponse` 信封：

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": null
}
```

错误响应：

```json
{
  "success": false,
  "data": null,
  "error": { "detail": "...", "code": "error_code", "errors": null }
}
```

错误码通过 `ErrorCode` 常量类引用，避免字符串拼写错误。

## 模型构建统一入口

`app/agents/llm_utils.py` 提供：

```python
def build_chat_model():
    """Initialize the configured chat model."""
    if settings.llm_provider == "agnes":
        return init_chat_model(model=..., model_provider="openai", ...)
    if settings.llm_provider == "myself":
        return init_chat_model(model=..., model_provider="openai", ...)
    return init_chat_model(model=settings.dashscope_model, ...)
```

所有 agent 通过此函数获取模型，不需要自己处理 provider 选择。

## 文件组织

```text
backend/app/
├── agents/                      # Agent 节点
│   ├── __init__.py              # 导入所有 agent 触发注册
│   ├── registry.py              # register / get_handler
│   ├── orchestrator.py          # 可配置 LangGraph 图构建
│   ├── llm_utils.py             # build_chat_model — 统一 LLM 入口
│   ├── intent_recognition_agent.py
│   ├── market_analysis_agent.py
│   ├── audience_insight_agent.py
│   ├── product_research_agent.py
│   └── ..._agent.py
├── services/                    # 业务编排
│   ├── workflow_service.py
│   ├── workflow_run_service.py
│   └── ..._service.py
├── prompt_templates/            # Jinja2 prompt
│   ├── intent_recognition.md.j2
│   └── ...md.j2
└── schemas/
    ├── common.py                # APIError, APIResponse, ErrorCode
    └── ..._schema.py
```

## 测试

- Agent 测试必须 mock 模型层，不能调用真实 API。
- 推荐 mock `_graph.ainvoke` 或直接调用 `mock_run_*` 函数。
- 测试 `_build_model` 的 provider 分支统一在 `test_llm_utils.py` 覆盖，各 agent 测试不需要重复。
- 覆盖率目标：≥80%。

## 参考

- LangGraph 文档：https://docs.langchain.com/oss/python/langgraph/overview
- [agent-registry.md](./agent-registry.md) — 注册与编排规范
- [prompt-templates.md](./prompt-templates.md) — Prompt 模板规范
- [../api/workflows.yaml](../api/workflows.yaml) — 工作流编排 API 契约
