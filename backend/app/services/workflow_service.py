"""Workflow service: load, validate, and run configured workflows.

Corresponding OpenSpec: docs/api/workflows.yaml
Corresponding in_scope ID: workflow-orchestration
"""

from pathlib import Path
from typing import Any

import yaml

from app.agents.orchestrator import WorkflowState, build_graph
from app.agents.registry import list_agents
from app.schemas.workflow import (
    WorkflowDefinition,
    WorkflowListResponse,
    WorkflowNode,
    WorkflowSummary,
)

_WORKFLOWS_DIR = Path(__file__).parent.parent.parent / "workflows"
_workflows: dict[str, WorkflowDefinition] | None = None


def _load_workflow_definitions() -> dict[str, WorkflowDefinition]:
    """Load all workflow YAML files from backend/workflows/."""
    workflows: dict[str, WorkflowDefinition] = {}

    if not _WORKFLOWS_DIR.exists():
        return workflows

    for path in sorted(_WORKFLOWS_DIR.glob("*.yaml")):
        with path.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        workflow = WorkflowDefinition.model_validate(data)
        _validate_workflow(workflow)
        workflows[workflow.id] = workflow

    return workflows


def _validate_workflow(workflow: WorkflowDefinition) -> None:
    """Validate workflow definition against the agent registry."""
    registered = set(list_agents())
    node_ids = {node.id for node in workflow.nodes}

    for node in workflow.nodes:
        if node.agent not in registered:
            raise ValueError(
                f"Workflow '{workflow.id}' references unregistered agent '{node.agent}'"
            )
        if node.depends_on:
            for dep in node.depends_on:
                if dep not in node_ids:
                    raise ValueError(
                        f"Node '{node.id}' depends on unknown node '{dep}'"
                    )

    # Ensure no duplicate node IDs.
    if len(node_ids) != len(workflow.nodes):
        raise ValueError(f"Workflow '{workflow.id}' contains duplicate node IDs")


def _get_workflows() -> dict[str, WorkflowDefinition]:
    """Return cached workflow definitions, loading them on first call."""
    global _workflows  # noqa: PLW0603

    if _workflows is None:
        _workflows = _load_workflow_definitions()
    return _workflows


def list_workflows() -> WorkflowListResponse:
    """Return a list of all registered workflow summaries."""
    workflows = _get_workflows()
    items = [
        WorkflowSummary(id=w.id, name=w.name, version=w.version)
        for w in workflows.values()
    ]
    return WorkflowListResponse(items=items)


def get_workflow(workflow_id: str) -> WorkflowDefinition:
    """Return a workflow definition by ID."""
    workflows = _get_workflows()
    if workflow_id not in workflows:
        raise KeyError(f"Workflow '{workflow_id}' not found")
    return workflows[workflow_id]


async def run_workflow(workflow_id: str, initial_input: dict[str, Any]) -> dict[str, Any]:
    """Run a workflow with the given input and return all node outputs."""
    workflow = get_workflow(workflow_id)
    graph = build_graph(workflow)

    initial_state = WorkflowState(input=initial_input)
    result = await graph.ainvoke(initial_state)
    final_state = WorkflowState.model_validate(result)

    return {
        "workflow_id": workflow_id,
        "status": "completed" if final_state.status != "failed" else "failed",
        "outputs": final_state.outputs,
    }


def reload_workflows() -> None:
    """Reload workflow definitions from disk. Useful for tests and hot-reload."""
    global _workflows  # noqa: PLW0603

    _workflows = _load_workflow_definitions()


# Expose validation helper for tests.
validate_workflow = _validate_workflow
