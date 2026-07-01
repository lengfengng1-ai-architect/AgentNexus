## Why

营销方案生成需要先了解产品本身是什么——产品名称、品牌、规格、定位等基本信息。目前系统缺少自动化的产品信息调研能力，需要人工搜索整理，效率低且信息结构化程度不足。实现产品调研 Agent 后，品牌方只需输入产品名称即可自动获取结构化的产品信息，为后续的营销方案生成提供数据基础。

## What Changes

- 新增 `product-research` 能力：产品基础信息调研 Agent
- 新增 FastAPI 端点 `/api/v1/product-info`，接收产品名称，返回结构化产品信息
- 新增 LangGraph Agent，流程：用户输入 → WebSearch 搜索 → WebFetch 读原文 → LLM 提取结构化信息 → 保存 JSON
- 新增 `mock_data/product_info/` 目录，存放调研结果 JSON
- 更新 `docs/superpowers.yaml`，将 `product-research` 加入 in_scope

## Capabilities

### New Capabilities
- `product-research`: 产品基础信息调研。输入产品名称，自动搜索并提取结构化产品信息（名称、别名、品牌、厂商、行业、类别、描述、上市时间、状态、官网、销售区域、规格参数），返回含信息来源的 JSON。

### Modified Capabilities

（无，现有能力需求不变）

## Impact

- **后端新增**：`backend/app/agents/product_research_agent.py` — LangGraph Agent
- **后端新增**：`backend/app/schemas/product_info.py` — Pydantic model
- **后端新增**：`backend/app/routers/product_info.py` — FastAPI 路由
- **后端新增**：`backend/app/services/product_info_service.py` — Service 层
- **后端新增**：`backend/app/prompt_templates/product_research.md.j2` — Prompt 模板
- **后端新增**：`backend/mock_data/product_info/` — 调研结果存储
- **配置更新**：`backend/app/config/settings.py` — 可能新增搜索相关配置
- **文档更新**：`docs/superpowers.yaml` — 新增 in_scope ID
- **非功能变更**：不涉及数据库变更，不涉及前端变更，不涉及现有 API 改动
