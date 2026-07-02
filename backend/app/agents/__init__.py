"""Agent package initialization — registers all agent handlers.

Corresponding OpenSpec: docs/api/workflows.yaml
Corresponding in_scope ID: workflow-orchestration
"""

"""Agent package initialization — registers all agent handlers.

Corresponding OpenSpec: docs/api/workflows.yaml
Corresponding in_scope ID: workflow-orchestration
"""

from app.agents import chat_extraction_agent  # noqa: F401
from app.agents import data_query_agent  # noqa: F401
from app.agents import end_reply_agent  # noqa: F401
from app.agents import intent_recognition_agent  # noqa: F401
from app.agents import reply_builder_agent  # noqa: F401
from app.agents.registry import list_agents

__all__ = ["list_agents"]
