# Capability: alliance-planning

## ADDED Requirements

### Requirement: 盟域规划 SHALL 通过多轮澄清收集品类与城市

盟域规划 SHALL 收集 category（品类）和 city（城市）两个字段（复用 brand_input 现有字段）。字段缺失时 SHALL 保持 alliance_planning 意图并反问。字段齐全后触发规划计算。

#### Scenario: 字段缺失时反问
- **GIVEN** 用户触发盟域规划但 category 或 city 缺失
- **WHEN** 意图识别处理
- **THEN** intent SHALL 为 alliance_planning
- **AND** missing_fields SHALL 标记缺失项

#### Scenario: 字段齐全触发规划
- **GIVEN** category 与 city 已收集
- **THEN** intent SHALL 为 alliance_planning 且 missing_fields 为空
- **AND** SHALL 触发盟域规划计算

### Requirement: 盟域规划 SHALL 结合 mock 盟域/招募/达人数据给出聚焦建议

字段齐全后 SHALL 查 allygo_city_data：leagues（count/top_leagues/avg_members）+ cooperation_center（recruitments: title/type/target_count/requirements）+ influencers（count/tiers/avg_quote）。SHALL 生成头部盟域推荐 + 招募计划卡 + 达人分层矩阵 + LLM 一句话建议。

#### Scenario: 数据来自 mock 不编造
- **GIVEN** category=运动鞋、city=上海
- **WHEN** 计算
- **THEN** 盟域/招募/达人数据 SHALL 来自 allygo_city_data.json
- **AND** SHALL NOT 编造盟域/达人名称或数据数值

#### Scenario: 一句话建议由 LLM 基于数据生成
- **GIVEN** 盟域/招募数据已查
- **THEN** SHALL 由 LLM 基于已有数据推理生成
- **AND** SHALL NOT 编造名称或数据

### Requirement: 盟域规划结果 SHALL 持久化并按 ID 拉取

结果 SHALL 持久化为 `alliance_planning/results/al-<uuid8>.json`，返回 alliance_planning_id。详情页 SHALL 通过 GET /alliance-planning/results/{id} 拉取。

#### Scenario: 结果落盘并返回 ID
- **GIVEN** 计算完成
- **THEN** SHALL 先写盘 al-\<uuid8\>.json
- **AND** result 事件 SHALL 携带 alliance_planning_id

### Requirement: 移动端 SHALL 在聊天展示盟域规划入口卡

完成后 ChatBubble SHALL 渲染 AlliancePlanningEntryCard：盟域数 + 招募岗位摘要 + 一句话建议 + "查看盟域详情"按钮。

#### Scenario: 入口卡渲染
- **GIVEN** 消息携带 alliance_planning_id 且为移动端
- **THEN** SHALL 渲染 AlliancePlanningEntryCard
- **AND** 点击按钮 SHALL 打开 ScreenAlliancePlanning 覆盖屏

### Requirement: 盟域规划详情页 SHALL 以毛玻璃风格展示完整结果

详情覆盖屏 SHALL 复用活动规划详情页模式：头部盟域推荐 + 招募计划卡（target_count/requirements）+ 达人分层矩阵 + 建议。

#### Scenario: 详情页结构
- **GIVEN** 用户在盟域详情页
- **WHEN** 渲染
- **THEN** SHALL 展示头部盟域推荐 + 招募计划卡 + 达人分层 + 建议

### Requirement: 盟域规划 SHALL 仅输出建议不执行

SHALL NOT 自动建盟域/发邀约/执行。

#### Scenario: 不执行真实创建
- **GIVEN** 盟域规划完成
- **THEN** SHALL NOT 调用任何创建/下单/执行类 API
- **AND** 输出仅为建议性质
