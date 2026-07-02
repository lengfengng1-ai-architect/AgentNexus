## 1. 类型与 API 层

- [x] 1.1 创建 `frontend/src/types/workflow.ts`，定义 `WorkflowRunRequest`、`WorkflowRunResponse`、`IntentRecognitionResult` 类型。
- [x] 1.2 创建 `frontend/src/api/workflow.ts`，复用 axios 基础配置，实现 `runChatPipeline(message)` 并统一错误处理。

## 2. 意图测试页面组件

- [x] 2.1 创建 `frontend/src/pages/IntentTestPage.tsx`，包含输入框、提交按钮、结果展示区（展示 intent / confidence / reply / brand_input）和错误提示。
- [x] 2.2 在 `frontend/src/pages/ChatPreviewPage.tsx` 中增加「对话 / 意图测试」切换，默认展示 `ChatContainer`。

## 3. 验证与清理

- [x] 3.1 运行 `cd frontend && npm run build` 确认 TypeScript 编译通过。
- [x] 3.2 运行 `cd frontend && npm run lint` 检查无新增 lint 问题（仅存在既有文件 `ProgressTrack.tsx` 的 `only-export-components` 警告，非本次改动引入）。
- [x] 3.3 启动前后端，手动验证输入「你好」「查询上海数据」「我是 Nike 做上海推广预算 50 万周期 3 个月」等能正确展示意图结果。
