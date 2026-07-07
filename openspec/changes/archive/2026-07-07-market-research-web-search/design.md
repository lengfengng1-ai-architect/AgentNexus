## Context

`market_research` 是 `plan-generation-pipeline` 流水线的第二个节点，与 `product_research`、`audience_insight` 并行执行。它接收 `brand_name` + `category`，输出 `MarketResearchOutput`（`market_summary` / `trends` / `opportunities`），供下游 `strategy_generation`、`plan_generator` 等节点使用。

**当前实现**：`market_research_agent.py` 通过 import `market_analysis_agent.py` 的 7 个 `call_node_*` 函数，串行调用 7 次纯 LLM（define → size → trends → users → competitors → assess → synthesize），最后由 `_build_output` 截取 trends、opportunities 和 300 字摘要。全程不联网，市场规模、趋势信号、竞品信息均由 LLM 凭训练知识生成，无来源佐证——违反 `plan-generation-pipeline` spec 中「数据引用必须来自 mock 或真实 API，LLM 禁止编造」的要求，也违反 `market-analysis` in_scope 约束。

另外，调研的 `users`（目标用户）与 `audience_insight` 节点重复，`competitors`（竞品）属于 out_scope，但当前代码仍生成这些信息（即使最终被 `_build_output` 丢弃），浪费算力。

本次重构将 `market_research` 改为「联网搜索 → 并发抓取 → LLM 从真实网页提取」架构。复用前序变更已添加的 `duckduckgo_search()`（httpx 直接请求 html.duckduckgo.com，避免 DDGS 的多引擎 fan-out）。

## Goals / Non-Goals

**Goals:**
- `market_research` 输出与 spec 新增的「所有数据必须来自真实网页、标注来源 URL、不编造数据数值」要求一致
- 调研耗时从 ~50-100s 降到 ~20-35s
- 去掉 `competitors` 字段（属 out_scope）
- 去掉 `users`（与 `audience_insight` 重复）
- `market_research_agent.py` 不再 import `market_analysis_agent.py`，两个 agent 各司其职
- 支持 `USE_MOCK_DATA=true` mock 模式
- 下游 `strategy_generation` / `plan_generator` 等零改动（输出 schema 不变）

**Non-Goals:**
- 不动 `market_analysis_agent.py`，它继续服务 `/market-analysis` 独立 API
- 不动 `market_analysis_agent.py` 的 7 个 prompt 模板（`research_define.md.j2` 等）
- 不动前端和计划生成的服务层（`plan_generation_service.py`）
- 不引入付费数据源

## Decisions

### 决策 1：搜索策略 — 4 个关键词，各调一次 `duckduckgo_search`

**决策**：用 4 个关键词分别搜索，`asyncio.gather` 并行。

| 关键词 | 对应字段组 | 来源 |
|--------|-----------|------|
| `{category} 产业链 上游 下游` | market_definition | 原 `research_define.md.j2` 的 scope 主题 |
| `{category} 市场规模 增长率` | market_size | 原 `research_size.md.j2` 的主题 |
| `{category} 行业趋势` | trends | 原 `research_trends.md.j2` 的主题 |
| `{category} 市场机会 投资 前景` | opportunities | 原 `research_assess.md.j2` 的主题 |

**为什么只搜 4 次**：users 和 competitors 已被去掉（重复 + out_scope），所以只保留 4 个有效字段组（define / size / trends / opportunities）。每个关键词产出一组网页，供后续 LLM 从同一批网页中提取所有字段。

### 决策 2：抓取 — 复用产品/人群调研的 httpx 并发模式

**决策**：对 search 返回的 URL 去重后，用 `asyncio.gather` 并发发起 httpx `GET`，单页超时 15 秒、截断 8000 字符、跳过 PDF/图片/非 HTML。与 `product_research_agent` 的 `fetch_node` 一致。

**为什么复用**：这是经过生产验证的模式，且数据引用规则对这三个 agent 一致。

### 决策 3：提取 — 单次 LLM 调用 + with_structured_output，而非 4 次

**决策**：用 `with_structured_output` 一次 LLM 调完成所有字段提取，而不是 split define/size/trends/assess 各调一次。

