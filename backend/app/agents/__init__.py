"""Agent package initialization — registers all agent handlers.

Corresponding OpenSpec: docs/api/workflows.yaml
Corresponding in_scope ID: workflow-orchestration
"""

from app.agents import chat_extraction_agent  # noqa: F401
from app.agents.registry import list_agents

__all__ = ["list_agents"]
