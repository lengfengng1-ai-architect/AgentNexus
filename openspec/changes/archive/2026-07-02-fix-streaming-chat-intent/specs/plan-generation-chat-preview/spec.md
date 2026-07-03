## MODIFIED Requirements

### Requirement: 方案触发流程从聊天内生成改为聊天确认 → 跳转工作台

系统 SHALL 将方案生成入口从聊天内直接触发改为：聊天内多轮补全信息 → 用户确认 → 跳转工作台 → 工作台自动生成。

#### Scenario: 聊天中确认后跳转工作台
- **GIVEN** `intent_recognition` 返回 `intent: "generate_plan"`
- **AND** `missing_fields` 为空列表
- **WHEN** 用户点击"确认生成方案"
- **THEN** 前端 SHALL 跳转到 `/plan` 页面
- **AND** URL 参数 SHALL 携带 `brand_input`（JSON 编码）
- **AND** 工作台 SHALL 自动使用该信息启动 `plan_generation_pipeline`

#### Scenario: 工作台自动预填表单
- **GIVEN** 用户从聊天携带 `brand_input` 跳转到工作台
- **WHEN** 工作台页面加载
- **THEN** 表单字段 SHALL 自动填充从聊天携带的品牌信息
- **AND** 流水线 SHALL 自动开始执行