**理由**：所有字段共享同一份网页内容，拆成 4 次会 x4 LLM 调用 + 4 次等待，没有信息增益（不像当前 7 次串行链每次有精化上下文）。一次提取在速度和质量上都是最优解。

### 决策 4：提取 prompt 模板 — 新文件 `market_research_extract.md.j2`

**决策**：新建 `backend/app/prompt_templates/market_research_extract.md.j2`，替代原本 7 个 `research_*.md.j2` 的导入。

Prompt 结构（骨架已获用户确认）：
- 输入段：`brand_name`、`category`、`fetched_pages[]`（含 URL + title + text）
- 硬约束段：仅基于网页内容、必须标注来源 URL、空值写 null/[]、禁止编造
- 输出段：`market_definition` / `market_size` / `trends` / `opportunities` 四个字段组的完整结构化 JSON

**为什么新建**：旧 prompt 模板是为 7 步串行精化链设计的（每步取上一步的 context 变量），在新架构下不再适用。删除旧模板不涉及（仍被 `market_analysis_agent` 引用）。

### 决策 5：自包含 agent — 不再 import `market_analysis_agent`

**决策**：`market_research_agent.py` 改为自包含搜索/抓取/提取逻辑，不再 import `call_node_*`。

**理由**：两个 agent 的数据来源逻辑已彻底分岔——`market_research` 走联网，`market_analysis` 保留纯 LLM。共享函数系名存实亡，且 import 关系使得 `market_research_agent.py` 加载时连带加载 `market_analysis_agent.py` 的全部模块。

### 决策 6：Mock 模式 — 按品类维度组织预设数据

**决策**：`backend/mock_data/market_research/` 目录下按品类存放 JSON（如 `运动服装.json`、`运动鞋.json`），内容为完整的 `MarketResearchOutput` 结构。`USE_MOCK_DATA=true` 时从该目录读取并反序列化。

### 决策 7：错误处理 — 无 fallback 直返空

**决策**：当搜索返回 0 结果或全部抓取失败时，返回空的 `MarketResearchOutput`（`market_summary` 写"未找到市场信息"，`trends` / `opportunities` 为空列表），不抛异常、不 fallback 到 LLM 生成（用户已确认 B 方案）。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| **搜索结果不稳定**：DuckDuckGo HTML 接口可能因反爬机制返回空或 403 | 1) 走本地代理（已有配置）；2) 合理 User-Agent；3) 搜索失败返回空结果不影响流水线继续（其他节点正常执行） |
| **LLM 提取质量**：单次提取 4 个字段组，若网页内容杂/少，提取的 `opportunities` 可能不如当前 LLM 编的丰满 | 预期行为——「少但真」优于「多但假」。项目规则明确禁止编造 |
| **web-extraction 方案不向后兼容**：已存档（checkpoint）的老 run 若 resume，走的是新版 market_research 逻辑。但这不影响用户体验——新版输出 schema 不变，内容更可靠 |
| **DDG 接口变动**：html.duckduckgo.com 的前端结构改变会影响 HTML 解析 | `duckduckgo_search()`（已上线）封装了解析逻辑，变动只需更新该函数 |

## Migration Plan

1. **修改 `backend/app/agents/market_research_agent.py`**：重写 `run_market_research`，改为自包含的 search → fetch → extract 三步
2. **新建 `backend/app/prompt_templates/market_research_extract.md.j2`**：按骨架写提取 prompt（提示词文案需你最终确认）
3. **新建 `backend/mock_data/market_research/`**：至少添加运动服装品类的预设 mock 数据
4. **重写 `backend/tests/test_agents/test_market_research.py`**：mock `duckduckgo_search` + mock LLM extract，覆盖真实模式和 mock 模式
5. **实测对比**：在 feature 分支用李宁跑一次新版和旧版，对比 `market_summary` / `trends` / `opportunities` 的内容量和真实性

### Rollback
回退 `market_research_agent.py` 到旧版即可。下游节点和中层服务层均无需变更。

## Open Questions

1. **Mock 数据中 market_definition / market_size 字段填充到什么粒度？** 暂时只填充 `MarketResearchOutput` 的三个存活字段（`market_summary` / `trends` / `opportunities`），冗余字段不包含在 mock 文件中。
