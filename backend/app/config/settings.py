from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置，所有值通过环境变量覆盖。"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AllyGo Marketing Agent"
    app_version: str = "0.1.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "INFO"
    log_file: str = "logs/app.log"

    llm_provider: str = "dashscope"  # dashscope | agnes | myself

    dashscope_api_key: str = ""
    dashscope_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    dashscope_model: str = "qwen-turbo"

    dashscope_video_model: str = "happyhorse-1.1-t2v"
    dashscope_i2v_model: str = "happyhorse-1.1-i2v"

    agnes_api_key: str = ""
    agnes_base_url: str = "https://apihub.agnes-ai.com/v1"
    agnes_model: str = "agnes-2.0-flash"

    myself_api_key: str = ""
    myself_base_url: str = ""
    myself_model: str = "deepseek-v4-flash"

    image_gen_model: str = "qwen-image-2.0-pro"

    enable_thinking: bool = False

    use_mock_data: bool = False

    searxng_url: str = "http://localhost:8080"

    cors_origins: str = ""


settings = Settings()
