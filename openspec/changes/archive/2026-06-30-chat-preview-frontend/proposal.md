## Why

当前 `plan-generation-chat-preview` 只暴露了 `POST /api/v1/chat` 接口，品牌方用户需要一个入口来与 Agent 对话。一个专门设计的前端聊天界面可以降低中小品牌操盘手首次使用门槛，让他们用自然语言完成需求录入，而不是学习结构化表单。

## What Changes

- 初始化 `frontend/` 目录为 React + TypeScript + Vite 项目
- 实现单页聊天界面 `ChatPreviewPage`，对接 `POST /api/v1/chat`
- 顶部固定显示"进度跑道"：5 个字段槽（brand_name, category, city, budget, period），随对话逐步点亮
- 消息流采用居中垂直堆叠布局，支持用户消息、AI 消息、加载骨架屏
- 底部固定悬浮输入框，支持 Enter 发送、Shift+Enter 换行
- 字段卡可点击，点击后在底部输入框预填充修改提示
- 错误处理：顶部错误提示条 + 失败消息旁重试按钮
- 欢迎界面：标题 + 3 个场景卡片 + 自由输入
- 本地历史：用 localStorage 保存完整 message 数组
- 样式采用"跑道美学"设计系统（见 design.md）
- 响应式适配桌面与移动端

## Capabilities

### New Capabilities

- `chat-preview-frontend`: 营销方案 Agent 的前端聊天入口界面

### Modified Capabilities

- None

## Impact

- 新增 `frontend/` 目录及所有前端文件
- 后端 `POST /api/v1/chat` 接口不变，但会通过浏览器 CORS 调用
- 需要为开发环境配置后端 CORS（开发阶段允许 `localhost:5173`）
- 不引入新的后端依赖或数据模型
- 不影响现有测试和 Agent 实现
