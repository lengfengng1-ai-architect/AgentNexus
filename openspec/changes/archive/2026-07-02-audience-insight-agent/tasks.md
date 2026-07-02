## 1. Schema 定义

- [x] 1.1 创建 `backend/app/schemas/audience_insight.py` — AudienceRawData（人群调研原始数据）
- [x] 1.2 创建 UserPersona 及相关 model（SourcedStr、FeaturePreference 等）
- [x] 1.3 创建请求/响应 schema

## 2. Prompt 模板

- [x] 2.1 创建 `backend/app/prompt_templates/audience_insight.md.j2` — 人群信息提取 prompt
- [x] 2.2 创建 `backend/app/prompt_templates/persona_generation.md.j2` — 用户画像生成 prompt

## 3. Agent 实现

- [x] 3.1 创建 `backend/app/agents/audience_insight_agent.py` — 搜索人群数据 → 提取 → 生成画像

## 4. Service 层

- [x] 4.1 创建 `backend/app/services/audience_insight_service.py` — 调研 + 画像生成 + 两级缓存 + 持久化

## 5. API 路由

- [x] 5.1 创建 `backend/app/routers/audience_insight.py` — POST /api/v1/audience-insight
- [x] 5.2 在 main.py 中注册新路由

## 6. 能力边界更新

- [x] 6.1 更新 `docs/superpowers.yaml`

## 7. 测试

- [x] 7.1 创建 `backend/tests/test_agents/test_audience_insight_agent.py`
- [x] 7.2 创建 `backend/tests/test_routers/test_audience_insight.py`

## 8. Mock 数据

- [x] 8.1 创建 `backend/mock_data/audience_insight/` 目录
- [x] 8.2 创建 `backend/mock_data/user_persona/` 目录
- [x] 8.3 运行一次示例调研，生成示例 JSON
