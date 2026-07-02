## Context

当前 data_query Agent 的输入层、数据源、输出层都是城市级聚合，无法支撑品牌定向查询。

本设计将数据源从**城市级统计摘要**升级为**实体级 records**，data_query Agent 内部增加**维度路由层**（根据品牌上下文决定查询哪些维度、用哪些过滤条件），输出层扩展为**带优先级标记的多维数据包**。

本 change 不涉及人群洞察 Agent 的数据接入（接口已预留，接入留到后续人群洞察实现时做）。

## Goals / Non-Goals

**Goals:**
- 盟域 mock 数据从聚合升级为实体级 records（每条盟记录含 sport_type / member_count / total_fee / credit_score 等全部字段，附带 stores 子数组）
- 新增品牌→维度映射表 mock 数据，定义品牌/品类对各维度的查询规则
- data_query Agent 输入扩展：city + brand_name + category + brand_context
- data_query Agent 内部根据品牌上下文做维度路由与过滤
- DataProvider 接口扩展：新增 get_filtered_leagues()、get_filtered_influencers() 等方法
- 工作流 YAML 中 data_query 节点的 input_mapping 扩展

**Non-Goals:**
- 不接入人群洞察 Agent 的输出（预留接口，后续 change 做）
- 不改动 data_query 对外输出的 DataQueryOutput schema 的响应结构（向后兼容）
- 不做自然语言→查询条件的语义解析（当前版本基于硬编码映射表）
- 不涉及真实 API 切换（MVP 保持 mock）
- 不涉及前端变更

## Architecture

### 数据流（变更后）

```
上游 Agent 输出                                     Data Query Agent
┌──────────────────┐    input_mapping     ┌──────────────────────────────────┐
│ intent_recognition│ ──────────────────▶  │ run_data_query(state):           │
│  brand_input: {   │                     │   city ← state.city              │
│    brand_name     │     city            │   brand_name ← state.brand_name  │
│    category       │     brand_name      │   category ← state.category      │
│    city           │     category        │   brand_context ← ...             │
│    budget         │     budget          │                                   │
│    period         │   }                 │   # 1. 查品牌维度映射表            │
└──────────────────┘                      │   mapping = brand_map[category]   │
                                          │                                   │
┌──────────────────┐                      │   # 2. 根据映射路由到各维度        │
│ market_analysis  │   market_context     │   leagues = provider.            │
│  result: {       │ ──────────────────▶  │     get_filtered_leagues(        │
│    market_name   │                     │       city, sport_type=tags,      │
│    target_users  │                     │       min_members=threshold)      │
│    competitors   │                     │   influencers = provider.         │
│  }               │                     │     get_filtered_influencers(    │
└──────────────────┘                     │       city, tier=tier_filter)    │
                                          │   events = provider.             │
                                          │     get_filtered_events(         │
                                          │       city, tags=event_tags)     │
                                          │                                   │
                                          │   # 3. 组装带优先级标记的输出      │
                                          │   return DataQueryOutput(         │
                                          │     city,                         │
                                          │     summary={high_priority:...,   │
                                          │              medium_priority:...},│
                                          │     data={实体records}            │
                                          │     reply=富文本文案               │
                                          │   )                              │
                                          └──────────────────────────────────┘
                                                           │
                                                           ▼
                                                  AllyGo 5 维数据源
                                          ┌────────────────────────┐
                                          │ leagues.json           │
                                          │   └─ stores[]: 商品    │
                                          │        课程/团购       │
                                          │ influencers.json       │
                                          │ brand_dimension_map    │
                                          └────────────────────────┘
```

### DataProvider 接口扩展

```python
class DataProvider(Protocol):
    # 已有
    def get_city_data(self, city: str) -> dict | None: ...
    def list_cities(self) -> list[str]: ...
    
    # 新增—盟域查询
    def get_filtered_leagues(city, sport_type, min_members, sort_by, limit): ...
    # 新增—达人查询
    def get_filtered_influencers(city, sport_type, tier_filter, min_followers, limit): ...
    # 新增—赛事查询
    def get_filtered_events(city, tags, sort_by, limit): ...
    # 新增—经营社查询
    def get_stores_by_league(league_name, store_type): ...
    def get_stores_by_city(city, tag_filter): ...
    # 新增—品牌映射
    def get_brand_dimension_map(brand_name, category): ...
```

### 维度路由逻辑

data_query Agent 内部的核心逻辑——`_route_dimensions()`:

1. 查 brand_dimension_map → 获取品牌品类的 dimension_focus
2. 遍历每个维度（盟域/达人/赛事/经营社/场馆），根据 priority 和 match_tags 过滤
3. 组装带 priority 标记的 summary

### 工作流 YAML 变更

```yaml
- id: data_query
  agent: data_query
  input_mapping:
    city: "$.outputs.intent.brand_input.city"
    brand_name: "$.outputs.intent.brand_input.brand_name"
    category: "$.outputs.intent.brand_input.category"
    budget: "$.outputs.intent.brand_input.budget"
    period: "$.outputs.intent.brand_input.period"
```

## Decisions

### 1. brand_dimension_map — 硬编码 JSON 而非 LLM 动态路由
### 2. 盟域 stores 独立文件 vs 嵌套
### 3. DataProvider 接口扩展 vs 重写

## 文件清单

| 文件 | 动作 | 说明 |
|------|------|------|
| `backend/mock_data/leagues.json` | 新增 | 盟域实体级数据（5 城市 × 33 条） |
| `backend/mock_data/brand_dimension_map.json` | 新增 | 品牌→维度映射表（6 品牌 × 3 品类） |
| `backend/mock_data/influencers.json` | 新增 | 达人实体级数据（5 城市 × 36 条） |
| `backend/mock_data/stores.json` | 新增 | 经营社商品/课程/团购（29 条） |
| `backend/app/services/data_provider.py` | 修改 | DataProvider 接口扩展 |
| `backend/app/agents/data_query_agent.py` | 重写 | 输入扩展 + 维度路由逻辑 |
| `backend/app/schemas/data_query.py` | 修改 | DataQueryOutput 扩展 |
| `backend/workflows/chat_pipeline.yaml` | 修改 | data_query input_mapping 扩展 |
| `backend/app/prompt_templates/data_query.md.j2` | 新增 | 维度路由 prompt 模板 |
| `backend/tests/test_agents/test_data_query.py` | 扩展 | 22 tests, all passed |
