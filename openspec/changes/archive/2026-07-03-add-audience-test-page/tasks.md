## 1. 前端 API 模块

- [x] 1.1 新建 `frontend/src/api/audience.ts`，封装对 `POST /workflows/audience_insight_pipeline/run?stream=true` 的 SSE 流式请求
- [x] 1.2 实现 SSE 流解析：按 `workflow.start` / `node.start` / `node.log` / `node.complete` / `node.failed` / `workflow.complete` 事件类型分发

## 2. AudienceTestPage 组件

- [x] 2.1 新建 `frontend/src/pages/AudienceTestPage.tsx`，实现产品名称输入框和"开始测试"按钮
- [x] 2.2 实现三列 Agent 卡片布局（product_research、market_analysis、audience_search），每列显示状态和可展开的思维链日志
- [x] 2.3 实现 useReducer 状态管理：按 nodeId 分组维护各 Agent 的状态和执行日志
- [x] 2.4 实现底部用户画像展示区域，在 generate_persona 完成后渲染结构化数据
- [x] 2.5 处理 loading/error/empty 状态：输入为空禁用按钮、执行中禁用输入、失败显示错误信息

## 3. 集成到现有页面

- [x] 3.1 修改 `ChatPreviewPage.tsx`，新增第三个 tab "用户画像测试"并引入 AudienceTestPage
