"""Plan generator agent for plan generation pipeline.

Corresponding OpenSpec: docs/api/paths/plan.yaml
Corresponding in_scope ID: plan-generation

2026-07-07: Rewritten from 9 serial LLM calls to 1-shot generation.
LLM outputs 9 chapters with @@CH:N@@ separators; handler parses incrementally.

2026-07-09: Added parallel XLSX generation.
Uses asyncio.gather to run 1-shot chapter generation and
with_structured_output + generate_plan_xlsx tool in parallel.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.types import StreamWriter

from app.agents.llm_utils import build_chat_model, stream_chat, write_log
from app.agents.registry import register
from app.agents.tools.generate_xlsx import generate_plan_xlsx
from app.schemas.plan_generation import (
    PLAN_CHAPTER_SPEC,
    PlanChapter,
    PlanGeneratorOutput,
)
from app.schemas.xlsx_generation import XlsxData

logger = logging.getLogger(__name__)

_PROMPT_DIR = Path(__file__).parent.parent / "prompt_templates"

# ponytail: simple regex for @@CH:N@@ — works because N (1-9) is predictably
# the first int after the marker.  A streaming state-machine over the buffer
# would be more robust for malformed-but-recoverable output; we fail early
# (10ths-of-chars per run) and the ceiling is "9 separate segments, any order
# means raise" which is what we want.
_CHAPTER_PATTERN = re.compile(r"@@CH:(\d+)@@")


def _render(name: str, **kw) -> str:
    env = Environment(loader=FileSystemLoader(str(_PROMPT_DIR)))
    return env.get_template(f"{name}.md.j2").render(**kw)


def _serialize(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _parse_chapters(text: str) -> list[str]:
    """Split LLM output text into chapter content segments.

    Scan for @@CH:N@@ markers and return exactly 9 segments.
    Raises ValueError if marker count is wrong or markers outside 1-9 exist.
    """
    parts = _CHAPTER_PATTERN.split(text)
    # parts[0] is text before first marker (thinking preamble) — skip it
    # On match: parts = [preamble, "1", segment1, "2", segment2, ...]

    segments: list[str] = []
    for i in range(1, len(parts), 2):
        idx_str = parts[i]  # e.g. "1" or "10"
        content = parts[i + 1] if i + 1 < len(parts) else ""
        seg_idx = int(idx_str)
        if 1 <= seg_idx <= 9:
            segments.append(content.strip())
        else:
            raise ValueError(
                f"plan_generator: unexpected chapter marker @@CH:{seg_idx}@@ "
                f"— LLM output format violation"
            )

    if len(segments) != 9:
        raise ValueError(
            f"plan_generator: expected 9 chapter segments from LLM, "
            f"got {len(segments)} — LLM output format violation"
        )
    return segments


async def run_plan_generator(
    state: dict[str, Any],
    writer: StreamWriter | None = None,
) -> dict[str, Any]:
    """Generate 9 marketing plan chapters in a single LLM call.

    Streams LLM output incrementally, parses @@CH:N@@ markers to
    write per-chapter milestone logs.  Returns the consolidated
    PlanGeneratorOutput on completion.

    Title/subtitle are fixed by PLAN_CHAPTER_SPEC; LLM only fills content.
    The ``writer`` parameter is accepted for future C3 streaming but
    intentionally unused in C1 (process feedback goes through write_log).

    After chapters are generated, extracts structured XLSX data from
    the chapter content + upstream node outputs and generates a
    budget/process/ROI table via the ``generate_plan_xlsx`` LangChain tool.
    """
    brand_input = state.get("brand_input") or {}
    brand_name = brand_input.get("brand_name")
    category = brand_input.get("category")
    city = brand_input.get("city")
    if not all([brand_name, category, city]):
        raise ValueError("Missing required brand inputs")

    reject_reason = brand_input.get("_reject_reason")

    logger.info("[plan_generator] start: 1-shot 9 chapters for %s", brand_name)
    write_log("plan_generator", "🤖 开始生成营销方案(9章)…")
    write_log("plan_generator", "🤔 策略构思中…")

    # ── Step 1: 1-shot LLM 生成 9 章 ─────────────────────
    prompt = _render(
        "plan_generator",
        brand_name=brand_name,
        category=category,
        city=city,
        cities=brand_input.get("selected_cities") or [city],
        budget=brand_input.get("budget", ""),
        period=brand_input.get("period", ""),
        reject_reason=reject_reason or "",
        market_research=_serialize(state.get("market_research", {})),
        audience_insight=_serialize(state.get("audience_insight", {})),
        city_data=_serialize(state.get("plan_data_query", {})),
        fitness_analysis=_serialize(state.get("fitness_analysis", {})),
        strategy=_serialize(state.get("strategy_generation", {})),
        execution=_serialize(state.get("execution_planning", {})),
        budget_kpi=_serialize(state.get("budget_kpi", {})),
        action_recommendations=_serialize(state.get("action_recommendations", {})),
    )
    user_msg = f"请为 {brand_name} 生成完整 9 章营销方案。"

    logger.info("[plan_generator] 1-shot LLM call starting")
    full_text = ""
    async for token in stream_chat(prompt, user_msg):
        full_text += token

    logger.info("[plan_generator] 1-shot LLM done (%d chars)", len(full_text))

    segments = _parse_chapters(full_text)

    chapters: list[PlanChapter] = []
    for idx, (title, subtitle) in enumerate(PLAN_CHAPTER_SPEC):
        content = segments[idx]
        if not content:
            raise ValueError(
                f"plan_generator: Chapter {idx + 1} ({title}) produced empty content"
            )

        chapter = PlanChapter(title=title, subtitle=subtitle, content=content)
        chapters.append(chapter)

        write_log("plan_generator", f"✓ 第{idx + 1}章:{title}")

    logger.info("[plan_generator] all 9 chapters done for %s", brand_name)
    write_log("plan_generator", "✓ 方案生成完成")

    # ── Step 2: 根据方案内容提取 XLSX 数据 + 生成表格 ────
    xlsx_path = await _generate_xlsx_from_chapters(state, chapters, brand_name, category, city)
    await asyncio.sleep(0)  # yield control
    write_log("plan_generator", "📊 预算流程回报分析表格已生成" if xlsx_path else "⚠️ XLSX 表格生成失败（不影响方案内容）")

    return PlanGeneratorOutput(chapters=chapters, xlsx_path=xlsx_path).model_dump()


register("plan_generator", run_plan_generator)


async def _generate_xlsx_from_chapters(
    state: dict[str, Any],
    chapters: list[PlanChapter],
    brand_name: str,
    category: str,
    city: str,
) -> str:
    """根据方案 9 章内容 + 上游数据，提取结构化 XLSX 数据并生成表格。

    在方案内容生成完成后同步调用，结果通过 xlsx_path 附加在输出中。
    异常不影响方案内容返回。
    """
    brand_input = state.get("brand_input") or {}
    budget_kpi = state.get("budget_kpi", {})
    allocations = budget_kpi.get("allocations", [])
    kpis = budget_kpi.get("kpis", {})
    milestones = budget_kpi.get("timeline", [])
    execution = state.get("execution_planning", {})
    strategy = state.get("strategy_generation", {})
    period_val = brand_input.get("period", 3)
    budget_val = brand_input.get("budget", 0)

    # 汇总方案内容用于 prompt
    chapters_summary = ""
    for ch in chapters:
        content_preview = ch.content[:200].replace("\n", " ").replace("#*`", " ")
        chapters_summary += f"\n【{ch.title}】{ch.subtitle}\n{content_preview}\n"

    cities = brand_input.get("selected_cities", [])
    is_multi_city = isinstance(cities, list) and len(cities) > 1

    try:
        xlsx_prompt = _render(
            "xlsx_generation",
            brand_name=brand_name,
            category=category,
            city=city,
            budget=budget_val,
            period=period_val,
            positioning=strategy.get("positioning", ""),
            marketing_goal=strategy.get("marketing_goal", ""),
            leagues_plan=execution.get("leagues_plan", ""),
            events_plan=execution.get("events_plan", ""),
            influencer_plan=execution.get("influencer_plan", ""),
            content_plan=execution.get("content_plan", ""),
            store_plan=execution.get("store_plan", ""),
            total_budget=budget_val,
            allocations=allocations,
            kpis=kpis,
            milestones=milestones,
            strategy_framework=strategy.get("strategy_framework", ""),
            key_messages=strategy.get("key_messages", []),
            is_multi_city=is_multi_city,
        )
    except Exception as exc:
        logger.warning("[plan_generator] xlsx prompt render failed: %s", exc)
        return ""

    write_log("plan_generator", "📊 正在根据方案内容提取 XLSX 表格数据…")

    try:
        llm = build_chat_model().with_structured_output(XlsxData)
        xlsx_data: XlsxData = await llm.ainvoke([
            SystemMessage(content=xlsx_prompt),
            HumanMessage(
                content=(
                    f"请为 {brand_name} 在 {city} 的营销方案提取 XLSX 表格数据。\n\n"
                    f"方案内容摘要（共 {len(chapters)} 章）：\n{chapters_summary}"
                )
            ),
        ])
        write_log("plan_generator", "✓ XLSX 数据提取完成，正在生成表格…")

        xlsx_json = xlsx_data.model_dump_json(ensure_ascii=False, indent=2)
        xlsx_path = await generate_plan_xlsx.ainvoke(
            {"data": xlsx_json, "brand_name": brand_name}
        )

        if xlsx_path.startswith("XLSX 生成失败") or xlsx_path.startswith("数据解析失败"):
            logger.warning("[plan_generator] xlsx tool returned error: %s", xlsx_path)
            write_log("plan_generator", f"⚠️ XLSX 生成遇到问题：{xlsx_path[:50]}")
            return ""

        logger.info("[plan_generator] xlsx generated: %s", xlsx_path)
        # Convert absolute filesystem path to URL path
        url_path = xlsx_path.replace("\\", "/")
        filename = url_path.split("/")[-1]
        url_path = f"/xlsx/{filename}"
        return url_path
    except Exception as exc:
        logger.exception("[plan_generator] xlsx generation failed")
        return ""
