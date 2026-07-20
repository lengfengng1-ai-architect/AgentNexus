# community-operations spec

> in_scope ID: community-operations

## ADDED Requirements

### Requirement: 社群运营规划

系统 SHALL 基于 category（品类）和 city（城市），结合平台 mock 数据和经营社补充数据，生成社群运营规划建议。

- 数据来源 SHALL 包括 `allygo_city_data.json` 中的 leagues/stores/venues/leaderboard/influencers 字段
- 数据来源 SHALL 包括 `mock_data/community_operations/community_data.json` 中的运营模板
- LLM SHALL 基于上述数据推理生成建议，不得编造经营社名称或数据数值

#### Scenario: 完整的社群运营分析

- **WHEN** 用户传入 category=瑜伽服，city=上海
- **THEN** 系统查询上海城市数据和运营模板数据
- **AND** 输出包含社群定位、内容规划、运营活动、KPI 目标的完整建议

### Requirement: SSE 流式推送

系统 SHALL 通过 SSE 事件流实时推送分析进度：

- `event: status` — 步骤更新（query_city → positioning → content_plan → operations）
- `event: result` — 最终结果，含 `community_operations_id`

#### Scenario: 完整的分析流

- **WHEN** 用户触发社群运营规划
- **THEN** 系统依次推送 status 事件
- **AND THEN** 最终推送 result 事件含完整结果

### Requirement: 结果持久化

- 每次分析结果 SHALL 保存为 `mock_data/community_operations/results/co-<uuid8>.json`
- 结果 ID SHALL 匹配正则 `^co-[0-9a-f]{8}$`
- 系统 SHALL 提供 `GET /community-operations/results/{id}` 端点供前端拉取

#### Scenario: 持久化存取

- **WHEN** 社群运营分析完成
- **THEN** 结果保存到本地 JSON 文件
- **AND** ID 可用于 GET 端点拉取完整结果

### Requirement: 结果结构

分析结果 SHALL 包含以下字段：

- `category` — 品类
- `city` — 城市
- `community_positioning` — 社群定位描述
- `target_members` — 目标人群描述
- `content_plan` — 内容规划列表，每项含 content_type / description / frequency
- `operation_activities` — 运营活动列表，每项含 activity_name / goal / description
- `kpi_targets` — KPI 目标字典（active_rate / retention_30d / conversion_rate 等）
- `suggestion` — LLM 生成的一句话建议

#### Scenario: 完整结果输出

- **WHEN** 社群运营分析完成
- **THEN** 返回的 JSON 包含上述所有字段
- **AND** content_plan 和 operation_activities 不为空

### Requirement: 入口卡展示

系统 SHALL 在聊天消息中渲染 `CommunityOperationsEntryCard` 入口卡，包含：

- 品类 + 城市标题
- 社群定位一句话
- 内容/活动数量摘要
- 核心 LLM 建议
- "查看社群运营详情"按钮 → 跳转详情页

#### Scenario: 入口卡渲染

- **WHEN** 社群运营分析结果返回
- **THEN** 聊天中显示入口卡
- **AND** 点击按钮跳转详情页（slide-in-right 动画）

### Requirement: 详情页展示

系统 SHALL 提供独立详情页 `ScreenCommunityOperations`，glassmorphism 风格，slide-in-right 转场：

- 毛玻璃 topbar（标题 + 返回按钮）
- 社群定位卡片
- 内容规划卡片（列表）
- 运营活动卡片（列表）
- KPI 目标卡片
- 一句话建议
- 骨架屏加载态、404 过期态、500 错误态

#### Scenario: 详情页加载

- **WHEN** 用户点击"查看社群运营详情"
- **THEN** 详情页以 slide-in-right 动画进入
- **AND** 骨架屏显示直到数据返回
- **AND** 各卡片展示对应数据
