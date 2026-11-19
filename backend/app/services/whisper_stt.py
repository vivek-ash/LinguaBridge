"""
Whisper speech-to-text service – wraps faster-whisper.
Returns timestamped segments from audio data.
"""

from __future__ import annotations

import io
import logging
import tempfile
from pathlib import Path
from typing import Any, Optional

from app.ml.model_manager import model_manager

logger = logging.getLogger(__name__)


async def transcribe(
    audio_data: bytes,
    language: Optional[str] = None,
    word_timestamps: bool = True,
) -> dict:
    """
    Transcribe audio bytes using faster-whisper.

    Returns::

        {
            "segments": [
                {
                    "id": int,
                    "start": float,
                    "end": float,
                    "text": str,
                    "words": [{"word": str, "start": float, "end": float, "probability": float}],
                }
            ],
            "language": str,
            "language_probability": float,
            "duration": float,
            "is_fallback": bool,
        }
    """
    whisper = model_manager.get_whisper()

    if whisper is None:
        logger.info("Whisper model unavailable – returning empty transcription.")
        return _fallback_transcription()

    try:
        # Write audio to a temporary file (faster-whisper needs file path)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        try:
            segments_iter, info = whisper.transcribe(
                tmp_path,
                language=language,
                word_timestamps=word_timestamps,
                beam_size=5,
                vad_filter=True,
            )

            segments: list[dict] = []
            for seg in segments_iter:
                words: list[dict] = []
                if seg.words:
                    for w in seg.words:
                        words.append({
                            "word": w.word,
                            "start": round(w.start, 3),
                            "end": round(w.end, 3),
                            "probability": round(w.probability, 4),
                        })

                segments.append({
                    "id": seg.id,
                    "start": round(seg.start, 3),
                    "end": round(seg.end, 3),
                    "text": seg.text.strip(),
                    "words": words,
                })

            return {
                "segments": segments,
                "language": info.language,
                "language_probability": round(info.language_probability, 4),
                "duration": round(info.duration, 3),
                "is_fallback": False,
            }
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    except Exception as exc:
        logger.error("Whisper transcription failed: %s", exc, exc_info=True)
        return _fallback_transcription()


async def transcribe_file(
    file_path: str | Path,
    language: Optional[str] = None,
    word_timestamps: bool = True,
) -> dict:
    """Transcribe an audio/video file directly by path."""
    whisper = model_manager.get_whisper()

    if whisper is None:
        logger.info("Whisper model unavailable – returning empty transcription.")
        return _fallback_transcription()

    try:
        segments_iter, info = whisper.transcribe(
            str(file_path),
            language=language,
            word_timestamps=word_timestamps,
            beam_size=5,
            vad_filter=True,
        )

        segments: list[dict] = []
        for seg in segments_iter:
            words: list[dict] = []
            if seg.words:
                for w in seg.words:
                    words.append({
                        "word": w.word,
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                        "probability": round(w.probability, 4),
                    })

            segments.append({
                "id": seg.id,
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text.strip(),
                "words": words,
            })

        return {
            "segments": segments,
            "language": info.language,
            "language_probability": round(info.language_probability, 4),
            "duration": round(info.duration, 3),
            "is_fallback": False,
        }
    except Exception as exc:
        logger.error("Whisper file transcription failed: %s", exc, exc_info=True)
        return _fallback_transcription()


def _fallback_transcription() -> dict:
    """Return an empty transcription result for fallback mode."""
    return {
        "segments": [],
        "language": "en",
        "language_probability": 0.0,
        "duration": 0.0,
        "is_fallback": True,
    }
