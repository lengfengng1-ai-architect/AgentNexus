## Context

当前 `product_research_agent.py` 使用固定 DAG 结构：

```
search_node(3关键词并行) → fetch_node(并发抓取 top 25) → extract_node(with_structured_output) → enrich_website_node → END
```

这个流程的问题是：
1. LLM 只参与一次结构化输出，不能自主决定搜索策略
2. search/fetch 逻辑与其他 agent（market_research、audience_insight）高度重复（3 份独立拷贝）
3. 如果要扩展搜索策略，必须改 DAG 结构

同时 `market_research_agent.py`、`audience_insight_agent.py` 的 search/fetch 函数是几乎一样的代码，只是常量值略有不同。

## Goals / Non-Goals

**Goals:**
- 提取 `web_search` / `web_fetch` 为独立的 LangChain BaseTool，放在 `backend/app/agents/tools/` 目录，可被所有 agent import 复用
- 将 `product_research_agent.py` 改为 Hybrid 模式：保留批量并行搜索抓取作为 Step 1，增加 ReAct 循环（带 tool calling）作为 Step 2 供 LLM 自主查漏补缺
- 保持 `run_product_research()` handler 的接口和返回值不变
- 保持 `ProductResearchResult` schema 不变

**Non-Goals:**
- 不改其他 agent（market_research、audience_insight）—— 它们后续可以复用 tools，但本次不改造
- 不改 `plan_generation_service.py` 编排层
- 不引入新的外部依赖（复用已有 LangChain tool calling 能力）
- 不涉及前端改动

## Decisions

### Decision 1: Hybrid 架构（批量搜索抓取 + ReAct 循环）

选择 Hybrid 而非纯 ReAct 的原因：

| 维度 | 纯 ReAct | Hybrid（选择） |
|------|----------|----------------|
| 搜索覆盖 | LLM 逐次搜索，可能漏覆盖 | 先批量搜索 top 25 页覆盖广度 |
| 响应速度 | 多轮 tool calling + LLM 推理 | 一次批量抓取 + LLM 只做查漏补缺 |
| 质量风险 | LLM 可能搜得太窄/漏关键页 | 先暴力覆盖，再让 LLM 补 |
| 代码改动 | 改动更大，需重写搜索策略 | 复用现有 search/fetch，增量加 ReAct |

### Decision 2: Tool 放在 `backend/app/agents/tools/` 目录

```
backend/app/agents/tools/
├── __init__.py       # 导出 web_search_tool, web_fetch_tool
├── web_search.py     # web_search tool
└── web_fetch.py      # web_fetch tool
```

- 每个 tool 一个文件，命名清晰
- 被 `__init__.py` 统一导出，其他 agent 可以 `from app.agents.tools import web_search_tool`
- 未来可以在此目录加更多 tool

### Decision 3: Tool 输出格式为纯文本字符串

LangChain tool calling 中，tool 的返回值会作为 `ToolMessage.content` 传回给 LLM。

- `web_search` 返回格式化的搜索结果文本（标题 + URL + 摘要）
- `web_fetch` 返回纯文本页面内容

这样 LLM 可以直接阅读，不需要额外解析步骤。

### Decision 4: Step 2 ReAct 循环使用 `with_structured_output` 作为最终输出

ReAct 循环走完后，进入 finalize_node，用 `with_structured_output(ProductResearchResult)` 做最终结构化输出。

这样：
- 和现有的 `extract_node` 一样的 schema 保障
- 同样的 `_fill_sourced_fields` 溯源逻辑复用
- 不改 `ProductResearchResult`

### Decision 5: 最大 Tool Calling 轮次设为 3

限制 ReAct 循环中 LLM 最多调 3 轮 tool。3 轮不够时，用已有的批量数据做结构化输出。

这样防止：
- 无限循环（LLM 反复搜索）
- 响应时间过长
- Token 消耗失控

### Decision 6: prompt 模板调整但不重写

现有 `product_research.md.j2` 的重心是给定页面列表做提取。改造后需要：

- Step 2 的 agent prompt 中包含 `initial_pages` 内容作为上下文
- 告知 LLM 有 `web_search` / `web_fetch` 可用
- 如果已有内容足够 → 不调 tool → 直接输出
- 给 LLM 明确的"信息足够了就输出"指令

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| [质量] ReAct 循环中 LLM 过多搜索，响应延迟 | 最大 3 轮 tool calling，超限自动 fallback 到已有数据 |
| [输出] LLM 跳过 search/fetch 直接输出空结果 | Step 1 的批量页面强制注入 prompt，LLM 总有数据可用 |
| [兼容] 图结构改变导致现有测试 fail | 测试 mock 路径从 `_graph` 改为新的 graph 引用名，测试逻辑不变 |
| [Token] ReAct 循环消耗更多 token | 仅在批量抓取后运行 ReAct；3 轮上限控制 |
| [工具] tool 输出太长超过 LLM context | `MAX_PAGE_CHARS=4000` 保持，LLM 只读到需要的部分 |

## Migration Plan

1. 新建 `backend/app/agents/tools/__init__.py` + `web_search.py` + `web_fetch.py`
2. 从 `product_research_agent.py` 的 `search_node`/`fetch_node` 提取核心逻辑到 tool；保留原有函数签名（不改已有代码调用方）
3. 写 `product_research_agent.py` 的新版（Hybrid 模式）
4. 调整 `product_research.md.j2` prompt 模板
5. 更新测试文件，确保 mock 路径正确
6. 运行现有测试集验证兼容性
