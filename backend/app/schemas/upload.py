from pydantic import BaseModel, Field


class UploadFileItem(BaseModel):
    """单个上传文件的响应"""

    name: str = Field(description="原始文件名")
    url: str = Field(description="本地可访问的 URL 路径")
    size: int = Field(description="文件大小（字节）")
    mime_type: str = Field(description="MIME 类型", alias="mimeType")
    caption: str | None = Field(
        default=None,
        description="视觉模型生成的图片中文描述；非图片文件或生成失败时为 null",
    )

    model_config = {"populate_by_name": True}


class UploadResponse(BaseModel):
    """上传接口响应"""

    files: list[UploadFileItem] = Field(description="上传成功的文件列表")
