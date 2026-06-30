from typing import TypedDict

from langchain_community.chat_models import ChatTongyi
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from app.config.settings import settings
from app.schemas.chat import BrandInput, ChatResponse


class ChatExtractionState(TypedDict, total=False):
    message: str
    reply: str
    brand_input: BrandInput | None
    is_complete: bool
    raw_output: str


def _build_llm():
    return ChatTongyi(
        model=settings.dashscope_model,
        dashscope_api_key=settings.dashscope_api_key,
        temperature=0.1,
    )


def _render_prompt(message: str) -> str:
    from jinja2 import Environment, FileSystemLoader

    env = Environment(loader=FileSystemLoader("app/prompt_templates"))
    template = env.get_template("chat_extraction.md.j2")
    return template.render(message=message)


def _parse_json_output(raw: str) -> ChatResponse:
    import json

    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    data = json.loads(cleaned)
    return ChatResponse(**data)


def extract_node(state: ChatExtractionState) -> ChatExtractionState:
    message = state["message"]
    llm = _build_llm()
    prompt = _render_prompt(message)
    response = llm.invoke([SystemMessage(content=prompt)])
    raw_output = response.content if isinstance(response.content, str) else str(response.content)
    return {"raw_output": raw_output}


def parse_node(state: ChatExtractionState) -> ChatExtractionState:
    parsed = _parse_json_output(state["raw_output"])
    return {
        "reply": parsed.reply,
        "brand_input": parsed.brand_input,
        "is_complete": parsed.is_complete,
    }


def build_chat_extraction_graph():
    builder = StateGraph(ChatExtractionState)
    builder.add_node("extract", extract_node)
    builder.add_node("parse", parse_node)
    builder.set_entry_point("extract")
    builder.add_edge("extract", "parse")
    builder.add_edge("parse", END)
    return builder.compile()


graph = build_chat_extraction_graph()


async def extract_brand_input(message: str) -> ChatResponse:
    result = await graph.ainvoke({"message": message})
    return ChatResponse(
        reply=result.get("reply", ""),
        brand_input=result.get("brand_input"),
        is_complete=result.get("is_complete", False),
    )
