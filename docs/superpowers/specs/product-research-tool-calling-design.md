# product_research 改造为 Tool Calling 模式 — Design Doc

## 背景

当前 `product_research_agent.py` 使用一个硬编码的内部 LangGraph 流程：

```
search_node → fetch_node → extract_node → enrich_website_node
```

这个流程是确定性的、不可变的。LLM 只在 `extract_node` 中被调用一次（`with_structured_output`），只负责"理解已有页面 → 输出 JSON"这一件事。

**问题：**
- 搜索和抓取逻辑硬编码在 agent 内部，无法被其他 agent 复用
- LLM 只能看到上游已抓好的页面，不能自主决定"还需要查什么"
- 如果要扩展（比如查更多关键词、查竞品页面），必须改 DAG 结构
- `enrich_website_node` 独自做二次搜索，逻辑分散

## 改造目标

让 LLM **自主编排**搜索、抓取、分析的过程：

```
旧：  search → fetch → extract → enrich_website  (写死)
新：  LLM 自主选择: search? fetch? enrich? → 最终结构化输出
```

## 设计方案

### 核心思路：Tool Calling + 循环

用 LangGraph 的 `ToolNode` + `bind_tools` 实现 **ReAct 风格循环**：

```
┌──────────────────────────────────────────────────────────┐
│                      agent 循环                            │
│                                                           │
│  1. system prompt + tools → LLM                           │
│  2. LLM 选择：                                            │
│     ├→ 调 web_search(query) → 拿到 URL                    │
│     ├→ 调 web_fetch(url) → 拿到页面内容                    │
│     └→ 输出最终 ProductResearchResult → 结束              │
│                                                           │
│  3. 如果调了 tool → 结果注入 → 回到步骤 1                 │
└──────────────────────────────────────────────────────────┘
```

### 定义的工具（Tools/Skills）

| Tool 名称 | 输入 | 输出 | 用途 |
|-----------|------|------|------|
| `web_search` | query: str, max_results: int | URL 列表 | 搜索产品信息 |
| `web_fetch` | url: str | 页面文本内容 | 抓取网页内容 |

这两个 tool 是从现有 `search_node` 和 `fetch_node` 中提取出来的。

### Agent 流程

```
State:
  product_name: str
  messages: list[BaseMessage]  ← LangGraph 标准消息列表
  output: ProductResearchResult | None

流程：
  1. agent_node (LLM + bind_tools[web_search, web_fetch])
     → 返回 AIMessage（可能含 tool_calls）
     
  2. if has tool_calls → tools_node (ToolNode)
     → 执行 tool → 返回 ToolMessage → 回到 agent_node
     
  3. if no tool_calls → 解析 AIMessage 为 ProductResearchResult
     → 结束
```

### 和现有代码的关系

#### 保持不动
- `run_product_research()` — pipeline 入口 handler，interface 不变
- `ProductResearchResult` schema — 输出结构不变
- `_save_to_cache()` — 缓存逻辑不变
- `run_product_research()` 中的 retry 逻辑不变
- `register("product_research", run_product_research)` 不变

#### 提取为工具
- `search_node` 的逻辑 → `web_search` tool
- `fetch_node` 的逻辑 → `web_fetch` tool  
- `_build_model()` → `build_chat_model()`（用已有的）

#### 移除
- 内部 `ProductResearchState` — 被 LangGraph 的标准 messages 替代
- `_build_graph()` — 不再需要内部 DAG
- `_domain_priority()` — 由 LLM 自己判断
- `extract_node` — 合并到 agent 循环的最后一步
- `enrich_website_node` — LLM 可以自主选择补充官网搜索

### 文件结构

```
backend/app/agents/
├── tools/
│   ├── __init__.py
│   ├── web_search.py     # web_search tool
│   └── web_fetch.py      # web_fetch tool
├── product_research_agent.py   # 改造后：tool calling 版
└── llm_utils.py                 # 视情况增加 bind_tools helper
```

