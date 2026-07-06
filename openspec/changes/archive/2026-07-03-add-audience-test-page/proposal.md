## Why

人群洞察测试目前只能通过后端 workflow 间接验证，缺少独立的前端测试页面。需要提供一个与"对话"、"意图测试"并列的测试入口，让产品和测试人员可以直观地看到三个调研 Agent 并行执行的过程、思维链和最终用户画像。

## What Changes

- 在 ChatPreviewPage 新增第三个 tab "用户画像测试"
- 新建 AudienceTestPage 页面组件，包含：
  - 产品名称输入框 + 开始测试按钮
  - 三列并行 Agent 卡片（产品调研、市场分析、人群调研），每列展示状态和可展开的思维链日志
  - 底部用户画像展示区（generate_persona 输出）
- 新建 audience.ts API 模块，封装 SSE 流式请求到 `POST /workflows/audience_insight_pipeline/run?stream=true`
- 不改后端，复用现有 workflow_run_service 通用 SSE 机制

## Capabilities

### New Capabilities

- `audience-test`: 用户画像测试页面，支持输入产品名称、并行执行三个调研 Agent、流式展示思维链和最终用户画像

### Modified Capabilities

- （无）

## Impact

- 前端新增一个页面组件 `AudienceTestPage.tsx`
- 前端新增一个 API 模块 `audience.ts`
- 修改 `ChatPreviewPage.tsx` 增加第三个 tab
- 后端无改动
