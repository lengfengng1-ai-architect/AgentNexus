"""方案摘要提炼 Service — 读取 checkpoint agent 输出，LLM 归一化为固定卡片结构。

Corresponding OpenSpec: openspec/changes/plan-summary-endpoint
Corresponding in_scope ID: plan-generation
"""

import json
import logging

from jinja2 import Environment, FileSystemLoader
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.llm_utils import build_chat_model
from app.schemas.plan_summary import PlanSummary
from app.services.plan_generation_service import _checkpoint_state

logger = logging.getLogger(__name__)

_PROMPT_DIR = "app/prompt_templates"


def _dump(obj: object) -> str:
    """Safely JSON-dump an object, returning empty dict string for None."""
    if obj is None:
        return "{}"
    return json.dumps(obj, ensure_ascii=False, indent=2, default=str)


async def generate_plan_summary(run_id: str) -> PlanSummary:
    """Read checkpoint agent outputs and LLM-normalize into PlanSummary."""
    state = await _checkpoint_state(run_id)
    if state is None:
        raise ValueError(f"Run {run_id} not found")

    strategy_raw = _dump(state.get("strategy_generation", {}))
    execution_raw = _dump(state.get("execution_planning", {}))
    budget_raw = _dump(state.get("budget_kpi", {}))
    actions_raw = _dump(state.get("action_recommendations", {}))
    brand_input_raw = _dump(state.get("brand_input", {}))

    env = Environment(loader=FileSystemLoader(_PROMPT_DIR))
    prompt = env.get_template("plan_summary.md.j2").render(
        strategy_raw=strategy_raw,
        execution_raw=execution_raw,
        budget_raw=budget_raw,
        actions_raw=actions_raw,
        brand_input_raw=brand_input_raw,
    )

    llm = build_chat_model().with_structured_output(PlanSummary)
    result: PlanSummary = await llm.ainvoke([
        SystemMessage(content=prompt),
        HumanMessage(content="请生成方案摘要。"),
    ])

    return result
