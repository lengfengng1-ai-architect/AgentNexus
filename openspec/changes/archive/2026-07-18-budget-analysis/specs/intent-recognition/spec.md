## ADDED Requirements

### Requirement: 意图识别 SHALL 支持 budget_assessment 意图

意图识别 SHALL 新增 `budget_assessment` 意图，当用户消息含"预算评估/预算分配/预算分析"等关键词且意图为评估预算（而非生成完整方案）时返回该意图。budget_assessment SHALL 复用现有 clarify 多轮机制收集 category/budget/period/city 四字段；字段齐全时返回 budget_assessment（而非 generate_plan）。

#### Scenario: 预算评估关键词触发 budget_assessment
- **GIVEN** 用户消息含"预算评估"等关键词
- **WHEN** 意图识别处理
- **AND** category/budget/period/city 四字段齐全
- **THEN** intent SHALL 为 budget_assessment

#### Scenario: 字段缺失走 clarify 收集
- **GIVEN** 用户触发预算评估但字段缺失
- **WHEN** 意图识别处理
- **THEN** intent SHALL 为 clarify
- **AND** missing_fields SHALL 包含缺失的 budget 评估字段

#### Scenario: 与 generate_plan 区分
- **GIVEN** 用户请求完整方案（非预算评估关键词）
- **WHEN** 意图识别处理
- **AND** 五字段齐全
- **THEN** intent SHALL 为 generate_plan（不受 budget_assessment 影响）
