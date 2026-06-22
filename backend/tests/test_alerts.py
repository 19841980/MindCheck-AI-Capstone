import pytest
from uuid import UUID, uuid4
from app.main import app
from app.routers.alerts_router import get_alert_repo

class MockAlertRepository:
    def get_alerts_by_student(self, student_id: UUID, limit: int, offset: int) -> list[dict]:
        return [
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "student_id": str(student_id),
                "alert_type": "moderado",
                "triggered_at": "2026-06-21T00:00:00",
                "acknowledged_at": None
            }
        ]

    def get_unacknowledged_count(self, student_id: UUID) -> int:
        return 5

    def acknowledge_alert(self, alert_id: UUID, student_id: UUID) -> dict | None:
        if str(alert_id) == "00000000-0000-0000-0000-000000000000":
            return None
        return {
            "id": str(alert_id),
            "student_id": str(student_id),
            "alert_type": "moderado",
            "triggered_at": "2026-06-21T00:00:00",
            "acknowledged_at": "2026-06-21T00:05:00"
        }


@pytest.fixture(autouse=True)
def setup_alert_repo_override():
    """Override get_alert_repo dependency for alert tests."""
    app.dependency_overrides[get_alert_repo] = lambda: MockAlertRepository()
    yield
    app.dependency_overrides.pop(get_alert_repo, None)


@pytest.mark.asyncio
async def test_get_alerts_list(async_client):
    """Test retrieving student alerts."""
    response = await async_client.get("/api/v1/alerts/")
    assert response.status_code == 200
    data = response.json()
    assert "alerts" in data
    assert len(data["alerts"]) == 1
    assert data["alerts"][0]["alert_type"] == "moderado"

@pytest.mark.asyncio
async def test_get_unread_count(async_client):
    """Test retrieving unread alert count."""
    response = await async_client.get("/api/v1/alerts/unread-count")
    assert response.status_code == 200
    data = response.json()
    assert data["unread_count"] == 5

@pytest.mark.asyncio
async def test_acknowledge_alert_success(async_client):
    """Test acknowledging an alert successfully."""
    alert_uuid = str(uuid4())
    response = await async_client.patch(f"/api/v1/alerts/{alert_uuid}/acknowledge")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == alert_uuid
    assert data["acknowledged_at"] is not None

@pytest.mark.asyncio
async def test_acknowledge_alert_not_found(async_client):
    """Test 404 response on acknowledging non-existent alert."""
    bad_uuid = "00000000-0000-0000-0000-000000000000"
    response = await async_client.patch(f"/api/v1/alerts/{bad_uuid}/acknowledge")
    assert response.status_code == 404
