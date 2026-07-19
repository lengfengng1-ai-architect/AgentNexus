"""Alliance planning service — SSE 流式盟域规划 + 结果持久化。

Corresponding OpenSpec: docs/api/paths/alliance-planning.yaml
Corresponding in_scope ID: alliance-planning

盟域/招募/达人数据来自 allygo_city_data.json mock，LLM 仅做建议推理。
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
from app.schemas.alliance_planning import (
    AlliancePlanningResult,
    InfluencerSummary,
    LeaguesSummary,
    RecruitmentItem,
)
from app.services.data_provider import get_data_provider

logger = logging.getLogger(__name__)

_RESULTS_DIR = Path(__file__).parent.parent.parent / "mock_data" / "alliance_planning" / "results"
_ID_RE = re.compile(r"^al-[0-9a-f]{8}$")
_PROMPT_DIR = "app/prompt_templates"


def save_alliance_result(result: AlliancePlanningResult) -> str:
    alliance_id = f"al-{uuid.uuid4().hex[:8]}"
    try:
        _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        (_RESULTS_DIR / f"{alliance_id}.json").write_text(
            result.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8"
        )
    except OSError:
        logger.exception("盟域规划结果落盘失败 alliance_planning_id=%s", alliance_id)
    return alliance_id


def get_alliance_result(alliance_id: str) -> AlliancePlanningResult | None:
    if not _ID_RE.match(alliance_id):
        return None
    path = _RESULTS_DIR / f"{alliance_id}.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return AlliancePlanningResult.model_validate(data)


def build_leagues(city: str) -> LeaguesSummary | None:
    cd = get_data_provider().get_city_data(city)
    if not cd:
        return None
    lg = cd.get("leagues") or {}
    return LeaguesSummary(count=lg.get("count", 0), top_leagues=lg.get("top_leagues") or [], avg_members=lg.get("avg_members", 0))


def build_recruitments(city: str) -> list[RecruitmentItem]:
    cd = get_data_provider().get_city_data(city)
    if not cd:
        return []
    raw = ((cd.get("cooperation_center") or {}).get("recruitments")) or []
    return [RecruitmentItem(title=r.get("title", ""), type=r.get("type", ""), target_count=r.get("target_count", 0), requirements=r.get("requirements") or []) for r in raw]


def build_influencers(city: str) -> InfluencerSummary | None:
    cd = get_data_provider().get_city_data(city)
    if not cd:
        return None
    inf = cd.get("influencers") or {}
    return InfluencerSummary(count=inf.get("count", 0), tiers=inf.get("tiers") or {}, avg_quote=inf.get("avg_quote", ""))


async def generate_suggestion(result: AlliancePlanningResult) -> str:
    env = Environment(loader=FileSystemLoader(_PROMPT_DIR))
    prompt = env.get_template("alliance_suggestion.md.j2").render(
        category=result.category, city=result.city,
        leagues=result.leagues.model_dump() if result.leagues else None,
        recruitments=[r.model_dump() for r in result.recruitments],
        influencers=result.influencers.model_dump() if result.influencers else None,
    )
    try:
        llm = build_chat_model()
        msg = await llm.ainvoke([SystemMessage(content=prompt), HumanMessage(content="请生成一句话盟域建议。")])
        text = (msg.content or "").strip().split("\n")[0].strip('"『』「」 ')
        return text or f"建议优先合作{result.city}头部盟域，分层招募达人。"
    except Exception:
        logger.exception("盟域建议 LLM 生成失败，降级模板")
        return f"建议优先合作{result.city}头部盟域，分层招募达人。"


async def analyze_stream(category: str, city: str) -> AsyncGenerator[str, None]:
    event_queue: asyncio.Queue = asyncio.Queue()
    emit: Callable[[str, dict], None] = make_emit(event_queue)

    async def _run() -> None:
        try:
            emit("progress", {"progress": 25, "stage": "查询盟域资源"})
            leagues = build_leagues(city)

            emit("progress", {"progress": 45, "stage": "汇总招募计划"})
            recruitments = build_recruitments(city)

            emit("progress", {"progress": 65, "stage": "汇总达人矩阵"})
            influencers = build_influencers(city)

            emit("progress", {"progress": 85, "stage": "生成盟域建议"})
            result = AlliancePlanningResult(
                category=category, city=city, leagues=leagues,
                recruitments=recruitments, influencers=influencers, suggestion="",
            )
            result.suggestion = await generate_suggestion(result)

            alliance_id = save_alliance_result(result)
            emit("progress", {"progress": 100, "stage": "完成"})
            emit("result", {**result.model_dump(), "alliance_planning_id": alliance_id})
        except Exception as exc:
            emit("error", {"detail": str(exc), "code": "alliance_planning_error"})
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
