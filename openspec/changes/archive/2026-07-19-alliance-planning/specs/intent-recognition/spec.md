## ADDED Requirements

### Requirement: 意图识别 SHALL 支持 alliance_planning 意图

意图识别 SHALL 新增 `alliance_planning` 意图（关键词"创建盟域/盟域合作/建盟域/加入盟域"）。字段齐全（category + city）→ alliance_planning；缺 → 保持意图 + 反问。完整方案请求仍走 generate_plan。

#### Scenario: 盟域关键词触发
- **GIVEN** 用户消息含"创建盟域"等关键词且 category+city 齐全
- **THEN** intent SHALL 为 alliance_planning

#### Scenario: 字段缺失走多轮反问
- **GIVEN** 触发盟域规划但 category 或 city 缺失
- **THEN** intent SHALL 为 alliance_planning
- **AND** missing_fields SHALL 标记缺失项

#### Scenario: 与 generate_plan 区分
- **GIVEN** 用户请求完整方案（非盟域关键词）
- **WHEN** 五字段齐全
- **THEN** intent SHALL 为 generate_plan
