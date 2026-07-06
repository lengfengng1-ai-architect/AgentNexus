from pydantic import BaseModel, Field


class BrandInput(BaseModel):
    brand_name: str | None = Field(None, description="品牌名称")
    category: str | None = Field(None, description="品牌品类，英文 snake_case")
    city: str | None = Field(None, description="目标城市")
    budget: int | None = Field(None, ge=1, description="预算，单位万元")
    period: int | None = Field(None, ge=1, description="周期，单位月")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="用户自然语言输入")


class ChatResponse(BaseModel):
    reply: str = Field(..., description="AI 回复文本")
    brand_input: BrandInput = Field(default_factory=BrandInput, description="提取的品牌需求字段")  # type: ignore[arg-type]
    is_complete: bool = Field(False, description="字段是否完整")
    reasoning: str = Field("", description="模型思考过程")
