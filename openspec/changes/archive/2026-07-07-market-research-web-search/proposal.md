## Why

`plan-generation-pipeline` 中的 `market_research` 节点目前是三个调研 agent 里**唯一不联网的**——它通过 7 次串行纯 LLM 调用（define / size / trends / users / competitors / assess / synthesize）凭模型训练知识直接「编」出市场规模、趋势、机会等数据，没有任何网页佐证。

这带来两个问题：

1. **违反数据溯源规则**：`plan-generation-pipeline` 的 spec 要求「数据引用必须来自 mock 或真实 API，LLM 禁止编造」，而 `market_research` 的输出（含数据数值）恰恰是 LLM 凭记忆生成的；`market-analysis` in_scope 约束也写明「数据引用必须来自搜索或 mock」。
2. **拖慢整条流水线**：7 次串行 LLM（每次 6-12s）使 `market_research` 成为三个并行调研 agent 里的木桶短板（~50-100s），用户前端要等 3 分钟。

本变更将 `market_research` 改为「联网搜索 → 并发抓取 → LLM 从真实网页提取」架构，与 `product_research` / `audience_insight` 对齐，让市场数据有真实来源、同时大幅降低耗时。

对应 in_scope ID：`plan-generation`（`market_research` 是该流水线的一个节点）。

## What Changes

- **架构重构**：`market_research` 节点由「7 次串行纯 LLM 生成」改为「搜索（`duckduckgo_search`）→ 并发抓取网页（httpx）→ 单次 LLM 从真实网页提取结构化字段」。
- **调研字段**：保留 `market_definition`（市场边界）、`market_size`（市场规模）、`trends`（趋势）、`opportunities`（机会评估）四个字段组，对齐当前版本调研口径。
- **去掉 `competitors`**：属于 out_scope（`competitor-analysis`），不再调研。
- **去掉 `users`（目标用户）**：与 `audience_insight` 节点重复，改由 `audience_insight` 单独负责。
- **溯源硬约束**：提取 prompt 强制要求每条信息标注来源 URL，网页未提及的字段写 null / 空值，禁止编造数据数值、机构名、品牌名。
- **输出契约不变**：节点最终仍映射为 `MarketResearchOutput`（`market_summary` / `trends` / `opportunities`），下游 `strategy_generation` / `plan_generator` 等零改动。
- **`market_research_agent.py` 自包含**：不再 import `market_analysis_agent` 的 7 个 `call_node_*`；`market_analysis_agent.py` 保持不动，继续服务 `/market-analysis` 独立 API。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `plan-generation-pipeline`：`market_research` 节点的数据来源从「LLM 生成」改为「联网搜索 + 网页提取」，新增「市场数据必须带来源 URL、不得编造」的要求；同时明确该节点不再调研竞品（out_scope）与目标用户（与 `audience_insight` 重复）。

## Non-goals

- **`competitor-analysis`（out_scope）**：本变更明确不调研竞品信息，`market_research` 输出不含 competitors 字段。
- **不动 `market-analysis` capability / `/market-analysis` API / `market_analysis_agent.py`**：这些服务于独立的市场分析端点，有自己的消费者与测试，本次不涉及。
- **不改下游节点**：`strategy_generation`、`plan_generator` 等消费方不变，因为 `MarketResearchOutput` 契约不变。
- **不引入付费数据源**：仅抓取公开网页，遵守 `data_boundaries.cannot_use`（尼尔森/欧睿等第三方付费数据不接入）。

## Mock 数据覆盖说明

`plan-generation-pipeline` spec 要求流水线支持 `USE_MOCK_DATA=true` 的 mock 模式。当前 `market_research` 节点未实现 mock 分支（这是既有缺口）。本次重构将一并补齐：

- **真实模式**（`USE_MOCK_DATA` 未开启）：走联网搜索 → 抓取 → 提取流程。
- **Mock 模式**（`USE_MOCK_DATA=true`）：跳过联网，从 `backend/mock_data/market_research/` 读取预设的结构化市场调研结果（含 `market_summary` / `trends` / `opportunities`），与 `product_research` / `audience_insight` 的 mock 处理一致。预设 mock 文件按品类维度组织，字段值使用真实公开数据，预留切换真实搜索的接口。

## Impact

- **代码**：
  - `backend/app/agents/market_research_agent.py` — 重写 `run_market_research`，去掉对 `market_analysis_agent` 的依赖，改为搜索/抓取/提取三步。
  - `backend/app/prompt_templates/market_research_extract.md.j2` — 新建提取 prompt 模板。
  - `backend/mock_data/market_research/` — 新增 mock 预设数据。
  - `backend/tests/test_agents/test_market_research.py` — 重写，mock `duckduckgo_search` + 提取 LLM，覆盖真实模式与 mock 模式。
- **下游节点**：零改动（输出 schema 不变）。
- **依赖**：复用已存在于 `llm_utils.py` 的 `duckduckgo_search`（前序变更已加入），不引入新依赖。
- **性能**：`market_research` 从 ~50-100s（7 次串行 LLM）降到 ~20-35s（1 次搜索 + 1 次并发抓取 + 1 次提取 LLM），与其他两个调研 agent 同档。
