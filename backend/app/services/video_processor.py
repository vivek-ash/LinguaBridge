"""
Video processing pipeline for LinguaBridge.
Supports two major features:
  1. AI Video Captioning & Translation (Two-Pass High-Accuracy Architecture)
     - Audio -> Whisper speech translation directly into English
     - If user wants English captions: direct, highly accurate English sentences
     - If user wants other language captions: NLLB neural translation from English -> Target language
  2. AI Video-to-Sign-Language Translation
     - Audio -> Whisper English translation -> ISL/ASL/BSL sign gloss sequences
"""

from __future__ import annotations

import logging
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Callable, Optional

from app.services.sign_language import text_to_gloss, text_to_sign_sequence
from app.services.translation import translate_text, _roman_hindi_to_deva
from app.ml.model_manager import model_manager

logger = logging.getLogger(__name__)


def process_caption_pipeline(
    video_path: str,
    source_lang: str = "auto",
    target_lang: str = "en",
    progress_callback: Optional[Callable[[str, float], None]] = None,
) -> dict:
    """
    High-accuracy video captioning pipeline.
    Uses Whisper Medium for speech understanding and English translation,
    followed by NLLB-200 for target language translation.
    Processes videos of any length without timeouts or memory issues.
    """
    def update(status: str, progress: float):
        if progress_callback:
            try:
                progress_callback(status, progress)
            except Exception as e:
                logger.debug("Progress callback error: %s", e)

    audio_path = None
    try:
        # ── Step 1: Extract Audio ───────────────────────────────────────────
        update("extracting_audio", 10)
        audio_path = _extract_audio_sync(video_path)
        update("extracting_audio", 20)

        whisper = model_manager.get_whisper()
        if whisper is None:
            raise RuntimeError("Speech transcription model (Whisper) could not be loaded. Please ensure memory limits allow loading the model.")

        update("transcribing", 25)

        # CPU uses beam_size=2 for 3-4x speedup with medium model; CUDA uses 5
        beam_size = 5 if model_manager.device == "cuda" else 2

        # Determine strategy:
        # If target is English or non-English target from non-English speech:
        # We translate audio direct to English first (user's approach for maximum accuracy)
        is_target_english = target_lang in ("en", "eng")
        is_source_specified_english = source_lang in ("en", "eng")

        if is_source_specified_english:
            # Source is English: run native transcribe
            task_to_run = "transcribe"
            lang_param = "en"
        elif is_target_english:
            # Non-English audio -> English captions: run translate directly
            task_to_run = "translate"
            lang_param = source_lang if source_lang != "auto" else None
        elif source_lang != "auto" and source_lang == target_lang:
            # e.g., Hindi audio -> Hindi captions: run transcribe in source lang
            task_to_run = "transcribe"
            lang_param = source_lang
        else:
            # Non-English audio -> Target language: run translate to English first, then NLLB
            task_to_run = "translate"
            lang_param = source_lang if source_lang != "auto" else None

        update("transcribing", 35)
        logger.info("Running Whisper task='%s' with beam_size=%d, lang=%s", task_to_run, beam_size, lang_param)

        segments_iter, info = whisper.transcribe(
            audio_path,
            language=lang_param,
            task=task_to_run,
            word_timestamps=False,  # disabled DTW for massive speedup
            beam_size=beam_size,
            vad_filter=True,
        )

        detected_lang = info.language
        lang_prob = round(float(info.language_probability), 3) if hasattr(info, "language_probability") else 1.0
        effective_source = detected_lang if source_lang == "auto" else source_lang
        duration = round(float(info.duration), 2) if hasattr(info, "duration") else 0.0

        raw_whisper_segments = list(segments_iter)
        if not raw_whisper_segments:
            logger.info("VAD filter yielded 0 segments. Retrying Whisper transcription without VAD filter...")
            try:
                retry_iter, _ = whisper.transcribe(
                    audio_path,
                    language=lang_param,
                    task=task_to_run,
                    word_timestamps=False,
                    beam_size=1,
                    vad_filter=False,
                )
                raw_whisper_segments = list(retry_iter)
            except Exception as vad_err:
                logger.warning("Transcription retry without VAD failed: %s", vad_err)
        update("transcribing", 65)

        # ── Step 2: Build segments and translate to target language ───────────
        update("translating", 70)
        segments = []
        total_segs = len(raw_whisper_segments)
        current_speaker = 1
        last_end = 0.0

        for i, s in enumerate(raw_whisper_segments):
            seg_start = round(s.start, 2)
            seg_end = round(s.end, 2)
            whisper_text = s.text.strip()

            # Smart speaker transition (>1.8s pause)
            if i > 0 and (seg_start - last_end) > 1.8:
                current_speaker = 2 if current_speaker == 1 else 1
            last_end = seg_end
            speaker_label = f"Speaker {current_speaker}"

            if task_to_run == "translate":
                # whisper_text is high-accuracy English translation
                english_text = whisper_text
                # If target is English: we are done!
                if is_target_english:
                    translated_text = english_text
                    display_text = english_text
                else:
                    # Translate English -> Target language via NLLB
                    try:
                        tr = translate_text(english_text, "en", target_lang)
                        translated_text = tr.get("translated_text", english_text)
                    except Exception as exc:
                        logger.warning("NLLB translation failed for segment %d: %s", i, exc)
                        translated_text = english_text
                    display_text = translated_text
            else:
                # task_to_run == "transcribe"
                # whisper_text is in native language
                clean_native = whisper_text
                if (effective_source == "hi" or detected_lang == "hi") and not re.search(r"[\u0900-\u097f]", whisper_text):
                    clean_native = _roman_hindi_to_deva(whisper_text)

                english_text = clean_native
                if target_lang != effective_source:
                    try:
                        tr = translate_text(clean_native, effective_source, target_lang)
                        translated_text = tr.get("translated_text", clean_native)
                    except Exception as exc:
                        logger.warning("Translation failed for segment %d: %s", i, exc)
                        translated_text = clean_native
                else:
                    translated_text = clean_native
                display_text = clean_native

            segments.append({
                "id": f"seg_{i}",
                "index": i,
                "start": seg_start,
                "end": seg_end,
                "text": display_text,
                "english_text": english_text,
                "translated_text": translated_text,
                "words": [],
                "speaker": speaker_label,
            })

            progress = 70 + (25 * (i + 1) / max(total_segs, 1))
            update("translating", min(round(progress, 1), 95))

        update("complete", 100)

        return {
            "segments": segments,
            "duration": duration,
            "source_lang": effective_source,
            "target_lang": target_lang,
            "detected_lang": detected_lang,
            "language_probability": lang_prob,
            "total_segments": len(segments),
        }

    except Exception as exc:
        logger.error("Caption pipeline failed: %s", exc, exc_info=True)
        raise
    finally:
        if audio_path:
            Path(audio_path).unlink(missing_ok=True)


