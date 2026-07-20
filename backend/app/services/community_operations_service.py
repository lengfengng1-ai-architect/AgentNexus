"""Community operations service — SSE 流式社群运营规划 + 结果持久化。

Corresponding OpenSpec: openspec/changes/community-operations
Corresponding in_scope ID: community-operations

数据来源：allygo_city_data.json（社团/门店/场地/达人/榜单）+ community_data.json
"""
import asyncio
import json
import logging
import re
import uuid
from collections.abc import AsyncGenerator, Callable
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.llm_utils import build_chat_model
from app.agents.tools.event_stream import make_emit
from app.schemas.community_operations import (
    CommunityOperationsResult,
    ContentPlanItem,
    OperationActivity,
)
from app.services.data_provider import get_data_provider

logger = logging.getLogger(__name__)

_RESULTS_DIR = Path(__file__).parent.parent.parent / "mock_data" / "community_operations" / "results"
_ID_RE = re.compile(r"^co-[0-9a-f]{8}$")
_PROMPT_DIR = "app/prompt_templates"
_COMMUNITY_DATA_PATH = Path(__file__).parent.parent.parent / "mock_data" / "community_operations" / "community_data.json"


def _load_community_data() -> dict:
    try:
        return json.loads(_COMMUNITY_DATA_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        logger.warning("社群数据文件未找到，使用空模板")
        return {}


def save_community_result(result: CommunityOperationsResult) -> str:
    co_id = f"co-{uuid.uuid4().hex[:8]}"
    try:
        _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        (_RESULTS_DIR / f"{co_id}.json").write_text(
            result.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8"
        )
    except OSError:
        logger.exception("社群运营结果落盘失败 community_operations_id=%s", co_id)
    return co_id


def get_community_result(co_id: str) -> CommunityOperationsResult | None:
    if not _ID_RE.match(co_id):
        return None
    path = _RESULTS_DIR / f"{co_id}.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return CommunityOperationsResult.model_validate(data)


def _get_city_summary(city: str) -> dict:
    """从 allygo_city_data.json 提取社群相关数据摘要。"""
    cd = get_data_provider().get_city_data(city)
    if not cd:
        return {}
    return {
        "stores": cd.get("stores", {}),
        "leagues": cd.get("leagues", {}),
        "venues": cd.get("venues", {}),
        "influencers": cd.get("influencers", {}),
        "leaderboard": cd.get("leaderboard", {}),
        "events": cd.get("events", {}),
    }


async def generate_suggestion(result: CommunityOperationsResult) -> str:
    env = Environment(loader=FileSystemLoader(_PROMPT_DIR))
    prompt = env.get_template("community_suggestion.md.j2").render(
        category=result.category,
        city=result.city,
        positioning=result.community_positioning,
        content_count=len(result.content_plan),
        activity_count=len(result.operation_activities),
        kpi=result.kpi_targets,
    )
    try:
        llm = build_chat_model()
        msg = await llm.ainvoke([
            SystemMessage(content=prompt),
            HumanMessage(content="请生成一句话社群运营建议。"),
        ])
        text = (msg.content or "").strip().split("\n")[0].strip('"『』「」 ')
        return text or f"建议以{result.category}品类社群定位切入{result.city}市场，通过内容+活动组合提升活跃度。"
    except Exception:
        logger.exception("社群建议 LLM 生成失败，降级模板")
        return f"建议以{result.category}品类社群定位切入{result.city}市场，通过内容+活动组合提升活跃度。"


async def analyze_stream(category: str, city: str) -> AsyncGenerator[str, None]:
    event_queue: asyncio.Queue = asyncio.Queue()
    emit: Callable[[str, dict], None] = make_emit(event_queue)

    async def _run() -> None:
        try:
            emit("progress", {"step": "query_city", "message": f"正在查询{city}社群数据…"})
            city_summary = _get_city_summary(city)
            cd = _load_community_data()

            emit("progress", {"step": "positioning", "message": "正在分析社群定位…"})
            leagues = city_summary.get("leagues", {})
            stores = city_summary.get("stores", {})
            influencers = city_summary.get("influencers", {})

            community_types = cd.get("community_types", [])
            content_formats = cd.get("content_formats", [])
            engagement_methods = cd.get("engagement_methods", [])
            kpi_ref = cd.get("kpi_reference", {})

            # LLM 生成社群定位 + 内容规划 + 运营活动
            llm = build_chat_model()
            emit("progress", {"step": "content_plan", "message": "正在规划内容策略…"})
            msg = await llm.ainvoke([
                SystemMessage(content=(
                    "你是一个社群运营专家。基于以下品牌和城市数据，生成社群运营规划。\n"
                    "返回 JSON 格式：\n"
                    '{\n'
                    '  "community_positioning": "社群定位描述（一句话）",\n'
                    '  "target_members": "目标人群描述（一句话）",\n'
                    '  "content_plan": [{"content_type": "类型", "description": "描述", "frequency": "频次"}],\n'
                    '  "operation_activities": [{"activity_name": "活动名", "goal": "目标", "description": "说明"}],\n'
                    '  "kpi_targets": {"active_rate": "40%", "retention_30d": "65%", "conversion_rate": "6%"}\n'
                    '}\n'
                    "约束：基于数据推理，不得编造。内容规划 3-4 项，运营活动 2-3 项。"
                )),
                HumanMessage(content=(
                    f"品类：{category}\n"
                    f"城市：{city}\n"
                    f"社团：{json.dumps(leagues, ensure_ascii=False)}\n"
                    f"门店品类：{json.dumps(stores.get('categories', []), ensure_ascii=False)}\n"
                    f"达人：{json.dumps(influencers, ensure_ascii=False)}\n"
                    f"社群类型参考：{json.dumps(community_types, ensure_ascii=False)}\n"
                    f"内容格式参考：{json.dumps(content_formats, ensure_ascii=False)}\n"
                    f"运营方法参考：{json.dumps(engagement_methods, ensure_ascii=False)}\n"
                    f"KPI 参考：{json.dumps(kpi_ref, ensure_ascii=False)}"
                )),
            ])
            raw = (msg.content or "").strip()
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            parsed = json.loads(raw) if raw else {}

            content_plan = [ContentPlanItem(**c) for c in parsed.get("content_plan") or []]
            operation_activities = [OperationActivity(**a) for a in parsed.get("operation_activities") or []]
            kpi_targets = parsed.get("kpi_targets", {})

            result = CommunityOperationsResult(
                category=category,
                city=city,
                community_positioning=parsed.get("community_positioning", f"{category}品牌社群"),
                target_members=parsed.get("target_members", f"{city}的运动爱好者"),
                content_plan=content_plan,
                operation_activities=operation_activities,
                kpi_targets=kpi_targets,
                suggestion="",
            )

            emit("progress", {"step": "suggestion", "message": "正在生成运营建议…"})
            result.suggestion = await generate_suggestion(result)

            co_id = save_community_result(result)
            emit("progress", {"step": "done", "message": "完成"})
            emit("result", {**result.model_dump(), "community_operations_id": co_id})
        except Exception as exc:
            logger.exception("社群运营分析失败")
            emit("error", {"detail": str(exc), "code": "community_operations_error"})
        finally:
            await event_queue.put(None)

    runner = asyncio.create_task(_run())
    try:
        while True:
            raw = await event_queue.get()
            if raw is None:
                break
            yield raw
    finally:
        if not runner.done():
            runner.cancel()
