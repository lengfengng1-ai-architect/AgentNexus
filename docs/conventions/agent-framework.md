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
│  StateGraph Pipeline                    │  ← services/plan_generation_service.py
│  - LangGraph StateGraph + compile()     │    代码定义节点和边
│  - 直接调 get_handler(agent_name)      │
├─────────────────────────────────────────┤
│  Registry                               │  ← registry.py
│  - register("name", handler)            │    可插拔注册
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
- 方案生成 pipeline 用 `StateGraph` 在代码中直接定义，不经过 YAML 配置层。
- 真实 Agent 文件**禁止包含任何 mock 代码**（`use_mock_data`、`_MOCK_PATH`、`_load_mock`）。
- `llm_utils.build_chat_model()` 是唯一的模型构建入口，所有 agent 禁止自己写 `_build_model()`。

### Mock Agent

Mock Agent 文件以 `mock_` 开头，通过 `register()` 注册（名称前缀 `mock_`）：

```python
# backend/app/agents/mock_intent_recognition_agent.py
from app.agents.registry import register

register("mock_intent_recognition", mock_run_intent_recognition)
```

通过 YAML 或代码中显式引用 `agent: mock_intent_recognition` 来使用。

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

Mock handler：

```python
# backend/app/agents/mock_intent_recognition_agent.py（独立文件）
from app.agents.registry import register

register("mock_intent_recognition", mock_run_intent_recognition)
```

## 方案生成 Pipeline

方案生成使用 LangGraph `StateGraph` 在代码中直接定义，不经过 YAML 配置层。官网推荐方式：`StateGraph` + `TypedDict` + `add_node/edge` → `compile()`。

### 并行→汇总示例（官网推荐模式）

```python
from langgraph.graph import StateGraph, END, START
from typing import TypedDict


class ResearchState(TypedDict):
    web_result: str
    news_result: str
    summary: str


async def search_web(state: ResearchState) -> dict:
    return {"web_result": "web data"}


async def search_news(state: ResearchState) -> dict:
    return {"news_result": "news data"}


async def summarize(state: ResearchState) -> dict:
    combined = f"{state['web_result']} + {state['news_result']}"
    return {"summary": combined}


graph = StateGraph(ResearchState)
graph.add_node("web", search_web)
graph.add_node("news", search_news)
graph.add_node("summary", summarize)

# 两个并行入口（web 和 news 同时执行）
graph.add_edge(START, "web")
graph.add_edge(START, "news")
# 两个都完成后才执行 summarize
graph.add_edge("web", "summary")
graph.add_edge("news", "summary")
graph.add_edge("summary", END)

pipeline = graph.compile()
result = await pipeline.ainvoke({
    "web_result": "", "news_result": "", "summary": ""
})
```

`web` 和 `news` 通过 `START` 同时出发，LangGraph 自动并行执行。两者都完成后，`summary` 节点（fan-in）拿到 `state["web_result"]` 和 `state["news_result"]`。

对应本项目的例子，方案生成 pipeline 中 `product_research` 和 `market_research` 在理论上也可以并行（无依赖关系），但因为依赖数据同步等实际约束，当前采用串行。

参考实现：`backend/app/services/plan_generation_service.py`。
result = await pipeline.ainvoke({"brand_input": {...}})
```

代码即配置——每步可视、可打断点。参考 `backend/app/services/plan_generation_service.py`。

## 注册与路由

两个入口级路由：
- **聊天**：`GET /api/v1/chat/stream` → `stream_intent_recognition()` → 意图分类后路由到各 agent
- **方案生成**：`GET /api/v1/plan/run` → `plan_generation_service.run_stream()` → StateGraph 串行调 10 个 agent

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
