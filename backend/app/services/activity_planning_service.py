"""Activity planning service — SSE 流式活动规划 + 结果持久化。

Corresponding OpenSpec: docs/api/paths/activity-planning.yaml
Corresponding in_scope ID: activity-planning

赛事按 sport_type + available_cities 过滤；无精确匹配降级返回城市全部 top 3。
所有赛事/场馆数据来自 allygo_city_data.json mock，LLM 仅做建议推理。
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
from app.schemas.activity_planning import (
    ActivityPlanningResult,
    CandidateTournament,
    EventsSummary,
    VenuesSummary,
)
from app.services.data_provider import get_data_provider

logger = logging.getLogger(__name__)

_RESULTS_DIR = Path(__file__).parent.parent.parent / "mock_data" / "activity_planning" / "results"
_ID_RE = re.compile(r"^ap-[0-9a-f]{8}$")
_PROMPT_DIR = "app/prompt_templates"


def save_activity_result(result: ActivityPlanningResult) -> str:
    """持久化活动规划结果，返回 activity_planning_id（ap-<8位hex>）。"""
    activity_id = f"ap-{uuid.uuid4().hex[:8]}"
    try:
        _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        (_RESULTS_DIR / f"{activity_id}.json").write_text(
            result.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8"
        )
    except OSError:
        logger.exception("活动规划结果落盘失败 activity_planning_id=%s", activity_id)
    return activity_id


def get_activity_result(activity_id: str) -> ActivityPlanningResult | None:
    """按 ID 读取已持久化的活动规划结果；ID 格式非法或文件不存在返回 None。"""
    if not _ID_RE.match(activity_id):
        return None
    path = _RESULTS_DIR / f"{activity_id}.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return ActivityPlanningResult.model_validate(data)


def filter_candidates(sport_type: str, city: str) -> list[CandidateTournament]:
    """赛事按 sport_type + available_cities 过滤；无精确匹配降级返回城市全部 top 3。"""
    city_data = get_data_provider().get_city_data(city)
    if not city_data:
        return []
    tournaments_raw = (city_data.get("tournament") or {}).get("available_tournaments") or []

    def to_candidate(t: dict, exact_match: bool) -> CandidateTournament:
        return CandidateTournament(
            name=t.get("name", ""),
            sport_type=t.get("sport_type", ""),
            scale=t.get("scale", ""),
            frequency=t.get("frequency", ""),
            sponsorship_options=t.get("sponsorship_options") or [],
            exact_match=exact_match,
        )

    # 精确匹配：sport_type 命中且 available_cities 含目标城市
    exact = [
        t for t in tournaments_raw
        if sport_type
        and (
            sport_type in (t.get("sport_type") or "")
            or sport_type in (t.get("name") or "")
        )
        and city in (t.get("available_cities") or [])
    ]
    if exact:
        return [to_candidate(t, exact_match=True) for t in exact]

    # 降级：该城市全部赛事 top 3（不编造，注明非精确匹配）
    city_tournaments = [t for t in tournaments_raw if city in (t.get("available_cities") or [])]
    return [to_candidate(t, exact_match=False) for t in city_tournaments[:3]]


def build_events_summary(city: str) -> EventsSummary | None:
    city_data = get_data_provider().get_city_data(city)
    if not city_data:
        return None
    events = city_data.get("events") or {}
    return EventsSummary(
        monthly=events.get("monthly", 0),
        avg_participants=events.get("avg_participants", 0),
        categories=events.get("categories") or [],
    )


def build_venues_summary(city: str) -> VenuesSummary | None:
    city_data = get_data_provider().get_city_data(city)
    if not city_data:
        return None
    venues = city_data.get("venues") or {}
    return VenuesSummary(
        count=venues.get("count", 0),
        types=venues.get("types") or [],
        capacity=venues.get("capacity", ""),
    )


async def generate_suggestion(result: ActivityPlanningResult) -> str:
    """LLM 基于候选赛事数据生成一句话建议（不编造赛事/数据）。"""
    env = Environment(loader=FileSystemLoader(_PROMPT_DIR))
    prompt = env.get_template("activity_suggestion.md.j2").render(
        sport_type=result.sport_type,
        city=result.city,
        candidate_count=len(result.candidates),
        candidates=[c.model_dump() for c in result.candidates[:3]],
    )
    try:
        llm = build_chat_model()
        msg = await llm.ainvoke([
            SystemMessage(content=prompt),
            HumanMessage(content="请生成一句话活动建议。"),
        ])
        text = (msg.content or "").strip().split("\n")[0].strip('"『』「」 ')
        if text:
            return text
        return f"推荐合作{result.sport_type}相关赛事，提升品牌在{result.city}的曝光。"
    except Exception:
        logger.exception("活动建议 LLM 生成失败，降级模板")
        top = result.candidates[0] if result.candidates else None
        if top:
            return f"推荐冠名「{top.name}」（{top.scale}/{top.frequency}），提升{result.city}曝光。"
        return f"推荐合作{result.sport_type}相关赛事，提升{result.city}曝光。"


async def analyze_stream(sport_type: str, city: str) -> AsyncGenerator[str, None]:
    """流式 SSE 活动规划：进度 + result（携带 activity_planning_id）。"""
    event_queue: asyncio.Queue = asyncio.Queue()
    emit: Callable[[str, dict], None] = make_emit(event_queue)

    async def _run() -> None:
        try:
            emit("progress", {"progress": 25, "stage": "匹配候选赛事"})
            candidates = filter_candidates(sport_type, city)

            emit("progress", {"progress": 50, "stage": "汇总活动热度"})
            events_summary = build_events_summary(city)

            emit("progress", {"progress": 70, "stage": "汇总场馆资源"})
            venues_summary = build_venues_summary(city)

            emit("progress", {"progress": 85, "stage": "生成活动建议"})
            result = ActivityPlanningResult(
                sport_type=sport_type,
                city=city,
                candidates=candidates,
                events_summary=events_summary,
                venues_summary=venues_summary,
                suggestion="",  # 占位，下一步填充
            )
            result.suggestion = await generate_suggestion(result)

            activity_id = save_activity_result(result)
            emit("progress", {"progress": 100, "stage": "完成"})
            emit("result", {**result.model_dump(), "activity_planning_id": activity_id})
        except Exception as exc:
            emit("error", {"detail": str(exc), "code": "activity_planning_error"})
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
