## Why

营销方案需要知道"产品卖给谁"，但目前系统只有产品基础信息调研，缺少目标人群的洞察能力。人群洞察 Agent 基于产品调研结果 + 市场调研结果 + 自身网络调研，生成结构化的用户画像，为营销方案的受众分析和创意策略提供数据基础。

## What Changes

- 新增 `audience-insight` 能力：人群洞察 Agent
- 新增 `backend/app/schemas/audience_insight.py`：人群调研原始数据 schema + 用户画像 schema
- 新增 `backend/app/agents/audience_insight_agent.py`：LangGraph Agent（产品信息→搜索目标人群信息→提取结构化人群数据→生成用户画像）
- 新增 `backend/app/prompt_templates/audience_insight.md.j2`：人群信息提取 prompt
- 新增 `backend/app/prompt_templates/persona_generation.md.j2`：用户画像生成 prompt
- 新增 `backend/app/services/audience_insight_service.py`：Service 层
- 新增 `backend/app/routers/audience_insight.py`：FastAPI 端点
- 新增 `backend/mock_data/audience_insight/`：人群调研原始结果存储
- 新增 `backend/mock_data/user_persona/`：用户画像存储
- 更新 `docs/superpowers.yaml`：新增 `audience-insight` 到 in_scope

## Capabilities

### New Capabilities
- `audience-insight`: 人群洞察 Agent。接收产品名称（或产品调研结果），搜索并提取目标人群的原始数据（人口统计、购买行为、使用场景等），综合生成结构化的用户画像。

### Modified Capabilities
- `product-research`: 人群洞察 Agent 依赖于产品调研结果作为输入，但产品调研自身接口不变。

## Impact

- **schema 新增**：`backend/app/schemas/audience_insight.py` —— AudienceRawData（人群原始数据）、UserPersona（用户画像）等 model
- **Agent 新增**：`backend/app/agents/audience_insight_agent.py`
- **prompt 新增**：`backend/app/prompt_templates/audience_insight.md.j2`、`persona_generation.md.j2`
- **service 新增**：`backend/app/services/audience_insight_service.py`
- **router 新增**：`backend/app/routers/audience_insight.py`
- **mock 数据新增**：`backend/mock_data/audience_insight/`、`backend/mock_data/user_persona/`
- **配置更新**：`docs/superpowers.yaml`
