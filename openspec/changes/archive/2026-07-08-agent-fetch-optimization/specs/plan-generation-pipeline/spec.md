## ADDED Requirements

### Requirement: product_research 和 audience_insight 节点 fetch 阶段 SHALL 有并发控制

product_research 和 audience_insight 节点在并发抓取搜索结果的网页时，SHALL 使用 `asyncio.Semaphore(8)` 控制最大并发连接数。

#### Scenario: Semaphore 限制并发数
- **WHEN** `fetch_node` 开始发起 HTTP 请求
- **THEN** 同时进行的请求 SHALL 不超过 8 个
- **AND** 后续请求 SHALL 在已有请求完成后递补

### Requirement: product_research 和 audience_insight 节点 SHALL 使用 10 秒超时

两个节点在并发抓取网页时，单个 HTTP 请求的超时 SHALL 为 10 秒。

#### Scenario: 超时返回空结果
- **WHEN** 单个 HTTP 请求超过 10 秒未响应
- **THEN** 该页面 SHALL 标记为未抓取状态
- **AND** 节点 SHALL 继续处理剩余页面，不中断整体流程

### Requirement: product_research 和 audience_insight 节点 SHOULD 跳过已知 403 域名

两个节点在搜索去重阶段，SHOULD 跳过 hostname 命中 `BLOCKED_DOMAINS` 集合（`zhuanlan.zhihu.com`、`baike.baidu.com`、`wenku.baidu.com`）的 URL。

#### Scenario: 屏蔽域名不影响其他 URL
- **WHEN** 搜索去重遍历搜索结果
- **THEN** 命中 BLOCKED_DOMAINS 的 URL 被跳过
- **AND** 不影响其他域名正常处理

### Requirement: product_research 和 audience_insight 节点 SHALL 单页截断 4000 字符

两个节点的 `MAX_PAGE_CHARS` SHALL 为 4000（与 market_research 对齐）。

#### Scenario: 页面内容截断
- **WHEN** 抓取的页面内容超过 4000 字符
- **THEN** 内容 SHALL 截断并追加截断标记
- **AND** LLM 提取环节仍能获取前 4000 字符的核心信息
