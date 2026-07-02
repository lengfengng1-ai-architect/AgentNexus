"""Requirement collector agent for plan generation pipeline.

Corresponding OpenSpec: openspec/changes/add-plan-generation-workbench/specs/plan-generation-pipeline/spec.md
Corresponding in_scope ID: plan-generation
"""

from typing import Any

from app.agents.registry import register
from app.schemas.chat import BrandInput
from app.schemas.plan_generation import RequirementCollectorOutput

REQUIRED_FIELDS = ["brand_name", "category", "city", "budget", "period"]


def _validate_brand_input(brand_input: dict[str, Any]) -> tuple[bool, list[str]]:
    """Check whether all required brand_input fields are present and non-empty."""
    missing = []
    for field in REQUIRED_FIELDS:
        value = brand_input.get(field)
        if value is None or (isinstance(value, str) and not value.strip()):
            missing.append(field)
    return not missing, missing


async def run_requirement_collector(state: dict[str, Any]) -> dict[str, Any]:
    """Validate brand_input completeness for plan generation."""
    brand_input = state.get("brand_input") or {}
    is_complete, missing = _validate_brand_input(brand_input)

    output = RequirementCollectorOutput(
        is_complete=is_complete,
        missing_fields=missing,
        brand_input=BrandInput.model_validate(brand_input).model_dump(),
    )
    return output.model_dump()


register("requirement_collector", run_requirement_collector)


async def mock_run_requirement_collector(state: dict[str, Any]) -> dict[str, Any]:
    """Deterministic mock for tests."""
    return await run_requirement_collector(state)
