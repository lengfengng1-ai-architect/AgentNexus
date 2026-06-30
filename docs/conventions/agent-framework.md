# Agent 框架规范

> 本文件定义本项目 Agent 实现必须使用的技术栈和代码模式。
> 所有新增或重构的 Agent 功能必须遵守本文档。

## 强制技术栈

- **Agent 编排：LangGraph**（`langgraph>=1.0`）
- **Agent 抽象：DeepAgents**（`deepagents>=0.6`）
- **模型初始化：`langchain.chat_models.init_chat_model`**
- **依赖管理：uv**

禁止使用其他 Agent 框架，或在 LangGraph/DeepAgents 之外手写 ReAct/Plan-and-Execute 等循环。

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

## 模型配置

阿里百炼（DashScope）模型通过环境变量配置：

```bash
DASHSCOPE_API_KEY=sk-xxx
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_MODEL=qwen-turbo        # 默认模型
```

`backend/app/config/settings.py` 必须暴露：

```python
dashscope_api_key: str
dashscope_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
dashscope_model: str = "qwen-turbo"
```

模型初始化方式：

```python
from langchain.chat_models import init_chat_model
from app.config.settings import settings

model = init_chat_model(
    model=settings.dashscope_model,
    model_provider="openai",
    api_key=settings.dashscope_api_key,
    base_url=settings.dashscope_base_url,
)
```

## DeepAgents 使用模式

### 1. 优先使用 `create_deep_agent`

```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    model=model,                       # init_chat_model 实例 或 "openai:qwen-turbo"
    system_prompt="你是...",
    tools=[search_events, query_city],
)

result = await agent.ainvoke({"messages": [{"role": "user", "content": message}]})
```

### 2. 结构化输出

需要稳定 schema 时，使用 Pydantic `response_format`：

```python
from pydantic import BaseModel, Field

class BrandInput(BaseModel):
    brand_name: str | None = Field(None, description="品牌名称")
    category: str | None = Field(None, description="品类")
    city: str | None = Field(None, description="目标城市")

class ChatOutput(BaseModel):
    reply: str = Field(..., description="AI 回复")
    brand_input: BrandInput = Field(default_factory=BrandInput)
    is_complete: bool = Field(False, description="字段是否完整")

agent = create_deep_agent(
    model=model,
    system_prompt="...",
    response_format=ChatOutput,
)
```

### 3. LangGraph 底层图（仅在 DeepAgents 不够时使用）

```python
from langgraph.graph import StateGraph, MessagesState, START, END

def extract_node(state: MessagesState) -> MessagesState:
    ...

graph = StateGraph(MessagesState)
graph.add_node("extract", extract_node)
graph.add_edge(START, "extract")
graph.add_edge("extract", END)
graph = graph.compile()
```

- 优先使用 `MessagesState` 或其他预定义状态，避免 `TypedDict(total=False)`。
- 节点函数必须返回完整的状态更新字典，不要直接修改输入 state。

## 禁止的旧模式

以下写法视为违规，重构时必须移除：

| 禁止模式 | 原因 | 替代 |
|----------|------|------|
| `from langchain_community.chat_models import ChatTongyi` | 社区版接口已过时，版本兼容性差 | `init_chat_model` + `langchain-openai` |
| `StateGraph(TypedDict, total=False)` | 状态定义松散，缺少 IDE/类型校验 | `MessagesState` 或显式 Pydantic/TypedDict（`total=True`） |
| 手写 markdown code block 剥离逻辑 | 应通过 `response_format` 或 tool calling 约束输出 | `response_format=BaseModel` |
| 在 router/service 中创建长生命周期 LLM client | 配置变更不可测试，难以 mock | 在 `agents/` 模块内构建，service 仅调用封装函数 |
| 字符串拼接 prompt | 不可维护，难以测试 | Jinja2 模板（见 `docs/conventions/prompt-templates.md`） |

## 文件组织

```text
backend/app/
├── agents/                      # Agent 封装
│   ├── __init__.py
│   └── chat_extraction_agent.py # 一个 Agent 一个文件
├── services/                    # 业务编排
│   └── chat_service.py
├── prompt_templates/            # Jinja2 prompt
│   └── chat_extraction.md.j2
└── schemas/
    └── chat.py                  # response_format 用的 Pydantic model
```

- `agents/` 只负责把业务输入转成 Agent 调用，返回 Pydantic schema。
- `services/` 负责编排：读取 mock、调用 Agent、后处理。
- `routers/` 只做 HTTP 校验和转发。

## 测试

- Agent 测试必须 mock 模型层，不能调用真实 API。
- 推荐 mock `init_chat_model` 或 `create_deep_agent` 返回的对象，断言输出 schema。
- 使用 `response_format` 时，mock 返回符合 schema 的字典即可。

```python
@pytest.fixture
def mock_agent():
    with patch("app.agents.chat_extraction_agent.create_deep_agent") as m:
        yield m

async def test_extract__complete__returns_schema(mock_agent):
    mock_agent.return_value.ainvoke.return_value = {
        "structured_response": ChatOutput(...)
    }
    ...
```

## 迁移路径

当前 `chat_extraction_agent.py` 使用旧版 `ChatTongyi` + 手写 JSON 剥离，属于待迁移代码。新功能直接按本文档实现；老代码在后续迭代中逐步替换为 `create_deep_agent` + `response_format`。

## 参考

- LangGraph 文档：https://docs.langchain.com/oss/python/langgraph/overview
- DeepAgents 文档：https://docs.langchain.com/oss/python/deepagents/overview
- DeepAgents Customization：https://docs.langchain.com/oss/python/deepagents/customization
