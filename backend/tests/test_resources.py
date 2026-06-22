import pytest
from unittest.mock import MagicMock, patch
from tests.conftest import MockSupabaseQuery

@pytest.fixture(autouse=True)
def mock_supabase_for_resources():
    """Specific mock for resources_router to prevent network calls in subthreads."""
    with patch("app.routers.resources_router.get_supabase_client") as mock_get:
        client = MagicMock()
        mock_get.return_value = client
        yield client

@pytest.mark.asyncio
async def test_get_all_resources(async_client, mock_supabase_for_resources):
    """Test retrieving all active resources successfully."""
    mock_data = [
        {
            "id": "1",
            "title": "Técnica de respiración 4-7-8",
            "description": "Una técnica de respiración para calmar los nervios.",
            "resource_type": "exercise",
            "duration": "5 min",
            "emotion_tags": ["ansiedad", "estrés"],
            "active": True
        }
    ]
    # Configure the query builder chain
    mock_supabase_for_resources.table.return_value = MockSupabaseQuery(mock_data)

    response = await async_client.get("/api/v1/resources/")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["resources"][0]["title"] == "Técnica de respiración 4-7-8"
    assert data["resources"][0]["resource_type"] == "exercise"

@pytest.mark.asyncio
async def test_get_resources_with_emotion_filter(async_client, mock_supabase_for_resources):
    """Test retrieving resources filtered by emotion tag."""
    mock_data = [
        {
            "id": "2",
            "title": "Meditación Mindfulness",
            "description": "Práctica de atención plena para la calma.",
            "resource_type": "meditation",
            "duration": "10 min",
            "emotion_tags": ["ansiedad"],
            "active": True
        }
    ]
    mock_supabase_for_resources.table.return_value = MockSupabaseQuery(mock_data)

    response = await async_client.get("/api/v1/resources/?emotion=ansiedad")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["resources"][0]["title"] == "Meditación Mindfulness"
    assert "ansiedad" in data["resources"][0]["emotion_tags"]
