from jinja2 import Environment, FileSystemLoader
from langchain.chat_models import init_chat_model
from pydantic import Field

from app.config.settings import settings
from app.schemas.chat import BrandInput, ChatResponse


class ChatOutput(ChatResponse):
    """Agent 内部结构化输出 schema，与 ChatResponse 保持字段兼容。"""

    reply: str = Field(..., description="AI 回复文本")
    brand_input: BrandInput = Field(default_factory=BrandInput, description="提取的品牌需求字段")
    is_complete: bool = Field(False, description="字段是否完整")


def _load_system_prompt() -> str:
    env = Environment(loader=FileSystemLoader("app/prompt_templates"))
    template = env.get_template("chat_extraction.md.j2")
    return template.render()


def _build_agent():
    model = init_chat_model(
        model=settings.dashscope_model,
        model_provider="openai",
        api_key=settings.dashscope_api_key,
        base_url=settings.dashscope_base_url,
    )

    from deepagents import create_deep_agent

    return create_deep_agent(
        model=model,
        system_prompt=_load_system_prompt(),
        response_format=ChatOutput,
    )


async def extract_brand_input(message: str) -> ChatResponse:
    agent = _build_agent()
    result = await agent.ainvoke({"messages": [{"role": "user", "content": message}]})
    structured = result.get("structured_response") or result.get("raw")
    if structured is None:
        raise ValueError("Agent did not return structured_response")
    if isinstance(structured, ChatOutput):
        return structured
    return ChatOutput(**structured)
