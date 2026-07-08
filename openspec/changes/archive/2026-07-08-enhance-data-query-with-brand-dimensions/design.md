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
    def get_filtered_leagues(
        self,
        city: str,
        sport_type: list[str] | None = None,     # 运动类型过滤
        min_members: int | None = None,           # 最小成员数
        sort_by: str | None = None,               # 排序字段
        limit: int = 20,
    ) -> list[dict]: ...
    
    # 新增—达人查询
    def get_filtered_influencers(
        self,
        city: str,
        sport_type: list[str] | None = None,
        tier_filter: list[str] | None = None,     # 达人等级过滤
        min_followers: int | None = None,
        limit: int = 20,
    ) -> list[dict]: ...
    
    # 新增—赛事查询
    def get_filtered_events(
        self,
        city: str,
        tags: list[str] | None = None,
        sort_by: str | None = None,
        limit: int = 20,
    ) -> list[dict]: ...
    
    # 新增—经营社商品/课程/团购查询
    def get_stores_by_league(
        self, league_name: str, store_type: str | None = None
    ) -> list[dict]: ...

    # 新增—品牌→维度映射表
    def get_brand_dimension_map(
        self, brand_name: str, category: str
    ) -> dict | None: ...
```

### 维度路由逻辑

data_query Agent 内部的核心逻辑——`_route_dimensions()`:

```python
def _route_dimensions(
    brand_name: str,
    category: str,
    city_data: dict,
) -> dict:
    """根据品牌信息从 brand_dimension_map 路由到各维度，裁剪和加权"""
    
    mapping = get_data_provider().get_brand_dimension_map(brand_name, category)
    if not mapping:
        # fallback: 返回全量摘要
        return _build_city_summary(city_data)
    
    focus = mapping["dimension_focus"]
    result = {}
    
    for dim, config in focus.items():
        priority = config["priority"]   # high / medium / low
        tags = config.get("match_tags", [])
        tier_filter = config.get("tier_filter")
        
        if dim == "盟域":
            leagues = provider.get_filtered_leagues(
                city_data["city"], sport_type=tags, limit=20
            )
            result["leagues"] = {
                "items": leagues,
                "total": len(leagues),
                "priority": priority,
                "summary": f"找到 {len(leagues)} 个相关盟域",
            }
        elif dim == "达人":
            influencers = provider.get_filtered_influencers(
                city_data["city"], sport_type=tags, tier_filter=tier_filter
            )
            result["influencers"] = {
                "items": influencers,
                "total": len(influencers),
                "priority": priority,
                ...
            }
        # ... 类似处理赛事/经营社/场馆
    
    return result
```

### DataQueryOutput 结构变化

```python
class DataQueryOutput(BaseModel):
    """数据查询 Agent 的结构化输出"""
    
    city: str = Field(...)
    
    # summary 从扁平统计扩展为带优先级标记的嵌套结构
    summary: dict = Field(
        default_factory=dict,
        description="按维度聚合的数据摘要，含 priority 标记"
    )
    
    # data 从原始 mock 数据片段扩展为实体级 records
    data: dict = Field(
        default_factory=dict,
        description="实体级数据，按维度分组"
    )
    
    reply: str = Field(..., description="用户可读的数据摘要文案")
    available_cities: list[str] = Field(
        default_factory=list, description="当城市不存在时返回的支持列表"
    )
    
    # 新增
    dimension_priorities: dict = Field(
        default_factory=dict,
        description="各维度的优先级标记，如 {盟域: high, 达人: high, 经营社: medium}"
    )
```

### 工作流 YAML 变更

```yaml
# chat_pipeline.yaml 中 data_query 节点
- id: data_query
  agent: data_query
  condition: "$.outputs.intent.intent == 'query_data'"
  input_mapping:
    city: "$.outputs.intent.brand_input.city"
    brand_name: "$.outputs.intent.brand_input.brand_name"
    category: "$.outputs.intent.brand_input.category"
    budget: "$.outputs.intent.brand_input.budget"
    period: "$.outputs.intent.brand_input.period"
```

## Decisions

### 1. brand_dimension_map — 硬编码 JSON 而非 LLM 动态路由
- **选择**：品牌→维度映射关系以配置文件（JSON）形式硬编码
- **理由**：映射规则是业务知识（跑鞋品牌应该关注跑步盟和跑步赛事），LLM 动态生成可能不准确且不可复现。硬编码 JSON 文件方便品牌运营团队直接编辑，可测试
- **替代方案**：LLM 动态分析品牌关联运动 — 不可靠，不可复现

### 2. 盟域 stores 嵌套 vs 独立文件
- **选择**：经营社商品/课程/团购独立成 `stores.json`，通过 `league_name` 关联
- **理由**：mock-data.md 规范说数据应放在独立文件中按 ID 关联；独立文件便于按类型查询
- **替代方案**：嵌套在 leagues 记录内 — 文件过大，违反 mock-data.md 规范

### 3. DataProvider 接口扩展 vs 保留原接口
- **选择**：在 DataProvider Protocol 中新增带参数的查询方法，保留 `get_city_data` 向后兼容
- **理由**：已有调用方依赖 `get_city_data`，不应破坏。新增的带参数方法不会被其他模块调用，不会产生耦合
- **替代方案**：重写 `get_city_data` 接受更多参数 — 破坏现有调用方

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| brand_dimension_map 维护成本 | 初始只覆盖 3-5 个典型品牌品类，后续通过运营配置 |
| 实体级数据量大（盟域数百条） | get_filtered_leagues 默认 limit=20，支持分页 |
| 盟域 stores 关联查询性能 | MVP 阶段数据结构小，直接全量加载后过滤 |
| 人群洞察接口预留过度设计 | 只预留 `audience_profile: dict | None = None` 一个接口字段 |
| 两个数据源（allygo_city_data + 新 JSON）并行 | mock 数据规范建议文件扁平，新旧并行过渡可接受 |

## 文件清单

| 文件 | 动作 | 说明 |
|------|------|------|
| `backend/mock_data/leagues.json` | 新增 | 盟域实体级数据（5 城市 × 每条含 stores[]） |
| `backend/mock_data/brand_dimension_map.json` | 新增 | 品牌→维度映射表 |
| `backend/mock_data/influencers.json` | 新增 | 达人实体级数据 |
| `backend/mock_data/stores.json` | 新增 | 经营社商品/课程/团购 |
| `backend/app/services/data_provider.py` | 修改 | DataProvider 接口扩展 |
| `backend/app/agents/data_query_agent.py` | 修改 | 输入扩展 + 维度路由逻辑 |
| `backend/app/schemas/data_query.py` | 修改 | DataQueryOutput 扩展 |
| `backend/workflows/chat_pipeline.yaml` | 修改 | data_query input_mapping 扩展 |
| `backend/app/prompt_templates/data_query.md.j2` | 新增 | 维度路由 prompt 模板 |
| `backend/tests/test_agents/test_data_query.py` | 修改 | 扩展测试覆盖 |
