from pydantic import BaseModel, Field


class UploadFileItem(BaseModel):
    """单个上传文件的响应"""

    name: str = Field(description="原始文件名")
    url: str = Field(description="本地可访问的 URL 路径")
    size: int = Field(description="文件大小（字节）")
    mime_type: str = Field(description="MIME 类型", alias="mimeType")

    model_config = {"populate_by_name": True}


class UploadResponse(BaseModel):
    """上传接口响应"""

    files: list[UploadFileItem] = Field(description="上传成功的文件列表")
