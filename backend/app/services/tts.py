"""
TTS (Text-to-Speech) service.
Currently returns a directive for the frontend to use browser-native
SpeechSynthesis API. Can be extended with piper-tts or other backends.
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Try to detect if piper-tts is available
_PIPER_AVAILABLE = False
try:
    import piper  # type: ignore[import-untyped]
    _PIPER_AVAILABLE = True
except ImportError:
    pass


async def synthesize(
    text: str,
    language: str = "en",
    voice: Optional[str] = None,
    speed: float = 1.0,
) -> dict:
    """
    Produce TTS audio or a directive for the frontend.

    Returns::

        {
            "method": "browser" | "audio",
            "text": str,
            "language": str,
            "voice": str | None,
            "speed": float,
            "audio_base64": str | None,   # only if method == "audio"
            "content_type": str | None,    # only if method == "audio"
        }
    """
    if _PIPER_AVAILABLE:
        return await _synthesize_piper(text, language, voice, speed)

    # Default: instruct frontend to use browser SpeechSynthesis
    return {
        "method": "browser",
        "text": text,
        "language": language,
        "voice": voice,
        "speed": speed,
        "audio_base64": None,
        "content_type": None,
    }


async def _synthesize_piper(
    text: str,
    language: str,
    voice: Optional[str],
    speed: float,
) -> dict:
    """Use piper-tts to generate WAV audio (if available)."""
    try:
        import base64
        import io
        import wave

        import piper  # type: ignore[import-untyped]

        model_path = voice or f"en_US-lessac-medium"
        tts = piper.PiperVoice.load(model_path)
        audio_buffer = io.BytesIO()

        with wave.open(audio_buffer, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(22050)
            for audio_bytes in tts.synthesize_stream_raw(text):
                wav.writeframes(audio_bytes)

        audio_buffer.seek(0)
        b64 = base64.b64encode(audio_buffer.read()).decode("ascii")

        return {
            "method": "audio",
            "text": text,
            "language": language,
            "voice": voice,
            "speed": speed,
            "audio_base64": b64,
            "content_type": "audio/wav",
        }
    except Exception as exc:
        logger.warning("Piper TTS failed, falling back to browser: %s", exc)
        return {
            "method": "browser",
            "text": text,
            "language": language,
            "voice": voice,
            "speed": speed,
            "audio_base64": None,
            "content_type": None,
        }
