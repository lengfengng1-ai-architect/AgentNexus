# Capability: activity-planning

## ADDED Requirements

### Requirement: 活动规划 SHALL 通过多轮澄清收集运动类型与城市

活动规划 SHALL 收集 sport_type（运动类型，LLM 从用户输入提取）和 city（城市）两个字段。字段缺失时 SHALL 保持 activity_planning 意图并反问缺失字段（复用 budget_assessment 的多轮机制）。字段齐全后触发活动规划计算。

#### Scenario: 字段缺失时反问
- **GIVEN** 用户触发活动规划但 sport_type 或 city 缺失
- **WHEN** 意图识别处理
- **THEN** intent SHALL 为 activity_planning
- **AND** missing_fields SHALL 标记缺失项
- **AND** reply SHALL 反问缺失字段

#### Scenario: 字段齐全触发规划
- **GIVEN** sport_type 与 city 已收集
- **WHEN** 意图识别处理
- **THEN** intent SHALL 为 activity_planning 且 missing_fields 为空
- **AND** SHALL 触发活动规划计算

### Requirement: 活动规划 SHALL 结合 mock 赛事/场馆数据给出聚焦建议

字段齐全后 SHALL 查 allygo_city_data 的 tournament/events/venues：候选赛事按 sport_type + available_cities 过滤匹配；无精确匹配时降级返回该城市全部赛事 top 3 并注明。SHALL 生成候选赛事列表（含 scale/frequency/sponsorship_options）+ 城市活动热度 + 场馆资源 + LLM 一句话建议。

#### Scenario: 赛事按运动类型+城市过滤
- **GIVEN** sport_type=羽毛球、city=上海
- **WHEN** 计算活动规划
- **THEN** 候选赛事 SHALL 为 sport_type 命中且 available_cities 含上海 的赛事
- **AND** 赛事名称/数据 SHALL 来自 mock，不编造

#### Scenario: 无精确匹配降级
- **GIVEN** sport_type 在目标城市无匹配赛事
- **WHEN** 计算
- **THEN** SHALL 返回该城市全部赛事 top 3
- **AND** SHALL 注明"无精确匹配，以下为推荐"

#### Scenario: 一句话建议由 LLM 基于数据生成
- **GIVEN** 候选赛事已匹配
- **WHEN** 生成建议
- **THEN** SHALL 由 LLM 基于已匹配赛事数据推理生成
- **AND** SHALL NOT 编造赛事名称或数据数值

### Requirement: 活动规划结果 SHALL 持久化并按 ID 拉取

活动规划完成 SHALL 持久化为 `activity_planning/results/ap-<uuid8>.json`，返回 activity_planning_id。详情页 SHALL 通过 GET /activity-planning/results/{id} 按 ID 拉取。

#### Scenario: 结果落盘并返回 ID
- **GIVEN** 活动规划计算完成
- **WHEN** SSE 推送 result
- **THEN** SHALL 先写盘 ap-\<uuid8\>.json
- **AND** result 事件 SHALL 携带 activity_planning_id

#### Scenario: 按 ID 拉取
- **GIVEN** 详情页打开
- **WHEN** GET /activity-planning/results/{id}
- **THEN** SHALL 返回完整结果
- **AND** 无效/不存在 ID SHALL 返回 404

### Requirement: 移动端 SHALL 在聊天展示活动规划入口卡

活动规划完成后 ChatBubble SHALL 渲染 ActivityPlanningEntryCard：候选赛事数 + top 赛事摘要（name/scale）+ 一句话建议 + "查看活动详情"按钮。点击 SHALL 打开详情覆盖屏。

#### Scenario: 入口卡渲染
- **GIVEN** 消息携带 activity_planning_id 且为移动端
- **WHEN** ChatBubble 渲染
- **THEN** SHALL 渲染 ActivityPlanningEntryCard
- **AND** 点击按钮 SHALL 打开 ScreenActivityPlanning 覆盖屏

### Requirement: 活动规划详情页 SHALL 以毛玻璃风格展示完整结果

详情覆盖屏 SHALL 复用预算评估详情页模式（毛玻璃顶栏 + 卡片列表）：候选赛事卡列表（含 scale/frequency/sponsorship_options）+ 城市活动热度 + 场馆资源 + 建议。刷新后通过 ID 重新拉取。

#### Scenario: 详情页结构
- **GIVEN** 用户在活动详情页
- **WHEN** 渲染
- **THEN** SHALL 展示候选赛事卡列表 + 活动热度 + 场馆 + 建议

### Requirement: 活动规划 SHALL 仅输出建议不执行

活动规划 SHALL 只输出规划建议，SHALL NOT 自动创建活动/下单/执行。

#### Scenario: 不执行真实创建
- **GIVEN** 活动规划完成
- **THEN** SHALL NOT 调用任何创建/下单/执行类 API
- **AND** 输出仅为建议性质
