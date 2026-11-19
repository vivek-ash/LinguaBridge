"""
Video processing router – upload, process, status, export, and edit.
Supports two modes: Captioning and Sign Language Translation.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import settings
from app.services.video_processor import process_caption_pipeline, process_sign_pipeline, process_video_pipeline
from app.services.subtitle import generate_srt, generate_vtt
from app.services.sign_language import get_supported_languages
from app.utils.video_utils import validate_video_duration, get_video_info

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory job store (for demo; use Redis in production)
_jobs: dict[str, dict] = {}

MAX_SIGN_DURATION = 120  # 2 minutes max for sign language


class EditCaptionRequest(BaseModel):
    segment_index: int
    text: str


class RegenerateRequest(BaseModel):
    segment_index: int


# ── Upload Endpoints ─────────────────────────────────────────────────────────

@router.post("/video/caption")
async def upload_video_caption(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source_lang: str = Form("auto"),
    target_lang: str = Form("hi"),
):
    """Upload a video for AI captioning and translation."""
    job_id, video_path = await _save_upload(file)

    _jobs[job_id] = {
        "job_id": job_id,
        "mode": "captioning",
        "status": "processing",
        "progress": 0,
        "stage": "uploading",
        "video_path": str(video_path),
        "source_lang": source_lang,
        "target_lang": target_lang,
        "result": None,
        "error": None,
    }

    background_tasks.add_task(
        _process_caption_task, job_id, str(video_path), source_lang, target_lang
    )

    return {"job_id": job_id, "status": "processing", "mode": "captioning"}


@router.post("/video/sign-translate")
async def upload_video_sign(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source_lang: str = Form("auto"),
    sign_language: str = Form("asl"),
):
    """Upload a video for sign language translation (max 2 minutes)."""
    job_id, video_path = await _save_upload(file)

    # Validate duration
    is_valid, duration = validate_video_duration(str(video_path), MAX_SIGN_DURATION)
    if not is_valid:
        # Cleanup uploaded file
        video_path.unlink(missing_ok=True)
        raise HTTPException(
            400,
            detail={
                "message": f"Video too long ({duration:.1f}s). Maximum duration for sign language translation is {MAX_SIGN_DURATION} seconds (2 minutes).",
                "duration": duration,
                "max_duration": MAX_SIGN_DURATION,
            }
        )

    _jobs[job_id] = {
        "job_id": job_id,
        "mode": "sign-language",
        "status": "processing",
        "progress": 0,
        "stage": "uploading",
        "video_path": str(video_path),
        "source_lang": source_lang,
        "sign_language": sign_language,
        "result": None,
        "error": None,
    }

    background_tasks.add_task(
        _process_sign_task, job_id, str(video_path), source_lang, sign_language
    )

    return {"job_id": job_id, "status": "processing", "mode": "sign-language"}


# Legacy endpoint for backward compatibility
@router.post("/video/upload")
async def upload_video_legacy(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source_lang: str = Form("auto"),
    target_lang: str = Form("hi"),
    sign_language: str = Form("asl"),
):
    """Legacy upload endpoint - routes to sign language pipeline."""
    job_id, video_path = await _save_upload(file)

    _jobs[job_id] = {
        "job_id": job_id,
        "mode": "sign-language",
        "status": "processing",
        "progress": 0,
        "stage": "uploading",
        "video_path": str(video_path),
        "source_lang": source_lang,
        "target_lang": target_lang,
        "sign_language": sign_language,
        "result": None,
        "error": None,
    }

    background_tasks.add_task(
        _process_legacy_task, job_id, str(video_path), source_lang, target_lang, sign_language
    )

    return {"job_id": job_id, "status": "processing"}


# ── Status & Results ─────────────────────────────────────────────────────────

@router.get("/video/status/{job_id}")
async def video_status(job_id: str):
    """Check video processing status with detailed stage info."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "job_id": job["job_id"],
        "mode": job.get("mode", "unknown"),
        "status": job["status"],
        "progress": job["progress"],
        "stage": job.get("stage", job["status"]),
        "error": job.get("error"),
    }


