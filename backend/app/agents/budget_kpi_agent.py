"""Budget and KPI agent for plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

from app.agents.llm_utils import write_log,  invoke_json
from app.agents.registry import register
from app.schemas.plan_generation import BudgetKpiOutput
from app.utils import parse_budget, parse_period

_PROMPT_DIR = Path(__file__).parent.parent / "prompt_templates"


def _render(name: str, **kw) -> str:
    env = Environment(loader=FileSystemLoader(str(_PROMPT_DIR)))
    return env.get_template(f"{name}.md.j2").render(**kw)


async def run_budget_kpi(state: dict[str, Any]) -> dict[str, Any]:
    """Generate budget allocation and KPI forecast."""
    brand_input = state.get("brand_input") or {}
    execution = state.get("execution_planning") or {}

    brand_name = brand_input.get("brand_name")
    category = brand_input.get("category")
    city = brand_input.get("city")
    budget = parse_budget(brand_input.get("budget"))
    period = parse_period(brand_input.get("period"))
    if not all([brand_name, category, city]):
        raise ValueError("Missing required brand inputs")

    write_log("budget_kpi", f"📊 正在为 {brand_name} 测算预算分配和 KPI…")
    result = await invoke_json(
        _render(
            "budget_kpi",
            brand_name=brand_name,
            category=category,
            city=city,
            budget=budget,
            period=period,
            leagues_plan=execution.get("leagues_plan", ""),
            events_plan=execution.get("events_plan", ""),
            influencer_plan=execution.get("influencer_plan", ""),
            content_plan=execution.get("content_plan", ""),
            store_plan=execution.get("store_plan", ""),
        ),
        f"请为 {brand_name} 生成预算与 KPI。",
    )
    write_log("budget_kpi", "✓ 预算 KPI 测算完成")
    return BudgetKpiOutput.model_validate(result).model_dump()


register("budget_kpi", run_budget_kpi)
