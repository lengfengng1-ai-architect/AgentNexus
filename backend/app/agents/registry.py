"""Agent registry.

Corresponding in_scope ID: workflow-orchestration
"""

from collections.abc import Awaitable, Callable
from typing import Any

AgentHandler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]

_AGENT_REGISTRY: dict[str, AgentHandler] = {}


def register(name: str, handler: AgentHandler) -> None:
    """Register an agent handler under a unique name."""
    if not name:
        raise ValueError("Agent name must not be empty")
    _AGENT_REGISTRY[name] = handler


def get_handler(name: str) -> AgentHandler:
    """Look up a registered agent handler by name."""
    if name not in _AGENT_REGISTRY:
        raise KeyError(f"Agent '{name}' is not registered")
    return _AGENT_REGISTRY[name]


def list_agents() -> list[str]:
    """Return a sorted list of registered agent names."""
    return sorted(_AGENT_REGISTRY.keys())


def snapshot() -> dict[str, AgentHandler]:
    """Return a shallow copy of the current registry."""
    return dict(_AGENT_REGISTRY)


def restore(snapshot: dict[str, AgentHandler]) -> None:
    """Restore the registry from a snapshot."""
    _AGENT_REGISTRY.clear()
    _AGENT_REGISTRY.update(snapshot)


def clear() -> None:
    """Clear all registered agents. Mainly for tests."""
    _AGENT_REGISTRY.clear()
