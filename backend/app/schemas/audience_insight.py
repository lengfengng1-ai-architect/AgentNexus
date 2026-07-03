from pydantic import BaseModel, Field


# ── 溯源基础类型（复用 product_info 的风格） ─────────


class SourcedStr(BaseModel):
    value: str | None = None
    sources: list[str] = Field(default_factory=list, description="信息来源 URL 列表")
    method: str = Field(default="extracted", description="quoted=原文摘录 / extracted=AI综合提取 / inferred=综合推断")
    quote: str | None = Field(None, description="原文引用片段")


# ── 人群调研原始数据 ─────────────────────────────


class AuditItem(BaseModel):
    """带来源的单一信息项。"""
    text: str
    source: str


class AudienceRawData(BaseModel):
    """人群洞察 Agent 从网上提取的原始人群信息。"""

    demographics: dict = Field(default_factory=dict, description="人口统计信息（年龄/性别/城市/收入等）")
    purchase_motivations: list[AuditItem] = Field(default_factory=list, description="购买动机列表，每项独立标注来源")
    decision_factors: list[AuditItem] = Field(default_factory=list, description="决策因素列表，每项独立标注来源")
    usage_scenarios: list[AuditItem] = Field(default_factory=list, description="使用场景列表")
    descriptions: list[AuditItem] = Field(default_factory=list, description="用户特征描述原文引用")
    sources: list[str] = Field(default_factory=list, description="本次调研读取的全部页面 URL")


# ── 用户画像 ───────────────────────────────────


class PersonaSource(BaseModel):
    method: str = Field(default="extracted", description="quoted/extracted/inferred")
    source: str | None = Field(None, description="信息来源 URL")
    quote: str | None = Field(None, description="原文引用（quoted 模式时）")


class FeaturePreference(BaseModel):
    """功能偏好。"""
    feature: str
    importance: str = Field(default="中", description="高/中/低")
    evidence: list[str] = Field(default_factory=list)


class UserPersona(BaseModel):
    """用户画像——综合产品调研 + 人群调研数据生成。"""

    profile_summary: PersonaSource = Field(default_factory=PersonaSource, description="画像概述，一句话")
    typical_user: PersonaSource = Field(default_factory=PersonaSource, description="典型用户描述")

    demographics: dict = Field(default_factory=dict, description="人口画像（age/gender/city_tier/income 等）")
    purchase_motivation: dict = Field(default_factory=dict, description="购买动机（primary/secondary/pain_points/switch_reason）")
    product_usage: dict = Field(default_factory=dict, description="产品使用画像（core_scenarios/feature_preference/usage_frequency）")
    lifestyle: dict = Field(default_factory=dict, description="生活方式（interests/sport_affinity/media_habits/consumption_style）")
    product_fit: dict = Field(default_factory=dict, description="产品关联度（reason_this_product/valued_features/price_sensitivity）")


# ── 请求/响应 ───────────────────────────────────


class AudienceInsightRequest(BaseModel):
    product_name: str = Field(..., min_length=1, description="产品名称")


class AudienceInsightResponse(BaseModel):
    product_name: str = Field(..., description="产品名称")
    audience_data: AudienceRawData = Field(..., description="人群调研原始数据")
    persona: UserPersona = Field(..., description="用户画像")
    from_cache: bool = Field(False, description="是否来自缓存")
