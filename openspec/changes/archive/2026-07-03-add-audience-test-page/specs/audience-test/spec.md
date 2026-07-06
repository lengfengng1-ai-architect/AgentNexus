## ADDED Requirements

### Requirement: 用户画像测试入口
ChatPreviewPage SHALL 在"对话"和"意图测试"tab 右侧新增第三个 tab，名称为"用户画像测试"。

#### Scenario: Tab 可见
- **WHEN** 用户访问 /chat 页面
- **THEN** 导航栏显示三个 tab："对话"、"意图测试"、"用户画像测试"

#### Scenario: Tab 切换
- **WHEN** 用户点击"用户画像测试"tab
- **THEN** 视图切换到 AudienceTestPage 组件，对话和意图测试视图隐藏

### Requirement: 产品名称输入和测试启动
AudienceTestPage SHALL 提供产品名称输入框和"开始测试"按钮。

#### Scenario: 输入产品名称并启动
- **WHEN** 用户输入产品名称（如 "Nike Alphafly 3"）并点击"开始测试"
- **THEN** 向前端发送 POST /workflows/audience_insight_pipeline/run?stream=true 请求，三个调研 Agent 开始并行执行

#### Scenario: 输入为空时按钮禁用
- **WHEN** 产品名称为空
- **THEN** "开始测试"按钮处于禁用状态

### Requirement: 三列并行 Agent 状态展示
AudienceTestPage SHALL 使用三列卡片展示三个并行 Agent 的执行状态和结果。

#### Scenario: 初始状态
- **WHEN** 页面初次加载或重置后
- **THEN** 三列卡片均显示为"待执行"状态

#### Scenario: Agent 开始执行
- **WHEN** SSE 收到 `node.start` 事件，nodeId 为 product_research
- **THEN** 第一列卡片状态更新为"执行中"，显示加载动画

#### Scenario: Agent 执行完成
- **WHEN** SSE 收到 `node.complete` 事件，nodeId 为 product_research
- **THEN** 第一列卡片状态更新为"已完成"，显示完成图标

#### Scenario: Agent 执行失败
- **WHEN** SSE 收到 `node.failed` 事件
- **THEN** 对应卡片状态更新为"失败"，显示错误信息

### Requirement: 思维链展示
每列 Agent 卡片下方 SHALL 有可展开的思维链日志区域。

#### Scenario: 展开思维链
- **WHEN** 用户点击 Agent 卡片的展开按钮
- **THEN** 显示该 Agent 的所有 node.log 事件消息，按时间顺序排列

#### Scenario: 实时追加日志
- **WHEN** SSE 持续收到 node.log 事件（nodeId 匹配展开的卡片）
- **THEN** 日志区域实时追加新的日志行

### Requirement: 用户画像结果展示
三个 Agent 全部完成后，底部 SHALL 展示 generate_persona 输出的用户画像。

#### Scenario: 画像生成完成
- **WHEN** SSE 收到 node.complete 事件，nodeId 为 generate_persona
- **THEN** 底部区域渲染结构化的 UserPersona 数据，包括人口画像、购买动机、产品使用、生活方式等字段

#### Scenario: 等待画像生成
- **WHEN** 三个 Agent 已完成但 generate_persona 尚未完成
- **THEN** 底部区域显示"正在生成用户画像…"的加载状态
