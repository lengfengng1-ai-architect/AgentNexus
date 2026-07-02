## Context

第一版产品调研 Agent（v1）的 schema 为平铺的 BasicInfo，每个字段只包含 values + sources。实际使用中发现需要更严谨的信息分类和溯源机制：

- 信息类别不清晰（description、launch_date、specifications 混在一个层级）
- 缺乏原文摘录与 AI 综合提取的区分（所有字段都是 AI 概括的，不可验证）
- 产品功能列表缺失
- availability 信息不完整（缺少 pricing、access_model）
- 无法判断哪些值是原文来的、哪些是 AI 推测的

本次重构基于 v1 的 Agent 流程，仅重构 schema 和提取逻辑。

## Goals / Non-Goals

**Goals:**
- 重构输出 schema 为 identity / official_description / features / specifications / availability 五大模块
- 每个字段标注 method（quoted/extracted）和 sources 实现可追溯
- 新增 features 功能列表模块，每个功能独立标注证据
- 新增 availability 完整模块（含 pricing、access_model）
- official_description 优先从官网原文摘录（quoted）

**Non-Goals:**
- 不改变 Agent 的执行流程（search → fetch → extract → enrich 不变）
- 不改变缓存策略
- 不改变 API 端点

## Data Model

```python
# ── 基础溯源类型 ──────────────────────

class SourcedStr(BaseModel):
    """带溯源的字符串字段。"""
    value: str | None = None
    sources: list[str] = Field(default_factory=list)
    method: str = "extracted"  # quoted=原文摘录 / extracted=AI综合提取
    quote: str | None = None   # quoted 模式的原文引用片段

class SourcedStrList(BaseModel):
    value: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
    method: str = "extracted"

class SourcedDict(BaseModel):
    value: dict = Field(default_factory=dict)
    sources: list[str] = Field(default_factory=list)
    method: str = "extracted"


# ── 五大模块 ──────────────────────────

class Identity(BaseModel):
    """产品标识。method=extracted（从页面元信息提取）。"""
    product_name: SourcedStr     # 必须来自官网/包装/文档，method=quoted
    brand: SourcedStr
    manufacturer: SourcedStr
    industry: SourcedStr
    category: SourcedStr

class OfficialDescription(BaseModel):
    """官方描述。优先 quoted。"""
    description: SourcedStr      # 官网介绍文本
    tagline: SourcedStr          # 官方 slogan/标语
    statement: SourcedStr        # 正式定义，PR/whitepaper

class Feature(BaseModel):
    """产品功能，每个独立标注来源。"""
    name: str
    category: str | None = None
    description: str
    evidence: list[str] = Field(default_factory=list)

class PriceItem(BaseModel):
    """结构化价格信息。"""
    label: str | None = None
    price: str | None = None
    currency: str | None = None
    source: str | None = None

class Availability(BaseModel):
    """可获得性。"""
    status: SourcedStr
    pricing: list[PriceItem] = Field(default_factory=list)
    available_regions: SourcedStrList = Field(default_factory=SourcedStrList)
    access_model: SourcedStr

class ProductResearchResult(BaseModel):
    identity: Identity
    official_description: OfficialDescription
    features: list[Feature] = Field(default_factory=list)
    specifications: dict = Field(default_factory=dict)
    availability: Availability
```

## Agent 流程调整

v1 的四步图不变，主要改动集中在 extract_node 的 prompt 和输出 schema：

```
search → fetch → extract → enrich_website → END
                          │
                          └── 改用新 schema ProductResearchResult
                              └── official_description 优先 quoted
                                  └── features 逐条标注 evidence
```

### Extract 节点逻辑

LLM 读取所有有效页面后：
1. **identity**：从页面元信息、标题、面包屑提取，method=extracted
2. **official_description**：
   - 先在官网页面找工整的描述段落/标语 → 找到则 method=quoted，value+quote 为原文
   - 找不到则从其他权威页面提取，method=extracted
3. **features**：扫描所有页面，识别明确的功能点列表 → 逐条输出 name/category/description/evidence
4. **specifications**：从规格表/参数表提取，动态结构
5. **availability**：从页面提取状态/价格/地区/交付方式

### Enrich 节点

v1 的策略不变——单独搜官网补 official_website，合并到 identity 还是 availability 待定（看产品类型）。

## Decisions

### 1. method 区分 quoted/extracted
- **选择**：每个 SourcedStr 携带 method 字段
- **理由**：用户要求明确区分"原文摘录"和"AI综合提取"，method 字段是唯一让下游信任判断的依据
- **替代方案**：不区分——无法满足可验证需求

### 2. features 的 evidence 独立标注
- **选择**：每个功能有自己的 evidence[]，不与其他功能共享
- **理由**：不同功能可能来自页面不同位置，合并 sources 反而模糊了证据来源
- **替代方案**：全局 sources——不精确，无法对单个功能验证

### 3. official_description 优先 quoted
- **选择**：先尝试在官网找原文摘录，找不到才退回到 extracted
- **理由**：描述/标语/定义类信息最需要精确性，有官网原文就不需要 AI 概括
- **替代方案**：全部 extracted——失去验证能力；全部 quoted——官网没有工整描述时就拿不到数据

### 4. pricing 用 PriceItem 动态结构
- **选择**：label+price+currency+source 的数组结构
- **理由**：不同类型产品价格结构差异大（手机按容量分档、饮料按规格、软件按订阅），固定字段无法覆盖
- **替代方案**：把 pricing 放进 specifications——但价格与规格局性不同，价格有独立的时效性和来源

## Risks

| Risk | Mitigation |
|------|-----------|
| quoted 模式的 quote 可能过长 | 限制 quote 最长 500 字符 |
| features 可能提取过多琐碎功能 | LLM 只提取"核心功能"，非穷举 |
| method 标注可能不准 | LLM 有明确指令：不确定是否原文时标 extracted |
