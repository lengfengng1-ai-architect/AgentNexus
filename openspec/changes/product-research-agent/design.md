## Context

产品信息调研是 AllyGo 营销方案生成流程的前置环节。品牌方输入产品名称后，系统需要自动获取该产品的结构化基础信息（名称、品牌、规格等），为后续的适配度评估和方案生成提供数据基础。

现有系统已有品牌需求录入（brand-input）能力，产品调研将作为独立的能力模块与之协作。MVP 阶段聚焦产品基础信息，后续可扩展产品功能、产品定位、竞品信息等类别。

## Goals / Non-Goals

**Goals:**
- 实现产品基础信息调研 Agent，支持通过产品名称获取结构化产品信息
- 使用策略二（WebSearch + WebFetch 深度读页）保证信息来源可追溯
- 提供 REST API 端点触发调研
- 调研结果持久化为 JSON 文件到 mock_data/product_info/
- 每个信息字段标记来源 URL

**Non-Goals:**
- 不实现产品功能、产品定位、竞品信息等后续类别（仅预留扩展结构）
- 不涉及前端界面（仅后端 API）
- 不做实时市场数据抓取（MVP 阶段基于公开网页信息）
- 不涉及电商价格监控

## Architecture

### 系统层次

```
┌──────────────────────────────────────────────────────────┐
│                    FastAPI Router                         │
│  POST /api/v1/product-info → product_info_service         │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│                ProductInfoService                         │
│  接收 product_name → 调用 Agent → 返回结果 → 保存 JSON    │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│            ProductResearchAgent (LangGraph)               │
│                                                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────┐     │
│  │ search   │──▶│ fetch    │──▶│ extract          │     │
│  │ node     │   │ pages    │   │ (LLM 结构化输出)   │     │
│  └──────────┘   └──────────┘   └────────┬─────────┘     │
│                                         │               │
│                                         ▼               │
│                                  ProductInfo (JSON)      │
└──────────────────────────────────────────────────────────┘
```

### Agent 流程 (LangGraph)

```
用户输入 "iPhone 16"
      │
      ▼
┌──────────────────────┐
│  Step 1: search_node │
│  调用 WebSearch       │
│  "iPhone 16 产品规格" │
│  搜索 3-5 个高质量页面 │
└──────────┬───────────┘
           │ URLs: [apple.cn, baike, zol, ...]
           ▼
┌──────────────────────┐
│  Step 2: fetch_node  │
│  逐个 WebFetch 页面   │
│  收集全文内容          │
│  (跳过失败页面)        │
└──────────┬───────────┘
           │ 页面全文内容
           ▼
┌──────────────────────┐
│  Step 3: extract_node│
│  LLM 基于原文提取     │
│  结构化 ProductInfo  │
│  标注每个字段来源 URL  │
└──────────┬───────────┘
           │ ProductInfo JSON
           ▼
┌──────────────────────┐
│  Step 4: save_node   │
│  写入 mock_data/     │
└──────────────────────┘
```

### Data Model

```python
class ProductInfo(BaseModel):
    product_name: str
    aliases: list[str] = []
    brand: str | None = None
    manufacturer: str | None = None
    industry: str | None = None
    category: str | None = None
    subcategory: str | None = None
    description: str | None = None
    launch_date: str | None = None
    status: str | None = None        # 在售/预售/停售/unknown
    official_website: str | None = None
    available_regions: list[str] = []
    specifications: dict = {}         # 动态调整，根据产品类型
    sources: list[SourceInfo]         # 信息来源

class SourceInfo(BaseModel):
    url: str
    title: str | None = None
    accessed_at: str                  # ISO 时间戳
```

### 信息类别扩展设计

`ProductInfo` 使用组合模式预留扩展：

```python
class ProductInfo(BaseModel):
    # 基础信息 — 当前实现
    basic: BasicInfo
    sources: list[SourceInfo]

    # 后续扩展（ProductInfo 自身不变，新增 category 字段）
    # features: ProductFeaturesInfo | None = None   # 后续
    # positioning: ProductPositioningInfo | None = None  # 后续
    # competitors: ProductCompetitorInfo | None = None   # 后续
```

## Decisions

### 1. 策略二（搜索+读页）而非纯搜索摘要
- **选择**：WebSearch → 筛选 → WebFetch 逐个读页 → LLM 提取
- **理由**：纯搜索摘要信息量不足且可能失真（摘要片段不含完整上下文）。深度读页可以获取完整原文，LLM 基于实际内容提取，大幅降低幻觉风险，且每个字段可追溯至具体页面
- **替代方案**：纯 WebSearch + LLM 直接提取 — 速度快但准确度低，来源 URL 可能是"幻觉性引用"

### 2. 搜索结果筛选策略
- **选择**：先搜索，将结果传给 LLM 做一轮质量筛选（优先官网、百科、权威媒体），再读取
- **理由**：避免读取低质量页面（论坛、UGC 内容等），节省时间和 token
- **替代方案**：无筛选全部读取 — token 消耗大，低质内容影响提取质量

### 3. 持久化方式
- **选择**：调研结果 JSON 存入 `mock_data/product_info/`，与现有 mock 数据规范一致
- **理由**：调研结果可以复用（同一产品不必每次重新搜索），也便于后续其它模块引用
- **替代方案**：仅返回不存储 — 每次请求都要重新搜索，浪费资源

### 4. 结构化输出使用 with_structured_output
- **选择**：沿用现有 chat_extraction_agent 的 `with_structured_output` + Pydantic schema 方式
- **理由**：与项目现有 Agent 模式一致，开发成本低，等后续复杂了再升级到 DeepAgents
- **替代方案**：先用 DeepAgents 实现 — 但当前 Agent 逻辑简单（线性 3 步），LangGraph 足够

### 5. 缓存策略（防重复调研）
- **选择**：先查 `mock_data/product_info/` 下是否存在同名 JSON，存在则直接返回，不存在才执行完整调研
- **理由**：同一产品的调研结果应可复用，避免重复搜索浪费资源和时间。产品基础信息变更频率低，缓存有效
- **替代方案**：不缓存每次重新搜索 — 浪费严重，用户体验差

### 5. 信息类别使用嵌套结构
- **选择**：`ProductInfo` 使用嵌套 model（`basic: BasicInfo`），后续类别以可选字段追加
- **理由**：基础信息是必填的，后续类别是可选扩展的，嵌套结构清晰且不破坏向后兼容
- **替代方案**：扁平的 `ProductInfo` 带所有字段 — 后续加类别会导致 model 膨胀且不直观

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| WebFetch 可能被目标网站屏蔽 | 设置合理的 User-Agent 和请求间隔，失败时跳过该页面 |
| 搜索结果质量不稳定 | 使用 LLM 筛选高置信度页面，官网优先 |
| 英文产品的中文搜索结果有限 | 搜索时同时使用中英文关键词 |
| 调研时间较长（15-30s） | API 异步返回，前端显示 loading 状态 |
| LLM 提取仍存在少量幻觉 | 每个字段强制标注 source URL，人可追溯验证 |

## 文件清单

| 文件 | 说明 |
|------|------|
| `backend/app/schemas/product_info.py` | ProductInfo Pydantic model |
| `backend/app/prompt_templates/product_research.md.j2` | Agent prompt 模板 |
| `backend/app/agents/product_research_agent.py` | LangGraph Agent |
| `backend/app/services/product_info_service.py` | Service 层 |
| `backend/app/routers/product_info.py` | FastAPI 路由 |
| `backend/mock_data/product_info/` | 调研结果 JSON 存储目录 |
| `docs/superpowers.yaml` | 更新 in_scope |
