"""
Voice WebSocket router – real-time speech-to-text + translation pipeline.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
import tempfile
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.whisper_stt import transcribe_file
from app.services.translation import translate_text
from app.services.detection import detect_language

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/voice")
async def voice_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time voice translation.

    Client sends JSON messages:
        { "type": "audio", "data": "<base64 audio>", "target_lang": "hi" }
        { "type": "config", "target_lang": "hi", "mode": "push-to-talk" }
        { "type": "stop" }

    Server responds with:
        { "type": "partial", "text": "...", "language": "en" }
        { "type": "final", "text": "...", "translated_text": "...", "language": "en", "latency_ms": 123 }
        { "type": "error", "error": "..." }
        { "type": "status", "message": "..." }
    """
    await websocket.accept()
    logger.info("Voice WebSocket connected")

    audio_buffer = bytearray()
    target_lang = "hi"
    source_lang = "auto"

    try:
        await websocket.send_json({"type": "status", "message": "Connected. Ready for audio."})

        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type", "")

            if msg_type == "config":
                target_lang = msg.get("target_lang", "hi")
                source_lang = msg.get("source_lang", "auto")
                await websocket.send_json({
                    "type": "status",
                    "message": f"Config updated: source={source_lang}, target={target_lang}",
                })

            elif msg_type == "text":
                # Real-time text translation pipeline over WebSocket
                start = time.time()
                input_text = msg.get("text", "").strip()
                t_lang = msg.get("target_lang", target_lang)
                s_lang = msg.get("source_lang", source_lang)

                if input_text:
                    # Detect language if auto
                    if s_lang == "auto":
                        detected, conf = detect_language(input_text)
                    else:
                        detected, conf = s_lang, 1.0

                    translation = translate_text(input_text, detected, t_lang)
                    latency = round((time.time() - start) * 1000, 1)

                    await websocket.send_json({
                        "type": "final",
                        "text": input_text,
                        "translated_text": translation["translated_text"],
                        "language": detected,
                        "confidence": conf,
                        "latency_ms": latency,
                    })

            elif msg_type == "audio":
                start = time.time()
                audio_data = base64.b64decode(msg.get("data", ""))
                audio_buffer.extend(audio_data)

                # Process when we have enough audio (>0.5s at 16kHz, 16-bit = 16000 bytes)
                if len(audio_buffer) >= 16000:
                    try:
                        # Write to temp file for whisper
                        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                            # Write WAV header for 16kHz mono 16-bit PCM
                            import struct
                            data_size = len(audio_buffer)
                            f.write(b"RIFF")
                            f.write(struct.pack("<I", 36 + data_size))
                            f.write(b"WAVE")
                            f.write(b"fmt ")
                            f.write(struct.pack("<I", 16))  # chunk size
                            f.write(struct.pack("<H", 1))   # PCM
                            f.write(struct.pack("<H", 1))   # mono
                            f.write(struct.pack("<I", 16000))  # sample rate
                            f.write(struct.pack("<I", 32000))  # byte rate
                            f.write(struct.pack("<H", 2))   # block align
                            f.write(struct.pack("<H", 16))  # bits per sample
                            f.write(b"data")
                            f.write(struct.pack("<I", data_size))
                            f.write(bytes(audio_buffer))
                            temp_path = f.name

                        # Transcribe
                        result = await transcribe_file(temp_path, language=source_lang if source_lang != "auto" else None)

                        # Clean up temp file
                        Path(temp_path).unlink(missing_ok=True)

                        full_text = " ".join(s.get("text", "") for s in result.get("segments", []))
                        detected = result.get("language", "en")

                        if full_text.strip():
                            # Send partial result
                            await websocket.send_json({
                                "type": "partial",
                                "text": full_text.strip(),
                                "language": detected,
                            })

                            # Translate
                            translation = translate_text(full_text.strip(), detected, target_lang)

                            latency = round((time.time() - start) * 1000, 1)
                            await websocket.send_json({
                                "type": "final",
                                "text": full_text.strip(),
                                "translated_text": translation["translated_text"],
                                "language": detected,
                                "confidence": result.get("confidence", 0),
                                "latency_ms": latency,
                            })

                    except Exception as e:
                        logger.error("Voice processing error: %s", e)
                        await websocket.send_json({
                            "type": "error",
                            "error": str(e),
                        })

                    # Clear buffer after processing
                    audio_buffer.clear()

            elif msg_type == "stop":
                # Process any remaining audio
                if len(audio_buffer) > 0:
                    audio_buffer.clear()
                await websocket.send_json({"type": "status", "message": "Stopped."})

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        logger.info("Voice WebSocket disconnected")
    except Exception as e:
        logger.error("Voice WebSocket error: %s", e)
        try:
            await websocket.send_json({"type": "error", "error": str(e)})
        except Exception:
            pass
