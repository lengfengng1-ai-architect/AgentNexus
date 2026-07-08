## ADDED Requirements

### Requirement: market_research 节点 fetch 阶段 SHALL 有并发控制

`market_research` 节点在并发抓取搜索结果的网页时，SHALL 使用 `asyncio.Semaphore(8)` 控制同时最大并发连接数，避免 25 个请求同时涌出导致连接池拥堵。

#### Scenario: Semaphore 限制并发数
- **WHEN** `_fetch` 开始发起 25 个 HTTP 请求
- **THEN** 同时进行的请求 SHALL 不超过 8 个
- **AND** 后续请求 SHALL 在已有请求完成后递补

### Requirement: market_research 节点 fetch 超时 SHALL 为 10 秒

`market_research` 节点在并发抓取网页时，单个 HTTP 请求的超时 SHALL 为 10 秒（原 15 秒），慢页面快速放弃。

#### Scenario: 超时返回空结果
- **WHEN** 单个 HTTP 请求超过 10 秒未响应
- **THEN** 该页面 SHALL 标记为未抓取状态（`fetched: False`）
- **AND** 节点 SHALL 继续处理剩余页面，不中断整体流程

### Requirement: market_research 节点 SHOULD 跳过已知 403 域名

`_search` 函数在去重 URL 阶段，SHOULD 跳过 hostname 命中 `BLOCKED_DOMAINS` 集合（`zhuanlan.zhihu.com`、`baike.baidu.com`、`wenku.baidu.com`）的 URL，避免无用请求消耗并发槽位。

#### Scenario: 屏蔽域名不在搜索阶段展开
- **WHEN** `_search` 函数去重遍历搜索结果
- **THEN** URL 的 hostname 在 `BLOCKED_DOMAINS` 中时 SHALL 被跳过
- **AND** 该 URL 不会进入后续 fetch 阶段
- **AND** 不影响其他域名正常处理
