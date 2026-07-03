"""Plan generator agent for plan generation pipeline.

Corresponding OpenSpec: docs/api/paths/plan.yaml
Corresponding in_scope ID: plan-generation
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader
from langgraph.types import StreamWriter

from app.agents.llm_utils import invoke_json
from app.agents.registry import register
from app.schemas.plan_generation import (
    PLAN_CHAPTER_SPEC,
    PlanChapter,
    PlanGeneratorOutput,
)

_PROMPT_DIR = Path(__file__).parent.parent / "prompt_templates"


def _render(name: str, **kw) -> str:
    env = Environment(loader=FileSystemLoader(str(_PROMPT_DIR)))
    return env.get_template(f"{name}.md.j2").render(**kw)


def _serialize(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


async def run_plan_generator(
    state: dict[str, Any],
    writer: StreamWriter | None = None,
) -> dict[str, Any]:
    """Generate 9 marketing plan chapters, one LLM call per chapter.

    Title/subtitle are fixed by PLAN_CHAPTER_SPEC; LLM only fills content.
    Emits chapter.start and chapter.complete events when a StreamWriter is provided.
    """
    brand_input = state.get("brand_input") or {}
    brand_name = brand_input.get("brand_name")
    category = brand_input.get("category")
    city = brand_input.get("city")
    if not all([brand_name, category, city]):
        raise ValueError("Missing required brand inputs")

    reject_reason = brand_input.get("_reject_reason")

    chapters: list[PlanChapter] = []
    for index, (title, subtitle) in enumerate(PLAN_CHAPTER_SPEC):
        if writer is not None:
            writer(
                {
                    "event": "chapter.start",
                    "index": index,
                    "title": title,
                    "subtitle": subtitle,
                }
            )

        prompt = _render(
            "plan_generator_chapter",
            index=index,
            title=title,
            subtitle=subtitle,
            brand_name=brand_name,
            category=category,
            city=city,
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

        result = invoke_json(
            prompt,
            f"请为 {brand_name} 撰写「{title}」章节内容。",
        )
        content = str(result.get("content", "")).strip()
        if not content:
            raise ValueError(f"Chapter {index} ({title}) produced empty content")

        chapter = PlanChapter(title=title, subtitle=subtitle, content=content)
        chapters.append(chapter)

        if writer is not None:
            writer(
                {
                    "event": "chapter.complete",
                    "index": index,
                    "title": title,
                    "subtitle": subtitle,
                    "content": content,
                }
            )

    return PlanGeneratorOutput(chapters=chapters).model_dump()


register("plan_generator", run_plan_generator)