@router.get("/video/result/{job_id}")
async def video_result(job_id: str):
    """Get video processing results."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job["status"] != "complete":
        raise HTTPException(400, f"Job not complete. Status: {job['status']}")
    return job["result"]


# ── Export ───────────────────────────────────────────────────────────────────

@router.get("/video/export/{job_id}/{fmt}")
async def export_video(job_id: str, fmt: str):
    """Export subtitles or transcript."""
    job = _jobs.get(job_id)
    if not job or job["status"] != "complete":
        raise HTTPException(404, "Job not found or not complete")

    result = job["result"]
    segments = result.get("segments", [])

    export_dir = Path(settings.EXPORT_DIR)
    export_dir.mkdir(parents=True, exist_ok=True)

    if fmt == "srt":
        content = generate_srt(segments)
        path = export_dir / f"{job_id}.srt"
        path.write_text(content, encoding="utf-8")
        return FileResponse(path, filename=f"subtitles_{job_id}.srt", media_type="text/plain")

    elif fmt == "vtt":
        content = generate_vtt(segments)
        path = export_dir / f"{job_id}.vtt"
        path.write_text(content, encoding="utf-8")
        return FileResponse(path, filename=f"subtitles_{job_id}.vtt", media_type="text/vtt")

    elif fmt == "transcript":
        lines = []
        for s in segments:
            start = s.get("start", 0)
            text = s.get("text", "")
            lines.append(f"[{start:.1f}s] {text}")
        content = "\n".join(lines)
        path = export_dir / f"{job_id}_transcript.txt"
        path.write_text(content, encoding="utf-8")
        return FileResponse(path, filename=f"transcript_{job_id}.txt", media_type="text/plain")

    elif fmt == "translated_transcript":
        lines = []
        for s in segments:
            start = s.get("start", 0)
            text = s.get("text", "")
            translated = s.get("translated_text", s.get("english_text", ""))
            lines.append(f"[{start:.1f}s] {text}")
            if translated and translated != text:
                lines.append(f"        → {translated}")
        content = "\n".join(lines)
        path = export_dir / f"{job_id}_translated.txt"
        path.write_text(content, encoding="utf-8")
        return FileResponse(path, filename=f"translated_{job_id}.txt", media_type="text/plain")

    elif fmt == "gloss":
        gloss_seq = result.get("gloss_sequence", [])
        lines = []
        for g in gloss_seq:
            t = g.get("start_time", 0)
            lines.append(f"[{t:.2f}s] {g.get('gloss', '')} ({g.get('type', '')})")
        content = "\n".join(lines)
        path = export_dir / f"{job_id}_gloss.txt"
        path.write_text(content, encoding="utf-8")
        return FileResponse(path, filename=f"gloss_{job_id}.txt", media_type="text/plain")

    else:
        raise HTTPException(400, f"Unsupported format: {fmt}. Use srt, vtt, transcript, translated_transcript, or gloss.")


# ── Edit & Regenerate ────────────────────────────────────────────────────────

@router.put("/video/caption/{job_id}/edit")
async def edit_caption(job_id: str, req: EditCaptionRequest):
    """Edit a caption segment's text."""
    job = _jobs.get(job_id)
    if not job or job["status"] != "complete":
        raise HTTPException(404, "Job not found or not complete")

    segments = job["result"].get("segments", [])
    if req.segment_index < 0 or req.segment_index >= len(segments):
        raise HTTPException(400, f"Invalid segment index: {req.segment_index}")

    segments[req.segment_index]["translated_text"] = req.text
    return {"success": True, "segment_index": req.segment_index}


