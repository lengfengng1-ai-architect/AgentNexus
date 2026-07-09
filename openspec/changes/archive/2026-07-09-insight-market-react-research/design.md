## Context

产品调研 Agent（product_research_agent.py）已实现 Hybrid 搜索策略（Step 1 批量搜索抓取 + Step 2 ReAct 工具调用循环），通过 `web_search_tool`/`web_fetch_tool` 让 LLM 自主决定补充搜索，最多 3 轮。

人群洞察 Agent（audience_insight_agent.py）和市场调研 Agent（market_research_agent.py）目前仍是线性流程，缺少自主补充搜索的能力。两者当前架构不同：

| Agent | 当前架构 | 文件 |
|---|---|---|
| 人群洞察 | LangGraph StateGraph（4 节点线性） | `audience_insight_agent.py` |
| 市场调研 | 纯函数式（3 个 async 函数顺序调） | `market_research_agent.py` |

约束：代码生成后，三个 Agent 作为 `plan_generation_service.py` 的并行节点同时工作，必须保持并行安全（无共享状态、无全局锁）。

## Goals / Non-Goals

**Goals:**
- 人群洞察 Agent 的 `fetch_node` 后插入 ReAct 循环（agent_node + tools 节点），最多 3 轮
- 市场调研 Agent 从函数式重构为 LangGraph StateGraph，加入 ReAct 循环
- 复用 `web_search_tool`/`web_fetch_tool`，零新工具
- 三个 Agent 实现模式统一：都是 LangGraph 子图 + ReAct 循环

**Non-Goals:**
- 不新增独立 API 端点（pipeline 内部节点变化）
- 不修改 `product_research_agent.py` 已有逻辑
- 不修改 pipeline 编排层 `plan_generation_service.py`

## Decisions

### Decision 1：市场调研 Agent 重构为 LangGraph StateGraph

**选择**：将 `market_research_agent.py` 的纯函数式（`_search`/`_fetch`/`_extract`）改为 LangGraph StateGraph

**理由**：
- 三个并行 Agent 统一模式，降低维护成本
- ReAct 循环与 LangGraph 的条件路由天然适配
- 产品调研和人群洞察已是 StateGraph，一致性收益大于重构成本

**具体方案**：
```
改造前: _search → _fetch → _extract（函数式）
改造后: search_node → fetch_node → agent ↔ tools (最多3轮) → extract_node（StateGraph）
```

### Decision 2：ReAct 循环配置一致

**选择**：与产品调研一致，绑定 `web_search_tool`/`web_fetch_tool`，最多 3 轮

**理由**：产品调研已验证该配置稳定有效。3 轮限制在大多数场景下足够 LLM 补充完信息，且防止无限循环。

### Decision 3：共享工具复用

**选择**：复用 `app/agents/tools/__init__.py` 导出的 `web_search_tool`/`web_fetch_tool`

**理由**：
- 工具是无状态 async 函数，三个 Agent 并行调用互不阻塞
- 无需新工具，无需新依赖
- 后续如果工具需要改造（如换搜索引擎），只改一处

### Decision 4：人群洞察 State 不改现有字段类型

**选择**：State 新增 `messages` 和 `tool_call_count` 字段，不改现有 `search_results`/`fetched_pages` 等字段

**理由**：最小侵入。ReAct 循环新增的内容合并回已有的 `fetched_pages` 列表，`extract_audience_node` 无需改动即可消费更多数据。

### Decision 5：市场调研 Prompt 模板位置

**选择**：新增 `market_research_react.md.j2` 放在 `app/prompt_templates/`

**理由**：与产品调研的 `product_research.md.j2`、人群洞察的 `audience_insight.md.j2` 同级，保持 Prompt 模板目录结构一致。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|---|---|
| 市场调研重构可能引入回归 —— 当前函数式逻辑已稳定 | 保留 `_search`/`_fetch`/`_extract` 原函数作为内部实现，StateGraph 节点直接调用，不改核心提取逻辑 |
| ReAct 循环可能增加 LLM 调用次数和延迟 | 最多 3 轮，且 LLM 信息充足时可不调工具直接返回 |
| `_extract` 中原有的 mock 模式兼容 | mock 模式在 `run_market_research` 入口处拦截，不走 StateGraph |
