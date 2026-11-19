"""
LinguaBridge configuration module.
Uses pydantic-settings to load configuration from environment variables and .env file.
"""

from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=str(Path("F:/LinguaBridge/.env")),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./linguabridge.db"

    @property
    def database_url_resolved(self) -> str:
        """Ensure the DB URL uses the aiosqlite driver."""
        url = self.DATABASE_URL
        if url.startswith("sqlite:///") and "aiosqlite" not in url:
            url = url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
        return url

    # ML Models
    NLLB_MODEL: str = "facebook/nllb-200-distilled-600M"
    WHISPER_MODEL: str = "medium"
    USE_GPU: Literal["auto", "cpu", "cuda"] = "auto"
    LORA_ADAPTER_PATH: str = ""
    PRELOAD_MODELS: bool = True

    # File handling
    MAX_UPLOAD_SIZE_MB: int = 100
    UPLOAD_DIR: str = "./uploads"
    EXPORT_DIR: str = "./exports"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    @property
    def max_upload_bytes(self) -> int:
        """Maximum upload size in bytes."""
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def device(self) -> str:
        """Resolved compute device string."""
        if self.USE_GPU == "auto":
            try:
                import torch
                return "cuda" if torch.cuda.is_available() else "cpu"
            except ImportError:
                return "cpu"
        return self.USE_GPU


settings = Settings()
