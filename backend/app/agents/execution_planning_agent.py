"""Execution planning agent for plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

from app.agents.llm_utils import write_log,  invoke_json
from app.agents.registry import register
from app.schemas.plan_generation import ExecutionOutput

_PROMPT_DIR = Path(__file__).parent.parent / "prompt_templates"


def _render(name: str, **kw) -> str:
    env = Environment(loader=FileSystemLoader(str(_PROMPT_DIR)))
    return env.get_template(f"{name}.md.j2").render(**kw)


async def run_execution_planning(state: dict[str, Any]) -> dict[str, Any]:
    """Generate execution plan based on strategy."""
    brand_input = state.get("brand_input") or {}
    city_data = state.get("plan_data_query") or {}
    strategy = state.get("strategy_generation") or {}

    brand_name = brand_input.get("brand_name")
    category = brand_input.get("category")
    city = brand_input.get("city")
    if not all([brand_name, category, city]):
        raise ValueError("Missing required brand inputs")

    write_log("execution_planning", f"📊 正在为 {brand_name} 规划执行方案…")
    result = await invoke_json(
        _render(
            "execution_planning",
            brand_name=brand_name,
            category=category,
            city=city,
            positioning=strategy.get("positioning", ""),
            marketing_goal=strategy.get("marketing_goal", ""),
            strategy_framework=strategy.get("strategy_framework", ""),
            key_messages=strategy.get("key_messages", []),
            leagues_count=city_data.get("leagues", {}).get("count", 0),
            events_monthly=city_data.get("events", {}).get("monthly", 0),
            influencers_count=city_data.get("influencers", {}).get("count", 0),
            stores_count=city_data.get("stores", {}).get("count", 0),
            venues_count=city_data.get("venues", {}).get("count", 0),
        ),
        f"请为 {brand_name} 生成执行规划。",
    )
    write_log("execution_planning", "✓ 执行规划完成")
    return ExecutionOutput.model_validate(result).model_dump()


register("execution_planning", run_execution_planning)
