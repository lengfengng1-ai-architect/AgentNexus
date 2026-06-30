# Agent 框架规范

> 本文件定义本项目 Agent 实现必须使用的技术栈和代码模式。
> 所有新增或重构的 Agent 功能必须遵守本文档。

## 强制技术栈

- **Agent 编排：LangGraph**（`langgraph>=1.0`）——所有状态流转、节点编排、持久化/流式/人机协同的载体
- **Agent 能力增强：DeepAgents**（`deepagents>=0.6`）——在 LangGraph 之上按需使用，提供 task planning、filesystem、subagents、human-in-the-loop 等能力
- **模型初始化：`langchain.chat_models.init_chat_model`**
- **依赖管理：uv**

禁止引入其他 Agent 框架，或在 LangGraph 之外手写完整的 ReAct/Plan-and-Execute 等循环。

## 架构分层

```text
┌─────────────────────────────────────────┐
│  Application / Router / Service         │
├─────────────────────────────────────────┤
│  LangGraph 编排层                        │  ← 必须：StateGraph / nodes / edges
│  - 状态定义                               │
│  - 节点实现                               │
│  - 边与条件跳转                           │
│  - 持久化 / 人机协同 / 流式               │
├─────────────────────────────────────────┤
│  DeepAgents 能力层（可选）                │  ← 按需：tool planning、subagents、memory
│  - create_deep_agent                     │
│  - response_format / tools / subagents   │
│  - filesystem / human-in-the-loop        │
├─────────────────────────────────────────┤
│  LangChain 模型层                        │  ← 必须：init_chat_model + provider adapter
│  - with_structured_output                │
│  - tool binding                          │
└─────────────────────────────────────────┘
```

**核心原则：**
- LangGraph 是底板，所有 Agent 都要编译成图（`StateGraph(...).compile()`）。
- DeepAgents 是可选加速器：当节点需要内置的 task planning、subagent 委派、虚拟文件系统、人机协同时，才在该节点内部调用 `create_deep_agent`。
- 不要把整个 Agent 逻辑都塞进 `create_deep_agent` 一句话；图的入口、状态、边由 LangGraph 控制。

## 版本约束

```toml
[project]
dependencies = [
    "fastapi>=0.111",
    "uvicorn[standard]>=0.30",
    "pydantic>=2.7",
    "pydantic-settings>=2.3",
    "langgraph>=1.0",
    "deepagents>=0.6",
    "langchain>=1.0",
    "langchain-openai>=1.3",
    "jinja2>=3.1",
]
```

- `langchain-community` 仅作为过渡兼容，新代码不得从 `langchain_community` 引入 chat model。
- Tongyi/Qwen 统一通过 `langchain-openai` + DashScope OpenAI-compatible API 调用，不再使用 `ChatTongyi`。
- Agnes 同样通过 `langchain-openai` + Agnes OpenAI-compatible API 调用。

## 模型配置

`backend/app/config/settings.py` 必须暴露多 provider 配置：

```python
llm_provider: str = "dashscope"  # dashscope | agnes

dashscope_api_key: str = ""
dashscope_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
dashscope_model: str = "qwen-turbo"

agnes_api_key: str = ""
agnes_base_url: str = "https://apihub.agnes-ai.com/v1"
agnes_model: str = "agnes-2.0-flash"
```

模型初始化方式：

```python
from langchain.chat_models import init_chat_model
from app.config.settings import settings

def _build_model():
    if settings.llm_provider == "agnes":
        return init_chat_model(
            model=settings.agnes_model,
            model_provider="openai",
            api_key=settings.agnes_api_key,
            base_url=settings.agnes_base_url,
        )
    return init_chat_model(
        model=settings.dashscope_model,
        model_provider="openai",
        api_key=settings.dashscope_api_key,
        base_url=settings.dashscope_base_url,
    )
```

## LangGraph 编排层（必须使用）

每个 Agent 必须是一个编译后的图：

```python
from langgraph.graph import END, StateGraph
from pydantic import BaseModel

class ChatState(BaseModel):
    message: str
    output: ChatOutput | None = None

def extract_node(state: ChatState) -> dict:
    llm = _build_model().with_structured_output(ChatOutput)
    result = llm.invoke([...])
    return {"output": result}

graph = StateGraph(ChatState)
graph.add_node("extract", extract_node)
graph.set_entry_point("extract")
graph.add_edge("extract", END)
graph = graph.compile()
```

