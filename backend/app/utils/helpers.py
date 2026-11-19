"""
Shared utility helpers for LinguaBridge.
"""

from __future__ import annotations

import hashlib
import logging
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

logger = logging.getLogger(__name__)


def generate_job_id() -> str:
    """Generate a unique job identifier."""
    return uuid.uuid4().hex[:16]


def sha256_digest(data: bytes) -> str:
    """Return hex SHA-256 digest of raw bytes."""
    return hashlib.sha256(data).hexdigest()


def truncate(text: str, max_len: int = 100) -> str:
    """Truncate text for logging, appending '…' if trimmed."""
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


def ensure_dir(path: str | Path) -> Path:
    """Create directory (and parents) if it doesn't exist, return Path."""
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


@contextmanager
def timer(label: str = "operation") -> Generator[dict[str, float], None, None]:
    """Context manager that measures elapsed wall-clock time in milliseconds.

    Usage::

        with timer("translate") as t:
            do_stuff()
        print(t["ms"])
    """
    result: dict[str, float] = {"ms": 0.0}
    start = time.perf_counter()
    try:
        yield result
    finally:
        result["ms"] = (time.perf_counter() - start) * 1000
        logger.debug("%s completed in %.1f ms", label, result["ms"])


def format_timestamp_srt(seconds: float) -> str:
    """Format seconds as SRT timestamp ``HH:MM:SS,mmm``."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def format_timestamp_vtt(seconds: float) -> str:
    """Format seconds as WebVTT timestamp ``HH:MM:SS.mmm``."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"
