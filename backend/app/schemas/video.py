"""
Pydantic schemas for video processing endpoints.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class VideoJobStatus(str, Enum):
    """Status of a video processing job."""
    PENDING = "pending"
    PROCESSING = "processing"
    TRANSCRIBING = "transcribing"
    TRANSLATING = "translating"
    GENERATING_SIGNS = "generating_signs"
    COMPLETED = "completed"
    FAILED = "failed"


class SubtitleSegment(BaseModel):
    """A single subtitle segment with timing."""
    index: int
    start_time: float = Field(..., description="Start time in seconds")
    end_time: float = Field(..., description="End time in seconds")
    original_text: str
    translated_text: str


class GlossToken(BaseModel):
    """A single sign language gloss token."""
    gloss: str
    type: str = Field(..., description="'sign' or 'fingerspell'")
    duration_ms: int
    animation_data: dict = Field(default_factory=dict)


class VideoUploadResponse(BaseModel):
    """Response from POST /api/video/upload."""
    job_id: str
    status: VideoJobStatus = VideoJobStatus.PENDING
    message: str = "Video upload received, processing started."


class VideoStatusResponse(BaseModel):
    """Response from GET /api/video/status/{job_id}."""
    job_id: str
    status: VideoJobStatus
    progress: float = Field(0.0, ge=0.0, le=100.0)
    message: str = ""


class VideoResultResponse(BaseModel):
    """Full result from GET /api/video/result/{job_id}."""
    job_id: str
    status: VideoJobStatus
    source_lang: str
    target_lang: str
    duration_seconds: float = 0.0
    segments: list[SubtitleSegment] = Field(default_factory=list)
    gloss_sequence: list[GlossToken] = Field(default_factory=list)
    transcript_original: str = ""
    transcript_translated: str = ""


class DocumentTranslateRequest(BaseModel):
    """Request metadata for document translation (file via form-data)."""
    source_lang: str = Field("auto", description="Source language or 'auto'")
    target_lang: str = Field(..., description="Target language code")


class DocumentParagraph(BaseModel):
    """A translated paragraph from a document."""
    index: int
    original: str
    translated: str


class DocumentTranslateResponse(BaseModel):
    """Response from POST /api/documents/translate."""
    filename: str
    source_lang: str
    target_lang: str
    paragraphs: list[DocumentParagraph] = Field(default_factory=list)
    total_chars: int = 0
    is_fallback: bool = False