或更简单（压缩）：

```
backend/app/agents/
├── research_tools.py     # web_search, web_fetch 两个 tool
├── product_research_agent.py   # 改造后版本
└── llm_utils.py                 # 增加 invoke_with_tools helper
```

**推荐后者**，减少文件数，且 tools 可以方便地被其他 agent import。

### 关键代码结构（草稿）

```python
# research_tools.py
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

class WebSearchInput(BaseModel):
    query: str = Field(description="搜索关键词")
    max_results: int = Field(default=8, description="返回结果数")

class WebSearchTool(BaseTool):
    name: str = "web_search"
    description: str = "搜索网页，返回标题和摘要列表。用于查找产品信息、官网、评测等。"
    args_schema: type = WebSearchInput
    
    async def _arun(self, query: str, max_results: int = 8) -> str:
        # 复用 searxng_search
        ...

class WebFetchInput(BaseModel):
    url: str = Field(description="要抓取的页面 URL")

class WebFetchTool(BaseTool):
    name: str = "web_fetch"
    description: str = "抓取指定 URL 的网页内容，返回纯文本。"
    args_schema: type = WebFetchInput
    
    async def _arun(self, url: str) -> str:
        # 复用 fetch_one 的逻辑
        ...


# product_research_agent.py (改造后)
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.graph.message import add_messages
from typing import Annotated, Sequence, Literal
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

class AgentState(TypedDict):
    product_name: str
    messages: Annotated[Sequence[BaseMessage], add_messages]
    output: ProductResearchResult | None

# ReAct 循环：agent_node → tools_node → agent_node → ... → output
def _build_graph():
    tools = [WebSearchTool(), WebFetchTool()]
    tool_node = ToolNode(tools)
    model = build_chat_model().bind_tools(tools)
    
    async def agent_node(state: AgentState):
        prompt = _build_prompt(state["product_name"])
        response = await model.ainvoke([
            SystemMessage(content=prompt),
            *state["messages"]
        ])
        return {"messages": [response]}
    
    async def tools_node(state: AgentState):
        result = await tool_node.ainvoke(state)
        return {"messages": result}
    
    def should_continue(state: AgentState) -> Literal["tools", "finalize"]:
        last = state["messages"][-1]
        if hasattr(last, "tool_calls") and last.tool_calls:
            return "tools"
        return "finalize"
    
    async def finalize_node(state: AgentState) -> dict:
        # 用 with_structured_output 解析最终结果
        ...
    
    graph = StateGraph(AgentState)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", tools_node)
    graph.add_node("finalize", finalize_node)
    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_continue, {...})
    graph.add_edge("tools", "agent")
    graph.add_edge("finalize", END)
    return graph.compile()
```

### 迁移策略

1. 把 `research_tools.py` 作为新文件先创建
2. 改造 `product_research_agent.py` —— 内部 DAG 替换为 ReAct 循环
3. `run_product_research()` 入口保持兼容
4. 测试：先跑通 mock 模式，再跑通真实搜索

### 风险与注意事项

- **Token 消耗增加**：LLM 多轮调用比一次固定调用耗 token。但换来的是搜索质量提升。
- **响应时间**：多轮 tool calling 增加延迟。建议控制 max_iterations。
- **输出稳定性**：LLM 自主搜索可能漏关键页面。现有流程是 search→fetch→extract 保证覆盖 top N 页面。需要对比测试确保质量不降。
- **ponytail**: 不引入 AgentExecutor 等框架依赖，用 LangGraph 已有的 ToolNode 实现循环即可。

## 接口契约

### 输入（不变）
```python
# run_product_research(state: dict)
{
    "brand_name": "小米",
    # 可选
    "_exclude_urls": ["https://..."],
}
```

### 输出（不变）
```python
ProductResearchResult  # 五大模块
```

### 新增 tool 的 LangChain tool schema
两个同步函数 wrapped 为 async tool，schema 由 Pydantic 自动生成，LangChain 自动转给 LLM。
