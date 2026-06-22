import pytest
from uuid import UUID, uuid4
from app.main import app
from app.routers.journal_router import get_journal_service, get_alert_service

# Mock objects for dependencies
class MockJournalService:
    async def create_and_analyze_entry(self, student_id: UUID, content: str) -> dict:
        return {
            "entry": {
                "id": "93159550-560e-401a-8330-a8244b27af8d",
                "student_id": str(student_id),
                "created_at": "2026-06-21T00:00:00"
            },
            "analysis": {
                "sentiment_score": 0.8,
                "dominant_emotion": "alegría",
                "risk_level": "bajo",
                "keywords": ["feliz", "motivada"],
                "recommendations": ["Sigue así!"]
            },
            "ai_available": True
        }

    async def save_manual_emotion(self, entry_id: UUID, student_id: UUID, manual_data: dict) -> dict:
        return {
            "entry": {
                "id": str(entry_id),
                "student_id": str(student_id),
                "created_at": "2026-06-21T00:00:00"
            },
            "analysis": {
                "sentiment_score": manual_data.get("sentiment_score", 0.0),
                "dominant_emotion": manual_data["dominant_emotion"],
                "risk_level": manual_data.get("risk_level", "bajo"),
                "keywords": [],
                "recommendations": []
            }
        }

    async def get_student_entries(self, student_id: UUID, limit: int, offset: int) -> list[dict]:
        return [
            {
                "id": "93159550-560e-401a-8330-a8244b27af8d",
                "student_id": str(student_id),
                "sentiment_score": 0.8,
                "dominant_emotion": "alegría",
                "risk_level": "bajo",
                "created_at": "2026-06-21T00:00:00"
            }
        ]

    async def get_entry_detail(self, entry_id: UUID, student_id: UUID) -> dict | None:
        if str(entry_id) == "00000000-0000-0000-0000-000000000000":
            return None
        return {
            "entry": {
                "id": str(entry_id),
                "student_id": str(student_id),
                "content_decrypted": "Hoy me siento genial.",
                "created_at": "2026-06-21T00:00:00"
            },
            "analysis": {
                "sentiment_score": 0.8,
                "dominant_emotion": "alegría",
                "risk_level": "bajo",
                "keywords": ["feliz"],
                "recommendations": []
            }
        }

    async def delete_entry(self, entry_id: UUID, student_id: UUID) -> bool:
        if str(entry_id) == "00000000-0000-0000-0000-000000000000":
            return False
        return True


class MockAlertService:
    async def detect_risk_pattern_in_entries(self, student_id, entry_id, latest_analysis):
        return None


@pytest.fixture(autouse=True)
def setup_overrides():
    """Apply dependency overrides for the duration of these tests."""
    app.dependency_overrides[get_journal_service] = lambda: MockJournalService()
    app.dependency_overrides[get_alert_service] = lambda: MockAlertService()
    yield
    app.dependency_overrides.pop(get_journal_service, None)
    app.dependency_overrides.pop(get_alert_service, None)


@pytest.mark.asyncio
async def test_analyze_entry_success(async_client):
    """Test successful journal entry analysis."""
    payload = {"content": "Hoy me siento súper motivada para terminar el capstone."}
    response = await async_client.post("/api/v1/journal/analyze", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["ai_available"] is True
    assert data["entry"]["id"] == "93159550-560e-401a-8330-a8244b27af8d"
    assert data["analysis"]["dominant_emotion"] == "alegría"

@pytest.mark.asyncio
async def test_analyze_entry_validation_error(async_client):
    """Test character limit validation error (< 20 chars)."""
    payload = {"content": "Corto"}
    response = await async_client.post("/api/v1/journal/analyze", json=payload)
    assert response.status_code == 422  # Validation Error

@pytest.mark.asyncio
async def test_manual_emotion_success(async_client):
    """Test successful manual emotion fallback register."""
    payload = {
        "entry_id": "93159550-560e-401a-8330-a8244b27af8d",
        "dominant_emotion": "calma",
        "sentiment_score": 0.5,
        "risk_level": "bajo"
    }
    response = await async_client.post("/api/v1/journal/manual-emotion", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["analysis"]["dominant_emotion"] == "calma"

@pytest.mark.asyncio
async def test_list_entries(async_client):
    """Test list entries paginated view."""
    response = await async_client.get("/api/v1/journal/entries?limit=10&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert "entries" in data
    assert len(data["entries"]) == 1

@pytest.mark.asyncio
async def test_entry_detail_found(async_client):
    """Test single entry details response."""
    test_id = str(uuid4())
    response = await async_client.get(f"/api/v1/journal/entries/{test_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["entry"]["id"] == test_id
    assert "content_decrypted" in data["entry"]

@pytest.mark.asyncio
async def test_entry_detail_not_found(async_client):
    """Test 404 response on missing entry detail request."""
    test_id = "00000000-0000-0000-0000-000000000000"
    response = await async_client.get(f"/api/v1/journal/entries/{test_id}")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_delete_entry_success(async_client):
    """Test successful deletion of a journal entry."""
    test_id = str(uuid4())
    response = await async_client.delete(f"/api/v1/journal/entries/{test_id}")
    assert response.status_code == 204

@pytest.mark.asyncio
async def test_delete_entry_not_found(async_client):
    """Test 404 response on deleting missing entry."""
    test_id = "00000000-0000-0000-0000-000000000000"
    response = await async_client.delete(f"/api/v1/journal/entries/{test_id}")
    assert response.status_code == 404
