"""Plan generation pipeline — LangGraph StateGraph.

注册名称: plan_generation (service layer, not a registry agent)
对应 OpenSpec: openspec/changes/simplify-workflow-orchestration/specs/plan-generation-pipeline/spec.md
对应 in_scope ID: plan-generation
用途: 串行调用 10 个 agent，生成 9 章营销方案
输入: brand_input（brand_name/category/city/budget/period）
输出: plan_generator 的 chapters
"""

import asyncio
import json
from collections.abc import AsyncGenerator
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.agents.registry import get_handler


class PlanState(TypedDict):
    brand_input: dict[str, Any]
    product_research: dict[str, Any]
    market_research: dict[str, Any]
    audience_insight: dict[str, Any]
    plan_data_query: dict[str, Any]
    fitness_analysis: dict[str, Any]
    strategy_generation: dict[str, Any]
    execution_planning: dict[str, Any]
    budget_kpi: dict[str, Any]
    action_recommendations: dict[str, Any]
    plan_generator: dict[str, Any]


_NODE_LABELS: dict[str, str] = {
    "product_research": "产品调研",
    "market_research": "市场研究",
    "audience_insight": "人群洞察",
    "plan_data_query": "平台资源",
    "fitness_analysis": "适配度分析",
    "strategy_generation": "策略生成",
    "execution_planning": "执行规划",
    "budget_kpi": "预算KPI",
    "action_recommendations": "行动建议",
    "plan_generator": "方案生成",
}

_NODE_LOG_STEPS: dict[str, list[str]] = {
    "product_research": ["正在搜索品牌产品信息…", "正在提取产品规格参数…", "完成产品信息调研"],
    "market_research": ["正在分析行业趋势数据…", "正在研究竞品格局…", "完成市场调研"],
    "audience_insight": ["正在分析人群画像…", "正在计算运动指数…", "完成人群洞察"],
    "plan_data_query": ["正在查询盟域数据…", "正在查询达人资源…", "完成平台数据查询"],
    "fitness_analysis": ["正在计算品类适配度…", "正在生成适配度评分…", "完成适配度分析"],
    "strategy_generation": ["正在制定营销策略…", "正在确定核心定位…", "完成策略制定"],
    "execution_planning": ["正在规划赛事方案…", "正在规划内容策略…", "完成执行规划"],
    "budget_kpi": ["正在测算预算分配…", "正在预测KPI指标…", "完成预算KPI计算"],
    "action_recommendations": ["正在分析优先级…", "正在生成可执行动作…", "完成行动建议"],
    "plan_generator": ["正在汇总上游数据…", "正在生成方案章节…", "完成方案生成"],
}


def _build_node(node_id: str):
    """Create a LangGraph node that calls get_handler(node_id)."""
    label = _NODE_LABELS.get(node_id, node_id)
    handler = get_handler(node_id)

    async def node_fn(state: PlanState) -> dict[str, Any]:
        inputs: dict[str, Any] = {}
        if node_id == "product_research":
            inputs = {"brand_name": state["brand_input"].get("brand_name")}
        elif node_id == "market_research":
            inputs = {
                "brand_name": state["brand_input"].get("brand_name"),
                "category": state["brand_input"].get("category"),
            }
        elif node_id in ("audience_insight", "plan_data_query"):
            inputs = {"city": state["brand_input"].get("city")}
        elif node_id == "fitness_analysis":
            inputs = {
                "category": state["brand_input"].get("category"),
                "city": state["brand_input"].get("city"),
            }
        elif node_id in ("strategy_generation", "execution_planning"):
            inputs = {
                "brand_input": state["brand_input"],
            }
        elif node_id == "budget_kpi":
            inputs = {
                "brand_input": state["brand_input"],
                "execution_planning": state.get("execution_planning", {}),
            }
        elif node_id == "action_recommendations":
            inputs = {
                "brand_input": state["brand_input"],
                "strategy_generation": state.get("strategy_generation", {}),
                "fitness_analysis": state.get("fitness_analysis", {}),
                "budget_kpi": state.get("budget_kpi", {}),
            }
        else:  # plan_generator
            all_upstream = dict(state)
            all_upstream.pop("brand_input")
            inputs = {"brand_input": state["brand_input"], **all_upstream}

        return {node_id: await handler(inputs)}

    node_fn.__name__ = f"{node_id}_node"
    node_fn.__qualname__ = f"{node_id}_node"
    return node_fn


def _build_graph() -> StateGraph:
    graph = StateGraph(PlanState)

    node_ids = [
        "product_research",
        "market_research",
        "audience_insight",
        "plan_data_query",
        "fitness_analysis",
        "strategy_generation",
        "execution_planning",
        "budget_kpi",
        "action_recommendations",
        "plan_generator",
    ]

    for nid in node_ids:
        graph.add_node(nid, _build_node(nid))

    graph.set_entry_point("product_research")
    for i in range(len(node_ids) - 1):
        graph.add_edge(node_ids[i], node_ids[i + 1])
    graph.add_edge(node_ids[-1], END)

    return graph.compile()


_pipeline = _build_graph()


# ── Public API ──


async def run_pipeline(brand_input: dict[str, Any]) -> dict[str, Any]:
    """Execute plan generation pipeline, return all outputs."""
    initial: PlanState = {"brand_input": brand_input}
    for key in _NODE_LABELS:
        initial[key] = {}
    result = await _pipeline.ainvoke(initial)
    return {
        "status": "completed",
        "outputs": {k: v for k, v in result.items() if k in _NODE_LABELS},
    }


async def run_stream(brand_input: dict[str, Any]) -> AsyncGenerator[str, None]:
    """SSE streaming version of plan generation."""
    initial: PlanState = {"brand_input": brand_input}
    for key in _NODE_LABELS:
        initial[key] = {}

    node_ids = [
        "product_research",
        "market_research",
        "audience_insight",
        "plan_data_query",
        "fitness_analysis",
        "strategy_generation",
        "execution_planning",
        "budget_kpi",
        "action_recommendations",
        "plan_generator",
    ]

    for nid in node_ids:
        yield f"event: node.start\ndata: {json.dumps({'node_id': nid, 'label': _NODE_LABELS[nid]})}\n\n"

        for log_msg in _NODE_LOG_STEPS.get(nid, ["处理中…"]):
            yield f"event: node.log\ndata: {json.dumps({'node_id': nid, 'message': log_msg})}\n\n"
            await asyncio.sleep(0.1)

        try:
            output = await get_handler(nid)(initial)
            initial[nid] = output
            yield f"event: node.complete\ndata: {json.dumps({'node_id': nid, 'data': output})}\n\n"
        except Exception as exc:
            yield f"event: node.failed\ndata: {json.dumps({'node_id': nid, 'error': str(exc)})}\n\n"
            return

    outputs = {k: v for k, v in initial.items() if k in _NODE_LABELS}
    yield f"event: workflow.complete\ndata: {json.dumps({'outputs': outputs})}\n\n"
