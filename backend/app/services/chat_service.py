from app.agents.chat_extraction_agent import extract_brand_input
from app.schemas.chat import ChatResponse


async def chat(message: str) -> ChatResponse:
    return await extract_brand_input(message)
