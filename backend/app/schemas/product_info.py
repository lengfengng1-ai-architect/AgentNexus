from pydantic import BaseModel, Field


class SourcedStr(BaseModel):
    """带来源的字符串字段。"""
    value: str | None = None
    sources: list[str] = Field(default_factory=list, description="信息来源 URL 列表")


class SourcedStrList(BaseModel):
    """带来源的字符串列表字段。"""
    value: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list, description="信息来源 URL 列表")


class SourcedDict(BaseModel):
    """带来源的字典字段。"""
    value: dict = Field(default_factory=dict)
    sources: list[str] = Field(default_factory=list, description="信息来源 URL 列表")


class BasicInfo(BaseModel):
    """产品基础信息，每个字段带来源。"""

    product_name: SourcedStr = Field(default_factory=SourcedStr)
    brand: SourcedStr = Field(default_factory=SourcedStr)
    manufacturer: SourcedStr = Field(default_factory=SourcedStr)
    industry: SourcedStr = Field(default_factory=SourcedStr)
    category: SourcedStr = Field(default_factory=SourcedStr)
    description: SourcedStr = Field(default_factory=SourcedStr)
    launch_date: SourcedStr = Field(default_factory=SourcedStr)
    status: SourcedStr = Field(default_factory=SourcedStr)
    official_website: SourcedStr = Field(default_factory=SourcedStr)
    available_regions: SourcedStrList = Field(default_factory=SourcedStrList)
    specifications: SourcedDict = Field(default_factory=SourcedDict)


class ProductInfo(BaseModel):
    """产品信息调研的完整结果。"""

    basic: BasicInfo = Field(default_factory=BasicInfo, description="产品基础信息")


class ProductInfoRequest(BaseModel):
    """产品调研请求。"""

    product_name: str = Field(..., min_length=1, description="产品名称")


class ProductInfoResponse(BaseModel):
    """产品调研响应。"""

    product_info: ProductInfo = Field(..., description="产品调研结果")
    from_cache: bool = Field(False, description="是否来自缓存")