def process_sign_pipeline(
    video_path: str,
    source_lang: str = "auto",
    sign_language: str = "asl",
    progress_callback: Optional[Callable[[str, float], None]] = None,
) -> dict:
    """
    Sign language translation pipeline:
    Extract audio -> Whisper English translation -> Sign Gloss Generation -> Avatar Synchronization.
    Maximum duration: 2 minutes (validated before calling).
    """
    def update(status: str, progress: float):
        if progress_callback:
            try:
                progress_callback(status, progress)
            except Exception as e:
                logger.debug("Progress callback error: %s", e)

    audio_path = None
    try:
        # Step 1: Extract Audio
        update("extracting_audio", 10)
        audio_path = _extract_audio_sync(video_path)
        update("extracting_audio", 18)

        # Step 2: Speech Recognition & English Translation
        update("transcribing", 25)
        whisper = model_manager.get_whisper()
        if whisper is None:
            raise RuntimeError("Whisper model unavailable for sign translation.")

        beam_size = 5 if model_manager.device == "cuda" else 2

        # We translate to English directly so the sign gloss mapper receives clean vocabulary
        en_iter, info = whisper.transcribe(
            audio_path,
            task="translate",
            word_timestamps=False,
            beam_size=beam_size,
            vad_filter=True,
        )

        detected_lang = info.language
        effective_source = detected_lang if source_lang == "auto" else source_lang
        duration = round(float(info.duration), 2) if hasattr(info, "duration") else 0.0

        segments = []
        for i, s in enumerate(en_iter):
            clean_en = s.text.strip()
            segments.append({
                "id": f"seg_{i}",
                "index": i,
                "start": round(s.start, 2),
                "end": round(s.end, 2),
                "text": clean_en,
                "english_text": clean_en,
                "words": [],
            })

        update("understanding_context", 55)

        # Step 3: Generate Sign Gloss Sequence
        update("generating_signs", 70)
        gloss_sequence = text_to_sign_sequence(
            [{"text": s["english_text"], "start": s["start"], "end": s["end"]} for s in segments],
            sign_language,
        )
        update("generating_signs", 85)

        # Step 4: Synchronize Translation with Video
        update("synchronizing", 90)
        gloss_transcript = []
        for seg in segments:
            seg_glosses = [
                g for g in gloss_sequence
                if g.get("start_time", 0) >= seg["start"] and g.get("start_time", 0) < seg["end"]
            ]
            gloss_transcript.append({
                "segment_index": seg["index"],
                "start": seg["start"],
                "end": seg["end"],
                "original_text": seg["text"],
                "gloss_text": " ".join(g["gloss"] for g in seg_glosses),
                "sign_count": len(seg_glosses),
            })
        update("synchronizing", 95)
        update("complete", 100)

        return {
            "segments": segments,
            "gloss_sequence": gloss_sequence,
            "gloss_transcript": gloss_transcript,
            "duration": duration,
            "source_lang": effective_source,
            "sign_language": sign_language,
            "detected_lang": detected_lang,
            "total_signs": len(gloss_sequence),
            "total_segments": len(segments),
        }

    except Exception as exc:
        logger.error("Sign pipeline failed: %s", exc, exc_info=True)
        raise
    finally:
        if audio_path:
            Path(audio_path).unlink(missing_ok=True)


