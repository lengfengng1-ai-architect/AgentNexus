from pydantic import BaseModel, Field


# ── 基础溯源类型 ───────────────────────────────────


class SourcedStr(BaseModel):
    """带溯源的字符串字段。"""
    value: str | None = None
    sources: list[str] = Field(default_factory=list, description="信息来源 URL 列表")
    method: str = Field(default="extracted", description="quoted=原文摘录 / extracted=AI综合提取")
    quote: str | None = Field(None, description="原文引用片段（quoted 模式时填充）")


class SourcedStrList(BaseModel):
    """带溯源的字符串列表字段。"""
    value: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list, description="信息来源 URL 列表")
    method: str = Field(default="extracted", description="quoted=原文摘录 / extracted=AI综合提取")


class SourcedDict(BaseModel):
    """带溯源的字典字段。"""
    value: dict = Field(default_factory=dict)
    sources: list[str] = Field(default_factory=list, description="信息来源 URL 列表")
    method: str = Field(default="extracted", description="quoted=原文摘录 / extracted=AI综合提取")


# ── 五大模块 ─────────────────────────────────────


class Identity(BaseModel):
    """产品标识信息。"""

    product_name: SourcedStr = Field(default_factory=SourcedStr, description="官方产品名称，须来自官网/包装/文档")  # type: ignore[arg-type]
    brand: SourcedStr = Field(default_factory=SourcedStr, description="产品品牌")  # type: ignore[arg-type]
    manufacturer: SourcedStr = Field(default_factory=SourcedStr, description="产品的生产公司")  # type: ignore[arg-type]
    industry: SourcedStr = Field(default_factory=SourcedStr, description="产品所属行业")  # type: ignore[arg-type]
    category: SourcedStr = Field(default_factory=SourcedStr, description="产品类别")  # type: ignore[arg-type]


class OfficialDescription(BaseModel):
    """官方描述。优先从官网原文摘录（quoted）。"""

    description: SourcedStr = Field(default_factory=SourcedStr, description="官网的介绍文本")  # type: ignore[arg-type]
    tagline: SourcedStr = Field(default_factory=SourcedStr, description="官方 slogan/标语")  # type: ignore[arg-type]
    statement: SourcedStr = Field(default_factory=SourcedStr, description="正式定义，来自 PR/whitepaper")  # type: ignore[arg-type]


class Feature(BaseModel):
    """产品功能，每个功能独立标注来源。"""

    name: str = Field(..., description="产品功能名称")
    category: str | None = Field(None, description="功能类别")
    description: str = Field(default="", description="功能描述，只描述功能本身")
    evidence: list[str] = Field(default_factory=list, description="信息来源 URL（每个功能独立标注）")


class PriceItem(BaseModel):
    """结构化价格信息。"""

    label: str | None = Field(None, description="价格项标签，如 128GB 版")
    price: str | None = Field(None, description="价格数值，如 5999 元")
    currency: str | None = Field(None, description="货币，如 CNY/USD")
    source: str | None = Field(None, description="该价格的信息来源 URL")


class Availability(BaseModel):
    """产品可获得性信息。"""

    status: SourcedStr = Field(default_factory=SourcedStr, description="产品状态：在售/预售/停售/unknown")  # type: ignore[arg-type]
    pricing: list[PriceItem] = Field(default_factory=list, description="结构化价格信息")
    available_regions: SourcedStrList = Field(default_factory=SourcedStrList, description="销售/服务地区")
    access_model: SourcedStr = Field(default_factory=SourcedStr, description="交付方式，如线下零售/线上直销")  # type: ignore[arg-type]


class ProductResearchResult(BaseModel):
    """产品调研的完整结果。"""

    identity: Identity = Field(default_factory=Identity, description="产品标识信息")
    official_description: OfficialDescription = Field(default_factory=OfficialDescription, description="官方描述")
    features: list[Feature] = Field(default_factory=list, description="产品功能列表")
    specifications: SourcedDict = Field(default_factory=SourcedDict, description="产品规格参数")
    availability: Availability = Field(default_factory=Availability, description="产品可获得性")


# ── 请求/响应 ────────────────────────────────────


class ProductInfoRequest(BaseModel):
    """产品调研请求。"""

    product_name: str = Field(..., min_length=1, description="产品名称")


class ProductInfoResponse(BaseModel):
    """产品调研响应。"""

    product_info: ProductResearchResult = Field(..., description="产品调研结果")
    from_cache: bool = Field(False, description="是否来自缓存")
