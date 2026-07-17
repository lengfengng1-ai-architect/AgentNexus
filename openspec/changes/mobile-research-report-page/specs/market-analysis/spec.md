# Delta: market-analysis — 移动端调研结果页

## MODIFIED Requirements

### Requirement: 移动端分析完成态只渲染完整报告

移动端市场分析完成后，SHALL 在聊天气泡内渲染调研摘要卡片（`ResearchReportEntryCard`），不再直渲 `full_report` markdown。摘要卡片 SHALL 展示市场名称、关键数字（TAM/CAGR，缺失时不渲染）、机会评估评级（缺失时不渲染）和"查看完整调研报告"入口按钮。`full_report` 的完整渲染 SHALL 移至调研结果页（见"移动端调研结果页"需求）。

#### Scenario: 移动端完成态展示摘要卡片
- **WHEN** 移动端（ScreenChat）市场分析 SSE 流完成且收到 `result` 事件
- **THEN** ChatBubble 渲染 `ResearchReportEntryCard` 摘要卡片，不直渲 full_report markdown
- **AND** 卡片展示市场名称（`market_name`，空时兜底"市场调研报告"）
- **AND** 卡片展示 TAM 数值与 CAGR（`market_size` 缺失时整块数字区不渲染）
- **AND** 卡片展示机会评估评级 badges（`opportunity_assessment` 缺失时不渲染）
- **AND** 卡片展示"查看完整调研报告"按钮

#### Scenario: 旧消息向后兼容
- **WHEN** 移动端渲染本变更之前产生的历史调研消息（无 `researchId`）
- **THEN** 仍按旧路径渲染 `full_report` markdown（`market-report-mobile` class），不显示摘要卡片

#### Scenario: PC 端不受影响
- **WHEN** PC 端（ChatContainer）市场分析完成
- **THEN** 仍按现状渲染（full_report markdown），不出现摘要卡片与结果页

## ADDED Requirements

### Requirement: 调研结果持久化与 research_id

市场分析 SSE 流完成时，系统 SHALL 为本次调研生成唯一 `research_id`（格式 `mr-<8位小写hex>`），将完整 `MarketResearchResponse` 持久化为 JSON 文件，并在 `result` 事件 payload 顶层携带 `research_id` 字段。落盘失败 SHALL NOT 阻断 SSE result 事件下发（降级为刷新后 404，仅记日志）。

#### Scenario: 流完成生成 research_id 并落盘
- **WHEN** 市场分析 SSE 流 7 个节点全部完成
- **THEN** 系统生成 `research_id`（`mr-` 前缀 + 8 位小写 hex）
- **AND** 将完整 `MarketResearchResponse` 写入 `backend/mock_data/market_analysis/results/<research_id>.json`
- **AND** `result` 事件 payload 顶层包含 `research_id` 字段，其余结构不变（向后兼容）

#### Scenario: 每次调研生成独立 ID
- **WHEN** 同一 market_name 连续调研两次
- **THEN** 两次生成不同的 `research_id`，两份结果文件互不覆盖

#### Scenario: 落盘失败不阻断
- **WHEN** 结果文件写入失败（磁盘错误等）
- **THEN** SSE `result` 事件仍正常下发（含 research_id）
- **AND** 服务端记录错误日志，不抛出异常到 SSE 流

### Requirement: 按 ID 拉取调研结果端点

系统 SHALL 暴露 `GET /api/v1/market-analysis/results/{research_id}` 端点，按 ID 返回已持久化的调研结果。

#### Scenario: 存在的 ID 返回 200
- **WHEN** 客户端请求 `GET /api/v1/market-analysis/results/{research_id}` 且该 ID 对应的结果文件存在
- **THEN** 系统响应 HTTP 200
- **AND** 响应体为完整 `MarketResearchResponse`（含 `result` 与 `confidence`）

#### Scenario: 不存在的 ID 返回 404
- **WHEN** 客户端请求的结果文件不存在
- **THEN** 系统响应 HTTP 404
- **AND** 响应体为统一 `APIError` 模型

#### Scenario: 非法 ID 格式返回 404
- **WHEN** `research_id` 不符合 `mr-<8位hex>` 格式或包含路径遍历字符
- **THEN** 系统响应 HTTP 404（不泄露文件系统信息）

#### Scenario: 服务端异常返回 500
- **WHEN** 读取结果文件时发生未预期异常
- **THEN** 系统响应 HTTP 500
- **AND** 响应体为统一 `APIError` 模型

### Requirement: 移动端调研结果页

移动端 SHALL 提供调研结果覆盖屏（`research-report` 屏）：点击摘要卡片按钮后，覆盖屏在手机框内以从右往左 slide-in 动画进入，展示完整调研结果；点返回按钮以 slide-out 动画退出回聊天屏。覆盖屏数据 SHALL 总是通过 `GET /market-analysis/results/{research_id}` 从后端拉取，加载中显示骨架屏，拉取失败显示"报告已过期"占位。

#### Scenario: 点击按钮滑入结果页
- **WHEN** 用户点击摘要卡片的"查看完整调研报告"按钮
- **THEN** 调研结果覆盖屏以从右往左 slide-in 动画（300ms）进入，覆盖聊天屏
- **AND** 覆盖屏展示毛玻璃 sticky 顶栏（‹ 返回按钮 + 市场名称标题）
- **AND** 聊天屏保持挂载不卸载（返回后滚动位置与消息状态保留）

#### Scenario: 加载中骨架屏
- **WHEN** 覆盖屏打开且 GET 请求未完成
- **THEN** 内容区显示骨架屏占位，不显示错误

#### Scenario: 拉取成功渲染完整结果
- **WHEN** GET 请求返回 200
- **THEN** 覆盖屏渲染结构化板块（市场摘要/市场规模/趋势信号/目标用户/竞争格局/机会评估）+ 完整 markdown 报告 + 证据来源
- **AND** 缺数据的板块不渲染（优雅降级）
- **AND** 页面为单页长滚动布局

#### Scenario: 拉取失败显示过期占位
- **WHEN** GET 请求返回 404 或网络错误
- **THEN** 覆盖屏显示"报告数据已过期，请重新调研"占位与返回按钮

#### Scenario: 返回聊天屏
- **WHEN** 用户点击覆盖屏顶栏 ‹ 返回按钮
- **THEN** 覆盖屏以从左往右 slide-out 动画（300ms）退出
- **AND** 动画结束后卸载覆盖层，屏幕状态回到 `chat`

#### Scenario: PC 端不出现结果页
- **WHEN** PC 端市场分析完成
- **THEN** 不出现摘要卡片按钮与结果页入口