@router.post("/video/caption/{job_id}/regenerate")
async def regenerate_caption(job_id: str, req: RegenerateRequest):
    """Regenerate translation for a specific segment."""
    job = _jobs.get(job_id)
    if not job or job["status"] != "complete":
        raise HTTPException(404, "Job not found or not complete")

    segments = job["result"].get("segments", [])
    if req.segment_index < 0 or req.segment_index >= len(segments):
        raise HTTPException(400, f"Invalid segment index: {req.segment_index}")

    seg = segments[req.segment_index]
    source_lang = job["result"].get("source_lang", "en")
    target_lang = job["result"].get("target_lang", job.get("target_lang", "hi"))

    try:
        from app.services.translation import translate_text
        tr = translate_text(seg["text"], source_lang, target_lang)
        seg["translated_text"] = tr.get("translated_text", seg["text"])
        return {"success": True, "segment_index": req.segment_index, "translated_text": seg["translated_text"]}
    except Exception as exc:
        raise HTTPException(500, f"Regeneration failed: {exc}")


# ── Sign Language Info ───────────────────────────────────────────────────────

@router.get("/video/sign-languages")
async def list_sign_languages():
    """List supported sign languages."""
    return get_supported_languages()


# ── Internal Helpers ─────────────────────────────────────────────────────────

async def _save_upload(file: UploadFile) -> tuple[str, Path]:
    """Validate and save an uploaded file. Returns (job_id, file_path)."""
    allowed = {".mp4", ".webm", ".mov", ".mkv", ".avi"}
    ext = Path(file.filename or "video.mp4").suffix.lower()
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported format: {ext}. Allowed: {', '.join(allowed)}")

    job_id = str(uuid.uuid4())
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    video_path = upload_dir / f"{job_id}{ext}"

    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(413, f"File too large. Max: {settings.MAX_UPLOAD_SIZE_MB}MB")

    with open(video_path, "wb") as f:
        f.write(content)

    return job_id, video_path


async def _process_caption_task(
    job_id: str, video_path: str, source_lang: str, target_lang: str
):
    """Background task for caption processing."""
    try:
        def progress_callback(status: str, progress: float):
            _jobs[job_id]["status"] = status if status != "complete" else "complete"
            _jobs[job_id]["progress"] = progress
            _jobs[job_id]["stage"] = status

        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: process_caption_pipeline(
                video_path, source_lang, target_lang, progress_callback
            ),
        )

        _jobs[job_id]["status"] = "complete"
        _jobs[job_id]["progress"] = 100
        _jobs[job_id]["stage"] = "complete"
        _jobs[job_id]["result"] = result

    except Exception as e:
        logger.error("Caption processing failed for job %s: %s", job_id, e)
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"] = str(e)
        _jobs[job_id]["stage"] = "error"


async def _process_sign_task(
    job_id: str, video_path: str, source_lang: str, sign_language: str
):
    """Background task for sign language processing."""
    try:
        def progress_callback(status: str, progress: float):
            _jobs[job_id]["status"] = status if status != "complete" else "complete"
            _jobs[job_id]["progress"] = progress
            _jobs[job_id]["stage"] = status

        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: process_sign_pipeline(
                video_path, source_lang, sign_language, progress_callback
            ),
        )

        _jobs[job_id]["status"] = "complete"
        _jobs[job_id]["progress"] = 100
        _jobs[job_id]["stage"] = "complete"
        _jobs[job_id]["result"] = result

    except Exception as e:
        logger.error("Sign processing failed for job %s: %s", job_id, e)
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"] = str(e)
        _jobs[job_id]["stage"] = "error"


async def _process_legacy_task(
    job_id: str, video_path: str, source_lang: str, target_lang: str, sign_language: str
):
    """Background task for legacy video processing pipeline."""
    try:
        def progress_callback(status: str, progress: float):
            _jobs[job_id]["status"] = status if status != "complete" else "complete"
            _jobs[job_id]["progress"] = progress
            _jobs[job_id]["stage"] = status

        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: process_video_pipeline(
                video_path, source_lang, target_lang, sign_language, progress_callback
            ),
        )

        _jobs[job_id]["status"] = "complete"
        _jobs[job_id]["progress"] = 100
        _jobs[job_id]["stage"] = "complete"
        _jobs[job_id]["result"] = result

    except Exception as e:
        logger.error("Video processing failed for job %s: %s", job_id, e)
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"] = str(e)
        _jobs[job_id]["stage"] = "error"
