## Context

当前后端只有健康检查接口，没有对话式交互能力。营销方案生成的输入环节需要把用户的自然语言描述（如"我们是 Nike，想在上海做跑步活动，预算 50 万"）转换成结构化品牌需求字段，作为后续 plan-generation 的输入。

本 change 通过 LangGraph + DeepAgents + 阿里百炼实现一个最小 chat agent，仅做需求提取，不做完整方案生成。

## Goals / Non-Goals

**Goals:**
- 提供 `POST /api/v1/chat` 对话端点
- 用 LangGraph 构建状态机 Agent：接收输入 → 调用 LLM → 判断完整/不完整 → 返回回复 + 结构化字段
- 通过 `.env` 配置阿里百炼 API key 和模型
- 提取字段：brand_name, category, city, budget（万元）, period（月）
- 每个端点覆盖 200/400/422/500 测试

**Non-Goals:**
- 不实现前端页面
- 不保存对话历史
- 不接入真实数据库
- 不做完整营销方案生成
- LLM 不编造厂商/赛事/达人名称或数据数值

## Decisions

### 1. Agent 框架：LangGraph + DeepAgents

- 项目约束强制要求 LangGraph + DeepAgents
- Agent 状态图包含两个节点：
  - `extract`: 调用 LLM 提取字段
  - `check`: 判断是否完整，决定返回结果或反问
- 最终输出统一格式，不暴露内部状态转移

### 2. LLM Provider：阿里百炼（通义千问）

- 通过 `langchain_community.chat_models.ChatTongyi` 或 deepagents 支持的等价封装调用
- 模型名通过 `.env` 的 `DASHSCOPE_MODEL` 配置，默认 `qwen-turbo`
- API key 通过 `.env` 的 `DASHSCOPE_API_KEY` 配置

### 3. 输出结构

```json
{
  "reply": "AI 回复文本",
  "brand_input": {
    "brand_name": "Nike",
    "category": "running_shoes",
    "city": "上海",
    "budget": 50,
    "period": 3
  },
  "is_complete": true
}
```

字段缺失时 `is_complete: false`，缺失字段为 `null`，`reply` 引导用户补充。

### 4. Prompt 模板

- 使用 Jinja2 模板，放在 `app/prompt_templates/chat_extraction.md.j2`
- 模板中明确约束 LLM：
  - 不要编造厂商/赛事/达人名称
  - budget 单位是万元
  - period 单位是月
  - 只返回 JSON，不要 markdown 代码块

### 5. 数据流

```
用户输入 → POST /api/v1/chat
              ↓
         ChatRequest schema
              ↓
         chat_service.extract_brand_input()
              ↓
         LangGraph Agent
              ↓
         调用阿里百炼 LLM
              ↓
         ChatResponse（reply + brand_input + is_complete）
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| LLM 输出不稳定，JSON 解析失败 | 使用 Pydantic 解析 + 重试，LLM prompt 要求严格 JSON |
| 阿里百炼 API 不可用 | 测试用 mock LLM 响应；预留 model provider 切换接口 |
| DeepAgents 对通义千问支持不完善 | 先用 langchain-community 封装，不依赖 deepagents 内置 model |
| budget/period 单位歧义 | prompt 明确单位，schema 用 description 标注 |

## Migration Plan

- 合并后创建 `backend/.env` 并填入 `DASHSCOPE_API_KEY`
- 运行 `uv sync` 安装新增依赖
- 运行 `uv run pytest -v` 验证

## Open Questions

- 是否需要在后续 change 中加入对话历史？（当前不保存）
- 是否需要在后续 change 中把提取结果写入 brand-input 持久化？（当前只做 API 返回）
