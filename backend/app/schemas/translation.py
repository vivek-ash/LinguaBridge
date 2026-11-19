"""
Pydantic schemas for translation request/response payloads.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Request schemas ──────────────────────────────────────────────────────────

class TranslateRequest(BaseModel):
    """Payload for POST /api/translate."""
    text: str = Field(..., min_length=1, max_length=10000, description="Text to translate")
    source_lang: str = Field("auto", description="Source language code or 'auto' for detection")
    target_lang: str = Field(..., description="Target language code")
    tone: Optional[str] = Field(None, description="Optional tone modifier (formal, informal, etc.)")


class BatchTranslateRequest(BaseModel):
    """Payload for batch translation."""
    texts: list[str] = Field(..., min_length=1, max_length=50, description="List of texts to translate")
    source_lang: str = Field("auto", description="Source language code or 'auto'")
    target_lang: str = Field(..., description="Target language code")


class DetectRequest(BaseModel):
    """Payload for POST /api/detect."""
    text: str = Field(..., min_length=1, max_length=10000, description="Text to detect language of")


# ── Response schemas ─────────────────────────────────────────────────────────

class DetectedLanguage(BaseModel):
    """Single language detection result."""
    language_code: str
    language_name: str
    confidence: float


class DetectResponse(BaseModel):
    """Response from /api/detect."""
    detected: DetectedLanguage
    alternatives: list[DetectedLanguage] = Field(default_factory=list)


class TranslateResponse(BaseModel):
    """Response from /api/translate."""
    translated_text: str
    source_lang: str
    target_lang: str
    detected_lang: Optional[str] = None
    confidence: Optional[float] = None
    alternatives: list[str] = Field(default_factory=list)
    is_fallback: bool = Field(False, description="True if using demo/fallback translation")


class BatchTranslateResponse(BaseModel):
    """Response from batch translation."""
    translations: list[TranslateResponse]


# ── History schemas ──────────────────────────────────────────────────────────

class HistoryCreate(BaseModel):
    """Payload to save a translation to history."""
    source_text: str
    target_text: str
    source_lang: str
    target_lang: str
    detected_lang: Optional[str] = None
    confidence: Optional[float] = None


class HistoryItem(BaseModel):
    """Single history entry returned from the API."""
    id: int
    source_text: str
    target_text: str
    source_lang: str
    target_lang: str
    detected_lang: Optional[str] = None
    confidence: Optional[float] = None
    is_favorite: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class HistoryListResponse(BaseModel):
    """Paginated list of history items."""
    items: list[HistoryItem]
    total: int
    page: int
    page_size: int


# ── Glossary schemas ─────────────────────────────────────────────────────────

class GlossaryCreate(BaseModel):
    """Payload to create a glossary entry."""
    source_term: str = Field(..., min_length=1, max_length=500)
    target_term: str = Field(..., min_length=1, max_length=500)
    source_lang: str
    target_lang: str


class GlossaryUpdate(BaseModel):
    """Payload to update a glossary entry."""
    source_term: Optional[str] = Field(None, min_length=1, max_length=500)
    target_term: Optional[str] = Field(None, min_length=1, max_length=500)
    source_lang: Optional[str] = None
    target_lang: Optional[str] = None


class GlossaryItem(BaseModel):
    """Single glossary entry."""
    id: int
    source_term: str
    target_term: str
    source_lang: str
    target_lang: str
    created_at: datetime

    model_config = {"from_attributes": True}


class GlossaryListResponse(BaseModel):
    """Paginated list of glossary entries."""
    items: list[GlossaryItem]
    total: int
    page: int
    page_size: int
