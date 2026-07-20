"""Competitor analysis service — SSE 流式竞品分析（Web 搜索）+ 结果持久化。

Corresponding OpenSpec: openspec/changes/competitor-analysis
Corresponding in_scope ID: competitor-analysis

搜索策略：
- 无 brand_name：品类级搜索（竞争格局 + Top 竞品品牌）
- 有 brand_name：品牌级搜索（先发现竞品 → 逐个深搜产品/价格/渠道/动态）
"""
import asyncio
import json
import logging
import re
import uuid
from collections.abc import AsyncGenerator, Callable
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.llm_utils import build_chat_model, searxng_search, write_log
from app.agents.tools.event_stream import make_emit
from app.schemas.competitor_analysis import CompetitorAnalysisResult, CompetitorItem

logger = logging.getLogger(__name__)

_RESULTS_DIR = Path(__file__).parent.parent.parent / "mock_data" / "competitor_analysis" / "results"
_ID_RE = re.compile(r"^ca-[0-9a-f]{8}$")
_SEARCH_MAX_RESULTS = 8


def save_competitor_result(result: CompetitorAnalysisResult) -> str:
    """持久化竞品分析结果，返回 competitor_analysis_id（ca-<8位hex>）。"""
    ca_id = f"ca-{uuid.uuid4().hex[:8]}"
    try:
        _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        (_RESULTS_DIR / f"{ca_id}.json").write_text(
            result.model_dump_json(indent=2, ensure_ascii=False), encoding="utf-8"
        )
    except OSError:
        logger.exception("竞品分析结果落盘失败 competitor_analysis_id=%s", ca_id)
    return ca_id


def get_competitor_result(ca_id: str) -> CompetitorAnalysisResult | None:
    """按 ID 读取已持久化的竞品分析结果。"""
    if not _ID_RE.match(ca_id):
        return None
    path = _RESULTS_DIR / f"{ca_id}.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return CompetitorAnalysisResult.model_validate(data)


async def _search_and_extract(keyword: str, max_results: int = _SEARCH_MAX_RESULTS) -> str:
    """单次搜索并返回纯文本摘要。"""
    try:
        raw = await searxng_search(keyword, max_results=max_results)
        # searxng_search 返回 list[dict], market_analysis 的同步路径返回 JSON 字符串
        if isinstance(raw, str):
            raw = json.loads(raw)
        snippets = [
            r.get("content", "") or r.get("body", "") or ""
            for r in (raw if isinstance(raw, list) else [])
        ]
        return "\n".join(s for s in snippets if s)[:3000]
    except Exception as exc:
        write_log("competitor_search", f"⚠️ 搜索失败: {keyword} — {exc}")
        return ""


async def analyze_stream(category: str, brand_name: str | None = None) -> AsyncGenerator[str, None]:
    """流式 SSE 竞品分析：搜索进度 + result。"""
    event_queue: asyncio.Queue = asyncio.Queue()
    emit: Callable[[str, dict], None] = make_emit(event_queue)

    async def _run() -> None:
        try:
            all_text_parts: list[str] = []

            if brand_name:
                # 品牌级：先发现竞品，再逐个深搜
                emit("progress", {"step": "search_overview", "message": f"正在搜索 {brand_name} 的竞品…"})
                overview = await _search_and_extract(f"{brand_name} 竞品 {category}")
                all_text_parts.append(f"竞品发现:\n{overview}")

                competitors_raw = await _search_and_extract(f"{category} 竞品品牌排行")
                all_text_parts.append(f"竞品排行:\n{competitors_raw}")

                # 深搜典型竞品
                for kw_suffix in ["产品系列 价格", "营销代言 渠道", "2026 动态"]:
                    emit("progress", {"step": "search_brand", "message": f"正在搜索 {brand_name} 竞品 {kw_suffix}…"})
                    text = await _search_and_extract(f"{brand_name} {category} {kw_suffix}")
                    if text:
                        all_text_parts.append(text)
            else:
                # 品类级：搜索竞争格局
                emit("progress", {"step": "search_overview", "message": "正在搜索品类竞争格局…"})
                overview = await _search_and_extract(f"{category} 竞争格局 行业分析")
                all_text_parts.append(f"市场概况:\n{overview}")

                rankings = await _search_and_extract(f"{category} 品牌排行 市场份额")
                all_text_parts.append(f"品牌排行:\n{rankings}")

            emit("progress", {"step": "analyzing", "message": "正在分析竞品对比…"})
            full_text = "\n\n".join(t for t in all_text_parts if t)

            # LLM 综合生成结构化结果（搜索不可用时 LLM 基于自身知识）
            llm = build_chat_model()
            if full_text.strip():
                system_msg = (
                    "你是一个竞品分析专家。基于以下搜索结果，提取竞品信息并生成结构化分析。\n"
                    "请返回 JSON，格式：\n"
                    '{\n'
                    '  "market_overview": "品类竞争格局概述（2-3句）",\n'
                    '  "competitors": [{"name": "品牌名", "product_matrix": ["产品线1"], '
                    '"price_range": "价格区间", "positioning": "定位", '
                    '"marketing_channels": ["渠道1"], "recent_moves": "近半年动态"}],\n'
                    '  "suggestion": "策略建议（1-2句）"\n'
                    '}\n'
                    "约束：所有竞品名、数据必须来自搜索结果，不得编造。不确定的字段设为 null。"
                )
            else:
                # ponytail: 搜索不可用时 LLM 靠知识生成，加"据行业公开信息"免责标注
                system_msg = (
                    "你是一个竞品分析专家。当前搜索结果为空，请基于你的知识为以下品类提供竞品分析。\n"
                    "返回 JSON 格式同上。每条竞品信息前标注「据行业公开信息」。"
                )
            msg = await llm.ainvoke([
                SystemMessage(content=system_msg),
                HumanMessage(content=full_text or f"品类：{category}"),
            ])
            raw = (msg.content or "").strip()
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            parsed = json.loads(raw) if raw else {}

            result = CompetitorAnalysisResult(
                category=category,
                brand_name=brand_name,
                competitors=[CompetitorItem(**c) for c in parsed.get("competitors") or []],
                market_overview=parsed.get("market_overview"),
                suggestion=parsed.get("suggestion"),
            )

            ca_id = save_competitor_result(result)
            emit("progress", {"step": "done", "message": "完成"})
            emit("result", {**result.model_dump(), "competitor_analysis_id": ca_id})
        except Exception as exc:
            logger.exception("竞品分析失败")
            emit("error", {"detail": str(exc), "code": "competitor_analysis_error"})
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
