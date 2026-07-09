## Why

产品调研 Agent（product_research_agent）已具备 ReAct 工具调用能力（Step 2：LLM 自主调用 web_search/web_fetch 补充搜索）。人群洞察 Agent（audience_insight_agent）和市场调研 Agent（market_research_agent）目前仍是线性流程（搜索→抓取→提取），缺少「发现数据不足时自主补充搜索」的能力，导致数据完整性可能不足。

通过统一引入 ReAct 工具调用模式，使三个 Agent 实现一致的 Hybrid 搜索策略。

## What Changes

- **audience_insight_agent.py**: fetch_node 后插入 ReAct 循环（agent_node + tools 节点），最多 3 轮工具调用
- **market_research_agent.py**: 从纯函数式重构为 LangGraph StateGraph，加入 ReAct 循环（agent_node + tools 节点）
- **新增 Prompt 模板**: `audience_insight_react.md.j2`、`market_research_react.md.j2`
- **复用现有共享工具**: `web_search_tool` / `web_fetch_tool`，零新工具

## Capabilities

### New Capabilities
- `market-research`: Pipeline 市场调研 Agent（搜索→抓取→ReAct→提取结构化市场信息，用于方案生成流程）

### Modified Capabilities
- `audience-insight`: 新增 Tool Calling 能力要求——在批量搜索抓取后，LLM 通过 tool calling 自主决定是否需要补充搜索

## Impact

| 项目 | 影响 |
|---|---|
| 后端代码 | `audience_insight_agent.py`（加节点）、`market_research_agent.py`（重构为 LangGraph） |
| Prompt 模板 | 新增 2 个 `.md.j2` 文件 |
| Spec 文件 | 新建 `market-research/spec.md`，修改 `audience-insight/spec.md`（加 Tool Calling 要求） |
| API | 无影响（pipeline 内部节点，无独立端点） |
| 测试 | `tests/test_agents/` 下对应测试文件需更新覆盖 ReAct 路径 |
| 风险 | 低——复用已成熟的工具和模式，并行安全 |
