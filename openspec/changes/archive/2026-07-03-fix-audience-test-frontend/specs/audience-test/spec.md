## MODIFIED Requirements

### Requirement: 用户画像测试页面适配实际后端 API

系统 SHALL 使用 `POST /api/v1/audience-insight/stream` 端点进行用户画像测试，接收 `progress` 和 `result` 两类 SSE 事件，并以步骤条形式展示串行执行进度。

#### Scenario: 输入产品名称并发起测试
- **WHEN** 用户输入产品名称并点击"开始测试"
- **THEN** 系统向 `POST /api/v1/audience-insight/stream` 发送 `{ product_name: "<name>" }` 请求

#### Scenario: 接收 progress 事件更新步骤状态
- **WHEN** 后端发送 `event: progress` 且 data 包含 `step` 和 `message` 字段
- **THEN** 系统根据 step 值（search/search_done/fetch/extract/persona）更新对应步骤的状态和日志

#### Scenario: 接收 result 事件展示用户画像
- **WHEN** 后端发送 `event: result` 且 data 包含完整 AudienceInsightResponse
- **THEN** 系统解析 persona 字段展示用户画像结构化数据

#### Scenario: 接收 error 事件
- **WHEN** 后端发送 `event: error`
- **THEN** 系统显示错误信息并恢复可交互状态

#### Scenario: 缓存命中时快速展示结果
- **WHEN** 后端发送 step=cache 的 progress 事件后紧跟 result 事件
- **THEN** 系统跳过中间步骤直接展示用户画像
