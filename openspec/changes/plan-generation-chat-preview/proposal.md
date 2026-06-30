## Why

营销方案生成的第一步是把用户非结构化的品牌需求（如"我们是 Nike，想在上海做跑步活动，预算 50 万"）转化为结构化字段。当前系统只有健康检查接口，没有对话式输入能力。本 change 增加一个最小可用的 chat agent，让品牌方可以通过自然语言对话录入需求，为后续方案生成做准备。

## What Changes

- 新增 `POST /api/v1/chat` 端点，接收用户自然语言输入，返回 Agent 回复和提取的品牌需求字段
- 新增 `app/agents/` 模块，使用 LangGraph + DeepAgents 构建简单状态机 Agent
- Agent 调用阿里百炼（通义千问）API，API key 和模型通过 `.env` 配置
- Agent 行为：
  - 信息完整时返回结构化品牌需求字段
  - 信息不完整时反问用户补充关键字段
- 新增 `backend/.env.example`，列出所需环境变量
- 不实现前端页面，仅提供 API
- 不保存对话历史到数据库

## Capabilities

### New Capabilities

- `plan-generation-chat-preview`: 基于自然语言对话提取品牌需求字段，作为 plan-generation 的前置输入能力

### Modified Capabilities

- 无

## Impact

- 新增依赖：`langchain-community` 或等效阿里百炼适配包（如果 deepagents 不直接支持）
- 新增环境变量：`DASHSCOPE_API_KEY`, `DASHSCOPE_MODEL`
- 新增 router、schema、service、agent 模块
- 为后续 brand-input 端点提供对话式补充入口

## Non-goals

- 不实现前端 UI 页面（属于后续 change）
- 不保存对话历史或会话状态
- 不实现完整营销方案生成（只做到需求提取）
- 不接入真实品牌数据库或用户认证系统
- LLM 不编造厂商/赛事/达人名称或数据数值
