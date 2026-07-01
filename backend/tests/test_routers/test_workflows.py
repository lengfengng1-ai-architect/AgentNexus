import pytest
from unittest.mock import AsyncMock, patch

from app.schemas.workflow import WorkflowRunResponse


@pytest.fixture(autouse=True)
def mock_workflow_service():
    with patch("app.routers.workflows.workflow_service") as mock:
        mock.run_workflow = AsyncMock()
        yield mock


@pytest.mark.asyncio
async def test_workflows_list__has_workflows__returns_200(client, mock_workflow_service):
    mock_workflow_service.list_workflows.return_value = {
        "items": [{"id": "brand_input_extraction", "name": "品牌需求提取", "version": "0.1"}]
    }

    response = await client.get("/api/v1/workflows")

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["id"] == "brand_input_extraction"


@pytest.mark.asyncio
async def test_workflows_get__existing__returns_definition(client, mock_workflow_service):
    mock_workflow_service.get_workflow.return_value = {
        "id": "brand_input_extraction",
        "name": "品牌需求提取",
        "version": "0.1",
        "nodes": [{"id": "extract", "agent": "chat_extraction"}],
        "edges": [{"from": "extract", "to": "__end__"}],
    }

    response = await client.get("/api/v1/workflows/brand_input_extraction")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "brand_input_extraction"


@pytest.mark.asyncio
async def test_workflows_get__missing__returns_404(client, mock_workflow_service):
    mock_workflow_service.get_workflow.side_effect = KeyError("Workflow 'missing' not found")

    response = await client.get("/api/v1/workflows/missing")

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "not_found"


@pytest.mark.asyncio
async def test_workflows_run__valid__returns_200(client, mock_workflow_service):
    mock_workflow_service.run_workflow.return_value = {
        "workflow_id": "brand_input_extraction",
        "status": "completed",
        "outputs": {
            "extract": {
                "reply": "已收到",
                "brand_input": {"brand_name": "Nike"},
                "is_complete": True,
            }
        },
    }

    response = await client.post(
        "/api/v1/workflows/brand_input_extraction/run",
        json={"input": {"message": "我们是 Nike"}},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["outputs"]["extract"]["brand_input"]["brand_name"] == "Nike"


@pytest.mark.asyncio
async def test_workflows_run__missing_workflow__returns_404(client, mock_workflow_service):
    mock_workflow_service.run_workflow.side_effect = KeyError("Workflow 'missing' not found")

    response = await client.post("/api/v1/workflows/missing/run", json={"input": {}})

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "not_found"


@pytest.mark.asyncio
async def test_workflows_run__invalid_workflow__returns_400(client, mock_workflow_service):
    mock_workflow_service.run_workflow.side_effect = ValueError("Workflow contains a cycle")

    response = await client.post("/api/v1/workflows/bad/run", json={"input": {}})

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "workflow_validation_error"


@pytest.mark.asyncio
async def test_workflows_run__missing_input__returns_422(client):
    response = await client.post("/api/v1/workflows/brand_input_extraction/run", json={})

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_workflows_run__service_error__returns_500(client, mock_workflow_service):
    mock_workflow_service.run_workflow.side_effect = RuntimeError("LLM failed")

    response = await client.post(
        "/api/v1/workflows/brand_input_extraction/run",
        json={"input": {"message": "hi"}},
    )

    assert response.status_code == 500
    assert response.json()["detail"]["code"] == "workflow_run_error"