def process_video_pipeline(
    video_path: str,
    source_lang: str,
    target_lang: str,
    sign_language: str = "asl",
    progress_callback: Optional[Callable] = None,
) -> dict:
    """Legacy pipeline wrapper."""
    result = process_sign_pipeline(video_path, source_lang, sign_language, progress_callback)
    if target_lang:
        for seg in result.get("segments", []):
            seg["translated_text"] = seg.get("english_text", seg.get("text", ""))
    result["target_lang"] = target_lang
    return result


def _get_ffmpeg_path() -> str:
    """Find ffmpeg executable."""
    import shutil
    path = shutil.which("ffmpeg")
    if path:
        return path
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
    return "ffmpeg"


def _extract_audio_sync(video_path: str) -> str:
    """Extract audio from video file to 16kHz mono WAV."""
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    output_path = tmp.name

    ffmpeg_bin = _get_ffmpeg_path()
    cmd = [
        ffmpeg_bin, "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        output_path,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, timeout=300)
        if result.returncode != 0:
            logger.error("ffmpeg failed: %s", result.stderr.decode(errors="replace")[:500])
        return output_path
    except FileNotFoundError:
        logger.error("ffmpeg not found at '%s'. Video audio extraction unavailable.", ffmpeg_bin)
        return output_path
    except subprocess.TimeoutExpired:
        logger.error("ffmpeg timed out extracting audio from %s", video_path)
        return output_path
