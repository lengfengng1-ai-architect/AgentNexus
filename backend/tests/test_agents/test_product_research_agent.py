"""测试产品调研 Agent 的图结构和节点函数。"""

from unittest.mock import AsyncMock, patch

import pytest

from app.agents.product_research_agent import ProductResearchState
from app.schemas.product_info import (
    SourcedStr, SourcedStrList, SourcedDict,
    Identity, OfficialDescription, Availability,
    ProductResearchResult,
)


def test_product_research_state_has_required_fields():
    """ProductResearchState 包含所需字段。"""
    state = ProductResearchState(product_name="Test")
    assert state.product_name == "Test"
    assert state.search_results == []
    assert state.fetched_pages == []
    assert state.output is None


@pytest.mark.asyncio
async def test_research_product_returns_structured_output():
    """research_product 返回 ProductResearchResult。"""
    from app.agents.product_research_agent import research_product

    expected = ProductResearchResult(
        identity=Identity(product_name=SourcedStr(value="Test Product")),
    )

    with patch("app.agents.product_research_agent._graph") as mock:
        mock.ainvoke = AsyncMock(return_value={"output": expected})

        result = await research_product("Test Product")
        assert isinstance(result, ProductResearchResult)
        assert result.identity.product_name.value == "Test Product"
        mock.ainvoke.assert_awaited_once_with({"product_name": "Test Product"})


@pytest.mark.asyncio
async def test_research_product_raises_on_none_output():
    """_graph 返回 None output 时抛出 ValueError。"""
    from app.agents.product_research_agent import research_product

    with patch("app.agents.product_research_agent._graph") as mock:
        mock.ainvoke = AsyncMock(return_value={"output": None})

        with pytest.raises(ValueError, match="did not return structured"):
            await research_product("Any")
