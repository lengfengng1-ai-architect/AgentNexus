import pytest

from app.agents import registry


@pytest.fixture(autouse=True)
def clear_registry():
    registry.clear()
    yield
    registry.clear()


@pytest.mark.asyncio
async def test_register_and_get_handler__returns_handler():
    async def handler(state: dict) -> dict:
        return {"result": "ok"}

    registry.register("test_agent", handler)

    found = registry.get_handler("test_agent")
    assert found is handler
    assert await found({}) == {"result": "ok"}


def test_get_handler__unknown_agent__raises_key_error():
    with pytest.raises(KeyError, match="Agent 'missing' is not registered"):
        registry.get_handler("missing")


def test_list_agents__after_registration__returns_sorted_names():
    async def handler(state: dict) -> dict:
        return {}

    registry.register("beta", handler)
    registry.register("alpha", handler)

    assert registry.list_agents() == ["alpha", "beta"]


def test_register__empty_name__raises_value_error():
    async def handler(state: dict) -> dict:
        return {}

    with pytest.raises(ValueError, match="Agent name must not be empty"):
        registry.register("", handler)
