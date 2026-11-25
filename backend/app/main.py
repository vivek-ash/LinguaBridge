"""
LinguaBridge – FastAPI application entry point.

Creates the app with lifespan management for ML model loading,
CORS middleware, static file serving, and all API routers.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import create_tables
from app.ml.model_manager import model_manager

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Startup/shutdown lifecycle: load ML models and create DB tables."""
    logger.info("🌐 LinguaBridge starting up …")

    # Create database tables
    await create_tables()
    logger.info("Database tables ready.")

    # Configure and optionally preload models
    model_manager.configure(
        device=settings.device,
        nllb_model=settings.NLLB_MODEL,
        whisper_model=settings.WHISPER_MODEL,
        lora_path=settings.LORA_ADAPTER_PATH,
    )

    # Preload and warm up all models on startup if configured (local workstation mode)
    import os
    is_cloud = bool(os.environ.get("RENDER") or os.environ.get("PORT"))
    should_preload = settings.PRELOAD_MODELS and not is_cloud

    if should_preload:
        logger.info("⚡ Pre-loading and warming up ML models for instant translation …")
        import asyncio
        await asyncio.to_thread(model_manager.preload_all)
        logger.info("🚀 LinguaBridge is ready! All models loaded and warmed up in memory.")
    else:
        logger.info("ℹ️ Running in cloud-light mode (is_cloud=%s, PRELOAD_MODELS=%s) – ready for requests.", is_cloud, settings.PRELOAD_MODELS)
    yield

    # Shutdown
    model_manager.unload_all()
    logger.info("LinguaBridge shut down.")


def create_app() -> FastAPI:
    """Application factory."""
    application = FastAPI(
        title="LinguaBridge",
        description="Real-time multilingual translation platform with AI sign-language avatar",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Static files
    uploads_dir = Path(settings.UPLOAD_DIR)
    exports_dir = Path(settings.EXPORT_DIR)
    uploads_dir.mkdir(parents=True, exist_ok=True)
    exports_dir.mkdir(parents=True, exist_ok=True)
    application.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
    application.mount("/exports", StaticFiles(directory=str(exports_dir)), name="exports")

    # Routers
    from app.routers import translation, voice, video, documents, history, glossary, analytics
    application.include_router(translation.router, prefix="/api", tags=["Translation"])
    application.include_router(voice.router, tags=["Voice"])
    application.include_router(video.router, prefix="/api", tags=["Video"])
    application.include_router(documents.router, prefix="/api", tags=["Documents"])
    application.include_router(history.router, prefix="/api", tags=["History"])
    application.include_router(glossary.router, prefix="/api", tags=["Glossary"])
    application.include_router(analytics.router, prefix="/api", tags=["Analytics"])

    @application.get("/health", tags=["System"])
    async def health_check():
        return {
            "status": "healthy",
            "models": {
                "nllb": model_manager.nllb_ready,
                "whisper": model_manager.whisper_ready,
                "fasttext": model_manager.fasttext_ready,
            },
        }

    return application


app = create_app()
