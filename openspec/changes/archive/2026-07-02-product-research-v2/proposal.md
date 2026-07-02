## Why

第一版产品调研 Agent 的信息结构过于简单（平铺的 BasicInfo），缺乏可验证溯源能力。实际使用时要求每个字段必须标注来源，区分原文摘录和 AI 综合提取，并新增功能特性清单、官方描述等多维信息。本次重构旨在输出结构更严谨、可验证、可溯源的产品调研结果。

## What Changes

- **BREAKING**：重构 ProductInfo schema，按 identity / official_description / features / specifications / availability 五大模块组织
- 新增 `SourcedStr` 基础类型：value + sources[] + method(quoted/extracted) + quote
- 新增 `official_description` 模块：description + tagline + statement，优先原文摘录
- 新增 `features[]` 模块：每个功能独立标注 evidence[]
- 新增 `availability` 模块：status + pricing[] + regions + access_model
- 重构 `identity` 模块：product_name + brand + manufacturer + industry + category
- 保留 `specifications` 动态字典结构
- 每个字段必须标注 method（quoted=原文摘录 / extracted=AI综合提取）
- 不依赖模型主观推断，不补充官方未说明信息

## Capabilities

### New Capabilities

（无，更新已有 capability）

### Modified Capabilities

- `product-research`: 输出 schema 从平铺 BasicInfo 重构为五大模块带溯源结构，新增 features 和 availability 信息维度

## Impact

- `backend/app/schemas/product_info.py`：完全重写，新增 SourcedStr 溯源类型、Identity/OfficialDescription/Feature/PriceItem/Availability 等模块
- `backend/app/agents/product_research_agent.py`：适配新 schema，agent 节点逻辑需调整（identity 直接提取，description 优先 quote，features 逐条标注证据）
- `backend/app/prompt_templates/product_research.md.j2`：完全重写，要求 LLM 标注 method 和 quote
- `backend/app/services/product_info_service.py`：适配新的 ProductInfo 类型
- `backend/app/routers/product_info.py`：无需更改（保持接口不变）
- `backend/tests/`：所有测试文件需同步更新
- `docs/superpowers.yaml`：无需更改
