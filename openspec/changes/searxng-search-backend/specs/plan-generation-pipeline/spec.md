## ADDED Requirements

### Requirement: 调研 agent SHALL 通过 SearxNG 实例做并发网页检索

`product_research` / `market_research` / `audience_insight` 三个调研 agent 的网页检索 SHALL 通过自托管 SearxNG 实例（`searxng_search()`）进行，而非直连单一搜索引擎。SearxNG 实例地址 SHALL 由 `SEARXNG_URL` 环境变量配置（默认 `http://localhost:8080`）。`searxng_search()` SHALL 返回与原 `duckduckgo_search` 同构的 `[{href, title, body}]` 列表，使三个 agent 仅改调用名即可切换。

SearxNG 聚合多引擎（默认请求级参数 `engines=bing,baidu`），SHALL 支持三个 agent 并行、每个 agent 内部多个关键词并行而不触发限流。当 SearxNG 实例不可达时，该关键词 SHALL 走 agent 已有的搜索失败降级（返回空、继续其他关键词），不抛致命异常。

#### Scenario: 三 agent 并行检索不被限流
- **GIVEN** 流水线真实模式运行，`SEARXNG_URL` 指向可达的 SearxNG 实例
- **WHEN** 三个调研 agent 同时启动、各自内部多关键词并行搜索
- **THEN** 每个关键词 SHALL 能拿到非空结果（不再出现 DDG 那种并发全空）
- **AND** 各 agent 的搜索结果池 SHALL 满足后续抓取需求

#### Scenario: searxng_search 返回结构与 duckduckgo_search 一致
- **WHEN** 调用 `searxng_search(keyword, max_results=N)`
- **THEN** 返回值 SHALL 为 `list[dict]`，每个 dict 含 `href`、`title`、`body` 三个字符串键
- **AND** `href` SHALL 为真实目标 URL（非 SearxNG 重定向链接）

#### Scenario: SearxNG 不可达时降级
- **GIVEN** `SEARXNG_URL` 指向的实例未启动或超时
- **WHEN** 某关键词调用 `searxng_search` 抛异常
- **THEN** agent SHALL 捕获异常、记录该关键词失败、继续其他关键词
- **AND** 节点 SHALL 不因搜索失败而整体崩溃

### Requirement: 调研 agent SHALL 抓取并提取约 20 个网页

三个调研 agent 的抓取上限 SHALL 从 5 提升到约 20（`product_research` 的 `FETCH_TOP_N`、`audience_insight` 的 `FETCH_TOP`、`market_research` 的对应常量）。搜索去重后的候选池 SHALL 取前 20 条并发抓取，LLM 提取 SHALL 基于这 20 页的真实正文。抓取行为（httpx 并发、15s 超时、8000 字截断、跳过非 HTML/PDF/图片、异常落盘诊断日志）SHALL 与现状一致。

#### Scenario: 抓取约 20 页供 LLM 提取
- **GIVEN** 某调研 agent 搜索阶段去重后得到 ≥20 条候选
- **WHEN** 进入抓取阶段
- **THEN** SHALL 并发抓取前 20 条 URL
- **AND** LLM 提取阶段 SHALL 接收到这 20 页中抓取成功的有效正文

#### Scenario: 候选不足 20 时抓全部
- **GIVEN** 搜索去重后候选少于 20 条
- **WHEN** 进入抓取阶段
- **THEN** SHALL 抓取全部候选，不强制凑满 20

## MODIFIED Requirements

### Requirement: market_research 节点 SHALL 通过联网搜索获取市场数据

`market_research` 节点 SHALL 通过 SearxNG 实例（`searxng_search`）聚合多引擎获取真实网页，并发抓取后由 LLM 从网页内容提取结构化市场调研结果。调研 SHALL 覆盖四个字段组：市场定义（`market_definition`）、市场规模（`market_size`）、趋势（`trends`）、机会评估（`opportunities`）。节点 SHALL 不调研竞品（属 out_scope `competitor-analysis`）和目标用户（由 `audience_insight` 节点负责，避免重复）。

每条提取的非空信息 SHALL 标注来源 URL（来自已抓取的网页），网页未提及的字段 SHALL 写 null 或空值，LLM SHALL 不编造数据数值、机构名、品牌名。节点最终输出 SHALL 映射为 `MarketResearchOutput`（`market_summary` / `trends` / `opportunities`），下游节点契约不变。

#### Scenario: market_research 从真实网页提取并标注来源
- **GIVEN** 流水线真实模式运行（`USE_MOCK_DATA` 未开启），`SEARXNG_URL` 指向可达 SearxNG 实例
- **WHEN** `market_research` 节点执行
- **THEN** 节点 SHALL 调用 `searxng_search` 按品类/品牌相关关键词搜索
- **AND** SHALL 并发抓取搜索返回的网页（约 20 条）
- **AND** SHALL 用单次 LLM 调用从抓取到的网页内容提取市场调研结果
- **AND** 提取结果中每条非空信息 SHALL 标注来源 URL

#### Scenario: 网页未提及时不编造
- **GIVEN** 抓取到的网页中没有某字段（如 `market_size.som`）的数据
- **WHEN** LLM 提取该字段
- **THEN** 该字段 SHALL 为 null 或空值
- **AND** LLM SHALL 不编造数值或机构名

#### Scenario: market_research 不调研竞品和目标用户
- **WHEN** `market_research` 节点产出
- **THEN** 输出 SHALL 不包含竞品分析字段（属 out_scope）
- **AND** SHALL 不包含目标用户/用户画像字段（由 `audience_insight` 负责）
- **AND** SHALL 仍包含 `market_summary`、`trends`、`opportunities` 三个字段

#### Scenario: market_research 输出契约保持不变
- **WHEN** `market_research` 节点执行完成
- **THEN** state 中 `market_research` 字段 SHALL 包含 `market_summary`、`trends`、`opportunities`
- **AND** 下游节点（`strategy_generation`、`plan_generator`）SHALL 无需改动即可消费

#### Scenario: 搜索失败时返回空结果而非崩溃
- **GIVEN** SearxNG 实例不可达或搜索返回 0 条结果
- **WHEN** `market_research` 节点执行
- **THEN** 节点 SHALL 不抛异常
- **AND** SHALL 返回空的 `MarketResearchOutput`（`market_summary` 提示未找到市场信息，`trends` / `opportunities` 为空列表）
- **AND** SHALL 不 fallback 到 LLM 凭训练知识生成
