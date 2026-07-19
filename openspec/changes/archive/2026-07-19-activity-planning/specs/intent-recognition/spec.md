## ADDED Requirements

### Requirement: 意图识别 SHALL 支持 activity_planning 意图与 sport_type 字段

意图识别 SHALL 新增 `activity_planning` 意图（关键词"创建活动/策划活动/办活动/做活动"）。SHALL 新增 `sport_type` 字段（LLM 从用户输入提取运动类型）。字段齐全（sport_type + city）→ activity_planning；缺 → 保持意图 + 反问。完整方案请求仍走 generate_plan。

#### Scenario: 活动关键词触发 activity_planning
- **GIVEN** 用户消息含"创建活动"等关键词
- **WHEN** 意图识别且 sport_type + city 齐全
- **THEN** intent SHALL 为 activity_planning

#### Scenario: sport_type 由 LLM 提取
- **GIVEN** 用户消息含运动类型描述
- **WHEN** 意图识别
- **THEN** sport_type SHALL 由 LLM 提取（如"羽毛球"）
- **AND** sport_type SHALL 随 intent 输出返回

#### Scenario: 字段缺失走多轮反问
- **GIVEN** 触发活动规划但 sport_type 或 city 缺失
- **WHEN** 意图识别
- **THEN** intent SHALL 为 activity_planning
- **AND** missing_fields SHALL 标记缺失项

#### Scenario: 与 generate_plan 区分
- **GIVEN** 用户请求完整营销方案（非活动关键词）
- **WHEN** 五字段齐全
- **THEN** intent SHALL 为 generate_plan（不受 activity_planning 影响）
