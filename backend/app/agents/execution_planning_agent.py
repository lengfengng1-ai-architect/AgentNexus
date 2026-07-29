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

    # 多城联动：plan_data_query 现为 MultiCityDataOutput {cities:[...]}
    cities_list = city_data.get("cities") or []
    cities_data = cities_list if cities_list else [city_data]  # 兼容旧单城扁平
    primary = cities_data[0] if cities_data else {}
    cities = brand_input.get("selected_cities") or [city]

    # 各城数据汇总（盟域/达人/经营社/场馆求和，赛事取主城月均）
    leagues_count = sum(c.get("leagues", {}).get("count", 0) for c in cities_data)
    events_monthly = primary.get("events", {}).get("monthly", 0)
    influencers_count = sum(c.get("influencers", {}).get("count", 0) for c in cities_data)
    stores_count = sum(c.get("stores", {}).get("count", 0) for c in cities_data)
    venues_count = sum(c.get("venues", {}).get("count", 0) for c in cities_data)
    # 多城数据摘要（每城盟域/达人/经营社），供 prompt 按城编排
    city_data_summary = "; ".join(
        f"{c.get('city')} 盟域{c.get('leagues', {}).get('count', 0)}/达人{c.get('influencers', {}).get('count', 0)}/经营社{c.get('stores', {}).get('count', 0)}"
        for c in cities_data
    )

    # 注入用户驳回反馈
    reject_reason = brand_input.get("_reject_reason", "")
    reject_history = brand_input.get("_reject_history", [])

    write_log("execution_planning", f"📊 正在为 {brand_name} 规划执行方案…")
    result = await invoke_json(
        _render(
            "execution_planning",
            brand_name=brand_name,
            category=category,
            city=city,
            cities=cities,
            city_data_summary=city_data_summary,
            positioning=strategy.get("positioning", ""),
            marketing_goal=strategy.get("marketing_goal", ""),
            strategy_framework=strategy.get("strategy_framework", ""),
            key_messages=strategy.get("key_messages", []),
            leagues_count=leagues_count,
            events_monthly=events_monthly,
            influencers_count=influencers_count,
            stores_count=stores_count,
            venues_count=venues_count,
            reject_reason=reject_reason,
            reject_history=reject_history,
        ),
        f"请为 {brand_name} 生成执行规划。",
    )
    write_log("execution_planning", "✓ 执行规划完成")
    return ExecutionOutput.model_validate(result).model_dump()


register("execution_planning", run_execution_planning)