- 优先使用 Pydantic `BaseModel` 或 `MessagesState` 定义状态，避免 `TypedDict(total=False)`。
- 节点函数必须返回状态更新字典，禁止直接修改输入 state。
- 状态中的 LLM 调用结果必须是可序列化的 Pydantic model，便于测试和持久化。

## DeepAgents 能力层（按需使用）

### 什么时候用 DeepAgents

在 LangGraph 的某个节点里，当你需要以下能力时：

- 自动任务规划（todo list）
- 虚拟文件系统读写
- 子 Agent 委派
- 人机协同（`interrupt_on`）
- 已经验证兼容的 provider 的 `response_format`

### 怎么用

DeepAgents 作为节点内部实现：

```python
from deepagents import create_deep_agent

def planning_node(state: PlanState) -> dict:
    agent = create_deep_agent(
        model=_build_model(),
        system_prompt="...",
        tools=[search_events, query_city],
    )
    result = agent.ainvoke({"messages": [{"role": "user", "content": state["message"]}]})
    return {"plan": result["messages"][-1].content}
```

### 结构化输出选型

| 场景 | 推荐方式 | 说明 |
|------|---------|------|
| 简单字段提取，多 provider 兼容 | `model.with_structured_output(Schema)` + LangGraph 节点 | 当前 chat extraction 使用此方式 |
| 需要 DeepAgents 内置能力 + 单 provider 验证通过 | `create_deep_agent(..., response_format=Schema)` | 需确认 provider 支持其内部实现 |
| 复杂多步 + 工具 + 人机协同 | `create_deep_agent` 作为子图节点 | 保留 LangGraph 外层编排 |

**注意：** `create_deep_agent(..., response_format=...)` 内部可能通过 tool calling 实现结构化输出。不同 provider（如 Agnes）对 tool calling 的支持程度不同，使用前必须验证。若 provider 不兼容，优先回退到 `model.with_structured_output(Schema)`。

## 禁止的旧模式

以下写法视为违规，重构时必须移除：

| 禁止模式 | 原因 | 替代 |
|----------|------|------|
| `from langchain_community.chat_models import ChatTongyi` | 社区版接口已过时，版本兼容性差 | `init_chat_model` + `langchain-openai` |
| `StateGraph(TypedDict, total=False)` | 状态定义松散，缺少 IDE/类型校验 | Pydantic `BaseModel` 或 `MessagesState` |
| 手写 markdown code block 剥离逻辑 | 应通过结构化输出约束 | `model.with_structured_output(Schema)` |
| 在 router/service 中创建长生命周期 LLM client | 配置变更不可测试，难以 mock | 在 `agents/` 模块内构建，service 仅调用封装函数 |
| 字符串拼接 prompt | 不可维护，难以测试 | Jinja2 模板（见 `docs/conventions/prompt-templates.md`） |
| 直接 `create_deep_agent` 一句话替代整个图 | 丢失 LangGraph 的编排、状态、持久化能力 | LangGraph 图 + DeepAgents 作为节点能力 |

## 文件组织

```text
backend/app/
├── agents/                      # Agent 封装：LangGraph 图 + 节点
│   ├── __init__.py
│   └── chat_extraction_agent.py # 一个 Agent 一个文件
├── services/                    # 业务编排
│   └── chat_service.py
├── prompt_templates/            # Jinja2 prompt
│   └── chat_extraction.md.j2
└── schemas/
    └── chat.py                  # 结构化输出用的 Pydantic model
```

- `agents/` 只负责把业务输入转成图调用，返回 Pydantic schema。
- `services/` 负责编排：读取 mock、调用 Agent、后处理。
- `routers/` 只做 HTTP 校验和转发。

## 测试

- Agent 测试必须 mock 模型层，不能调用真实 API。
- 推荐 mock 图的入口（如 `_graph.ainvoke`）或具体节点函数，断言输出 schema。
- 多 provider 支持必须分别测试 `_build_model` 的分支。

```python
@pytest.fixture
def mock_graph():
    with patch("app.agents.chat_extraction_agent._graph") as m:
        m.ainvoke = AsyncMock()
        yield m
```

## 参考

- LangGraph 文档：https://docs.langchain.com/oss/python/langgraph/overview
- DeepAgents 文档：https://docs.langchain.com/oss/python/deepagents/overview
- DeepAgents Customization：https://docs.langchain.com/oss/python/deepagents/customization
