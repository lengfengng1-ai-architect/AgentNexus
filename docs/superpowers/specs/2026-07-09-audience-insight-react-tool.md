---
name: insight-market-research-react-agent
description: 给人群洞察 Agent 和 市场调研 Agent 添加 ReAct 调研工具调用能力，与产品调研 Agent 模式一致
metadata:
  type: design
---

# 人群洞察 & 市场调研 Agent 增加 ReAct 调研能力 — 设计文档

## 背景

以下两个 Agent 目前都是线性流程，缺少「发现数据不足时自主补充搜索」的能力：

| Agent | 当前流程 | 文件 |
|---|---|---|
| 人群洞察 | `search → fetch → extract_audience → generate_persona` | `audience_insight_agent.py` |
| 市场调研 | `_search → _fetch → _extract` | `market_research_agent.py` |

产品调研 Agent（`product_research_agent.py`）已有成熟的 ReAct 工具调用模式（Step 2），通过 `web_search_tool`/`web_fetch_tool` 让 LLM 自主决定补充搜索，最多 3 轮。

## 目标

在两个 Agent 的 `fetch` 之后、`extract` 之前，分别插入 ReAct 循环，使 LLM 能在提取结构化数据前自主补充搜索和抓取，提高数据完整性。

## 设计方案

### 改动文件

| 文件 | 操作 |
|---|---|
| `backend/app/agents/audience_insight_agent.py` | 修改：增加 ReAct 节点和工具节点 |
| `backend/app/agents/market_research_agent.py` | 修改：增加 ReAct 节点和工具节点 |
| `backend/app/prompt_templates/audience_insight_react.md.j2` | 新增：人群洞察 ReAct 系统提示模板 |
| `backend/app/prompt_templates/market_research_react.md.j2` | 新增：市场调研 ReAct 系统提示模板 |

### 人群洞察 Agent 改动

**流程图变化：**
```
改造前: search → fetch → extract_audience → generate_persona
改造后: search → fetch → agent ↔ tools (最多3轮) → extract_audience → generate_persona
```

**State 新增字段：**
```python
# 新增 ReAct 相关
messages: Annotated[list, add_messages] = Field(default_factory=list)
tool_call_count: int = 0
```

### 市场调研 Agent 改动

**流程图变化：**
```
改造前: _search → _fetch → _extract（纯函数式）
改造后: search_node → fetch_node → agent ↔ tools (最多3轮) → extract_node（LangGraph 子图）
```

**改动要点：**
- 当前是纯函数式设计（`_search`、`_fetch`、`_extract`），入口在 `run_market_research`
- 改为 LangGraph StateGraph，与产品调研/人群洞察一致：
  - 定义 `State` 类，包含 `search_results`、`fetched_pages`、`messages`、`tool_call_count`、`output`
  - 把 `_search` → `search_node`，`_fetch` → `fetch_node`，`_extract` → `extract_node`
  - 新增 `agent_node` + `tools` 节点 + `_route_after_agent` 条件路由
  - `run_market_research` 改为 `_graph.ainvoke()`
- 变更量约 +80 行，但三个 Agent 实现模式完全统一

### 共享工具

两个 Agent 都复用 `app/agents/tools/__init__.py` 的 `web_search_tool`/`web_fetch_tool`，零新工具。

### 关键设计决策

| 决策点 | 选择 | 原因 |
|---|---|---|
| 零新工具 | 复用 `web_search_tool`/`web_fetch_tool` | 产品调研已实现成熟，功能完全匹配 |
| 循环轮次 | 最多 3 轮 | 与产品调研一致，防止无限循环 |
| 人群洞察实现 | LangGraph 子图 | 已有 StateGraph 架构，直接加节点 |
| 市场调研实现 | **LangGraph 子图**（从函数式重构为图） | 三个 Agent 统一模式，维护一致性 |
| 并行安全 | 无额外改动 | 三个 agent 各自独立，工具是 async 无状态函数 |

### 边界情况处理

- 搜索无结果 → ReAct 自动跳过，进入 extract
- 工具调用失败 → ToolNode 异常被 langgraph 捕获，agent 继续
- 0 轮工具调用 → agent 可直接返回，不走 tools 节点
