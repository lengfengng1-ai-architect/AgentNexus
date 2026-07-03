"""Agent package initialization — registers all agent handlers.

Corresponding OpenSpec: docs/api/workflows.yaml
Corresponding in_scope ID: workflow-orchestration
"""

from app.agents import action_recommendations_agent  # noqa: F401
from app.agents import audience_insight_agent  # noqa: F401
from app.agents import budget_kpi_agent  # noqa: F401
from app.agents import data_query_agent  # noqa: F401
from app.agents import end_reply_agent  # noqa: F401
from app.agents import execution_planning_agent  # noqa: F401
from app.agents import fitness_analysis_agent  # noqa: F401
from app.agents import intent_recognition_agent  # noqa: F401
from app.agents import market_analysis_agent  # noqa: F401
from app.agents import market_research_agent  # noqa: F401
from app.agents import plan_data_query_agent  # noqa: F401
from app.agents import plan_generator_agent  # noqa: F401
from app.agents import product_research_agent  # noqa: F401
from app.agents import strategy_generation_agent  # noqa: F401
from app.agents.registry import list_agents, register_mock
from app.agents.intent_recognition_agent import mock_run_intent_recognition

# Register mock handlers (used when settings.use_mock_data=True)
register_mock("intent_recognition", mock_run_intent_recognition)

__all__ = ["list_agents"]
