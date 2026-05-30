"""
MindCheck Backend — FastAPI Application Entry Point.

Configures CORS, global exception handling, and router mounting.
Generates automatic OpenAPI/Swagger documentation at /docs.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.routers.journal_router import router as journal_router
from app.routers.resources_router import router as resources_router

# --- Logging Configuration ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("mindcheck")


# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    settings = get_settings()
    logger.info(
        "MindCheck API starting — env=%s",
        settings.app_env,
    )
    yield
    logger.info("MindCheck API shutting down.")


# --- Application ---
app = FastAPI(
    title="MindCheck API",
    description=(
        "API backend para la PWA de Bienestar Mental Estudiantil de Duoc UC. "
        "Proporciona endpoints para bitácoras emocionales, análisis de sentimiento "
        "con IA, alertas inteligentes y recursos de autoayuda."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# --- CORS Middleware ---
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# --- Global Exception Handler ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler.
    
    Transforms internal errors into consistent HTTP responses.
    Never exposes stack traces or emotional data in production.
    """
    logger.error(
        "Unhandled exception: %s",
        str(exc),
        extra={"path": request.url.path, "method": request.method},
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Ha ocurrido un error interno. Por favor intenta de nuevo.",
            "error_type": type(exc).__name__,
        },
    )


# --- Mount Routers ---
app.include_router(journal_router)
app.include_router(resources_router)


# --- Health Check ---
@app.get("/health", tags=["System"])
async def health_check():
    """API health check endpoint."""
    return {
        "status": "ok",
        "version": "0.1.0",
        "environment": settings.app_env,
    }


@app.get("/", tags=["System"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "MindCheck API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
    }
