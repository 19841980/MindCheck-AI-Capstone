import os
import pytest
from uuid import UUID
from unittest.mock import MagicMock, patch

# Configure safe test environment variables before imports
os.environ["SUPABASE_URL"] = "https://mock.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "mockkey"
os.environ["OPENAI_API_KEY"] = "mockkey"
os.environ["ENCRYPTION_KEY"] = "mockkey"
os.environ["APP_SECRET_KEY"] = "mocksecret"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

import httpx
from httpx import ASGITransport
from app.main import app
from app.core.security import get_authenticated_student_id

MOCK_STUDENT_ID = UUID("8deee0df-44b3-42ca-bcc4-a49cf64e96fe")

@pytest.fixture
def mock_student_uuid() -> UUID:
    """Fixture returning the mock student UUID."""
    return MOCK_STUDENT_ID

@pytest.fixture
def override_auth():
    """FastAPI dependency override for authenticated endpoints."""
    app.dependency_overrides[get_authenticated_student_id] = lambda: MOCK_STUDENT_ID
    yield MOCK_STUDENT_ID
    app.dependency_overrides.pop(get_authenticated_student_id, None)

@pytest.fixture
async def async_client(override_auth) -> httpx.AsyncClient:
    """Async HTTP client for testing endpoints."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

# Helper class to mock chained Supabase query builder
class MockSupabaseQuery:
    def __init__(self, data=None):
        self.data = data or []

    def select(self, *args, **kwargs): return self
    def eq(self, *args, **kwargs): return self
    def contains(self, *args, **kwargs): return self
    def order(self, *args, **kwargs): return self
    def limit(self, *args, **kwargs): return self
    def offset(self, *args, **kwargs): return self
    def execute(self, *args, **kwargs):
        mock_res = MagicMock()
        mock_res.data = self.data
        return mock_res

@pytest.fixture(autouse=True)
def mock_supabase():
    """Autouse mock for Supabase Client to prevent internet calls."""
    with patch("app.repositories.supabase_client.get_supabase_client") as mock_get:
        client = MagicMock()
        
        # Configure standard mock behaviors
        client.table.return_value = MockSupabaseQuery([])
        
        mock_get.return_value = client
        yield client

@pytest.fixture(autouse=True)
def mock_openai():
    """Autouse mock for OpenAI Client to prevent internet calls."""
    with patch("app.ai.openai_client.get_openai_client") as mock_get:
        client = MagicMock()
        mock_get.return_value = client
        yield client
