"""Router tests for plan generation endpoints.

Corresponding OpenSpec: docs/api/paths/plan.yaml
Corresponding in_scope ID: plan-generation
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.routers import plan as plan_router


async def _mock_stream(*args: Any, **kwargs: Any) -> AsyncGenerator[str, None]:
    yield "id: 1\nevent: workflow.start\ndata: {\"run_id\": \"r1\"}\n\n"
    yield "id: 2\nevent: node.start\ndata: {\"run_id\": \"r1\", \"node_id\": \"strategy_generation\"}\n\n"


async def _mock_true(*args: Any, **kwargs: Any) -> bool:
    return True


async def _mock_false(*args: Any, **kwargs: Any) -> bool:
    return False


async def _mock_delete(*args: Any, **kwargs: Any) -> None:
    return None


async def _mock_status(*args: Any, **kwargs: Any) -> dict[str, Any]:
    return {
        "run_id": "r1",
        "status": "paused",
        "current_node": "strategy_generation",
        "outputs": {},
        "paused_snapshot": None,
        "error": None,
    }


@pytest.fixture(autouse=True)
def _patch_router(monkeypatch: pytest.MonkeyPatch) -> None:
    """Patch router's imported service functions to avoid real agent calls."""
    monkeypatch.setattr(plan_router, "start_run", _mock_stream)
    monkeypatch.setattr(plan_router, "approve_run", _mock_stream)
    monkeypatch.setattr(plan_router, "reject_run", _mock_stream)
    monkeypatch.setattr(plan_router, "rerun_run", _mock_stream)
    monkeypatch.setattr(plan_router, "delete_run", _mock_delete)
    monkeypatch.setattr(plan_router, "get_status", _mock_status)
    monkeypatch.setattr(plan_router, "run_exists", _mock_true)


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_plan_run_returns_sse_and_run_id(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/plan/run",
        json={"brand_input": {"brand_name": "Nike", "category": "sportswear"}},
    )
    assert response.status_code == 200
    assert response.headers["x-run-id"]
    body = response.text
    assert "workflow.start" in body
    assert "node.start" in body


async def test_plan_run_with_explicit_run_id_returns_same_id(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/plan/run",
        json={"brand_input": {"brand_name": "Nike", "run_id": "explicit-id"}},
    )
    assert response.status_code == 200
    assert response.headers["x-run-id"] == "explicit-id"


async def test_plan_run_bad_run_id_returns_400(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/plan/run",
        json={"brand_input": {"brand_name": "Nike", "run_id": 123}},
    )
    assert response.status_code == 400
    payload = response.json()
    assert payload["code"] == "bad_request"


async def test_plan_run_missing_brand_input_returns_422(client: AsyncClient) -> None:
    response = await client.post("/api/v1/plan/run", json={})
    assert response.status_code == 422


async def test_approve_run_returns_sse(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/plan/runs/r1/approve",
        json={"edited_input": {"strategy_generation": {"theme": "户外"}}},
    )
    assert response.status_code == 200
    assert response.headers["x-run-id"] == "r1"


async def test_approve_run_not_found_returns_404(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(plan_router, "run_exists", _mock_false)
    response = await client.post("/api/v1/plan/runs/r1/approve", json={})
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


async def test_reject_run_returns_sse(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/plan/runs/r1/reject",
        json={"reason": "预算不足"},
    )
    assert response.status_code == 200
    assert response.headers["x-run-id"] == "r1"


async def test_reject_run_missing_reason_returns_422(client: AsyncClient) -> None:
    response = await client.post("/api/v1/plan/runs/r1/reject", json={})
    assert response.status_code == 422


async def test_reject_run_not_found_returns_404(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(plan_router, "run_exists", _mock_false)
    response = await client.post("/api/v1/plan/runs/r1/reject", json={"reason": "x"})
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


async def test_rerun_run_returns_sse(client: AsyncClient) -> None:
    response = await client.post("/api/v1/plan/runs/r1/rerun")
    assert response.status_code == 200
    assert response.headers["x-run-id"] == "r1"
    body = response.text
    assert "workflow.start" in body


async def test_rerun_run_not_found_returns_404(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(plan_router, "run_exists", _mock_false)
    response = await client.post("/api/v1/plan/runs/r1/rerun")
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


async def test_cancel_run_returns_200(client: AsyncClient) -> None:
    response = await client.post("/api/v1/plan/runs/r1/cancel")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["status"] == "canceled"


async def test_cancel_run_not_found_returns_404(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(plan_router, "run_exists", _mock_false)
    response = await client.post("/api/v1/plan/runs/r1/cancel")
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


async def test_status_returns_200(client: AsyncClient) -> None:
    response = await client.get("/api/v1/plan/runs/r1/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["status"] == "paused"


async def test_status_not_found_returns_404(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(plan_router, "run_exists", _mock_false)
    response = await client.get("/api/v1/plan/runs/r1/status")
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


async def test_status_internal_error_returns_500(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def boom(*args: Any, **kwargs: Any) -> dict[str, Any]:
        raise RuntimeError("boom")

    monkeypatch.setattr(plan_router, "get_status", boom)
    response = await client.get("/api/v1/plan/runs/r1/status")
    assert response.status_code == 500


async def test_media_status_returns_200(client: AsyncClient) -> None:
    response = await client.get("/api/v1/plan/runs/r1/media-status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert "promo_video" in payload["data"]
    assert "poster" in payload["data"]


async def test_media_status_internal_error_returns_500(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def boom(*args: Any, **kwargs: Any) -> dict[str, Any]:
        raise RuntimeError("boom")

    monkeypatch.setattr(plan_router, "get_media_status", boom)
    response = await client.get("/api/v1/plan/runs/r1/media-status")
    assert response.status_code == 500
