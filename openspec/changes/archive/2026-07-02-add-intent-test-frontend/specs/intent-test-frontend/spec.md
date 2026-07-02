## ADDED Requirements

### Requirement: 用户可以在前端切换至意图测试视图
前端页面 SHALL 提供「对话」与「意图测试」两个视图的切换入口，且默认展示对话视图。

#### Scenario: 默认进入对话视图
- **WHEN** 用户打开 `ChatPreviewPage`
- **THEN** 页面展示现有品牌需求录入对话界面

#### Scenario: 切换至意图测试视图
- **WHEN** 用户点击「意图测试」切换按钮
- **THEN** 页面展示意图测试输入框和结果区域

### Requirement: 用户可以在意图测试视图输入消息并调用工作流
意图测试视图 SHALL 提供输入框和提交按钮，将用户输入通过 `POST /api/v1/workflows/chat_pipeline/run` 发送至后端。

#### Scenario: 输入消息并提交
- **WHEN** 用户在输入框中填写消息并点击提交（或按 Enter）
- **THEN** 前端向后端发送请求，请求体为 `{"input":{"message":"<用户输入>"}}`

#### Scenario: 空输入不提交
- **WHEN** 用户未输入内容或仅输入空白字符时点击提交
- **THEN** 前端不发起请求

### Requirement: 前端展示意图识别结果
请求成功后，意图测试视图 SHALL 展示 `outputs.intent` 中的 `intent`、`confidence`、`reply` 和 `brand_input` 字段。

#### Scenario: 成功返回意图结果
- **WHEN** 后端返回工作流执行结果
- **THEN** 页面以结构化形式展示意图类型、置信度、回复文案和品牌输入字段

#### Scenario: 请求失败展示错误信息
- **WHEN** 后端返回 4xx/5xx 或网络异常
- **THEN** 页面展示中文错误提示，不展示上一次结果

### Requirement: 前端复用现有 API 基础设置
工作流调用 SHALL 复用现有 axios 基础配置（baseURL、timeout、headers），错误处理风格与 `api/chat.ts` 保持一致。

#### Scenario: 后端未启动
- **WHEN** 后端服务不可用时用户提交消息
- **THEN** 页面提示「无法连接到服务器，请确认后端已启动」

#### Scenario: 后端返回 500
- **WHEN** 后端返回 500 错误时
- **THEN** 页面提示「服务器处理失败，请重试」
