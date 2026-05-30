"""MindCheck — Resources API Router."""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Query
from app.repositories.supabase_client import get_supabase_client

logger = logging.getLogger("mindcheck.routers.resources")
router = APIRouter(prefix="/api/v1/resources", tags=["Resources"])
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="resources")


def _fetch_resources(emotion_filter: str | None = None) -> list[dict]:
    """Fetch active resources from Supabase, optionally filtered by emotion tag."""
    client = get_supabase_client()
    query = client.table("resources").select("*").eq("active", True)
    if emotion_filter:
        query = query.contains("emotion_tags", [emotion_filter])
    result = query.order("created_at").execute()
    return result.data or []


@router.get("/")
async def get_resources(emotion: str | None = Query(default=None)):
    """Return all active self-help resources, optionally filtered by emotion."""
    loop = asyncio.get_event_loop()
    resources = await loop.run_in_executor(_executor, _fetch_resources, emotion)
    return {"resources": resources, "total": len(resources)}
