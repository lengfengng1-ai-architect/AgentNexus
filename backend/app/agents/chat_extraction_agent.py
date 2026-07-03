from jinja2 import Environment, FileSystemLoader
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph
from pydantic import Field

from app.agents.llm_utils import build_chat_model
from app.agents.registry import register
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


def _build_model():
    return build_chat_model()


def _build_structured_llm():
    return _build_model().with_structured_output(ChatOutput)


class _State(dict):
    message: str
    output: ChatOutput | None


def _extract_node(state: _State) -> _State:
    message = state["message"]
    llm = _build_structured_llm()
    result = llm.invoke([SystemMessage(content=_load_system_prompt()), HumanMessage(content=message)])
    return {"output": result}


def _build_graph():
    graph = StateGraph(_State)
    graph.add_node("extract", _extract_node)
    graph.set_entry_point("extract")
    graph.add_edge("extract", END)
    return graph.compile()


_graph = _build_graph()


async def extract_brand_input(message: str) -> ChatResponse:
    result = await _graph.ainvoke({"message": message})
    output = result.get("output")
    if output is None:
        raise ValueError("Agent did not return structured_response")
    return output


async def run_chat_extraction(state: dict) -> dict:
    """适配编排底座的入口函数。

    期望 state 中包含 key ``message``，与 input_mapping ``$.input.message`` 对应。
    """
    message = state.get("message")
    if not message:
        raise ValueError("Missing required input: message")
    if settings.use_mock_data:
        return {"reply": "", "brand_input": BrandInput().model_dump(), "is_complete": False}
    response = await extract_brand_input(message)
    return response.model_dump()


register("chat_extraction", run_chat_extraction)
