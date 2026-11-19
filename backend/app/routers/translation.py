"""
Translation API router – text translation, language detection, and language listing.
"""

from __future__ import annotations

import asyncio
import time
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.translation import translate_text
from app.services.detection import detect_language
from app.ml.languages import get_all_languages, search_languages, get_language, LANGUAGES

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    source_lang: str = Field("auto", description="ISO code or 'auto'")
    target_lang: str = Field(..., description="ISO code of target language")
    tone: Optional[str] = Field(None, description="formal, casual, or neutral")


class TranslateResponse(BaseModel):
    translated_text: str
    detected_lang: Optional[str] = None
    confidence: Optional[float] = None
    source_lang: str
    target_lang: str
    alternatives: list[str] = []
    latency_ms: float
    detected_tone: Optional[str] = "neutral"


class DetectRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


class DetectResponse(BaseModel):
    language: str
    confidence: float
    top_predictions: list[dict]


class LanguageInfo(BaseModel):
    code: str
    name: str
    native_name: str
    flag: str
    rtl: bool
    nllb_code: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/translate", response_model=TranslateResponse)
async def api_translate(req: TranslateRequest):
    """Translate text from source to target language."""
    start = time.time()

    # Auto-detect source language if needed
    detected_lang = None
    confidence = None
    source = req.source_lang

    if source == "auto":
        det = await asyncio.to_thread(detect_language, req.text)
        detected_lang = det["language"]
        confidence = det["confidence"]
        source = detected_lang

    if source == req.target_lang:
        return TranslateResponse(
            translated_text=req.text,
            detected_lang=detected_lang,
            confidence=confidence,
            source_lang=source,
            target_lang=req.target_lang,
            alternatives=[],
            latency_ms=round((time.time() - start) * 1000, 1),
        )

    # Validate & normalize languages safely without throwing 400 crashes
    if source not in LANGUAGES:
        logger.warning("Unsupported or unknown source language '%s' – falling back to 'en'", source)
        source = "en"

    target = req.target_lang
    if target not in LANGUAGES:
        logger.warning("Unsupported target language '%s' – falling back to 'hi'", target)
        target = "hi" if source != "hi" else "en"

    if source == target:
        return TranslateResponse(
            translated_text=req.text,
            detected_lang=detected_lang,
            confidence=confidence,
            source_lang=source,
            target_lang=target,
            alternatives=[],
            latency_ms=round((time.time() - start) * 1000, 1),
        )

    result = await asyncio.to_thread(translate_text, req.text, source, target, tone=req.tone)
    latency = round((time.time() - start) * 1000, 1)

    return TranslateResponse(
        translated_text=result["translated_text"],
        detected_lang=detected_lang,
        confidence=confidence,
        source_lang=source,
        target_lang=target,
        alternatives=result.get("alternatives", []),
        latency_ms=latency,
        detected_tone=result.get("detected_tone", "neutral"),
    )


@router.post("/detect", response_model=DetectResponse)
async def api_detect(req: DetectRequest):
    """Detect the language of input text."""
    result = detect_language(req.text)
    return DetectResponse(**result)


@router.get("/languages", response_model=list[LanguageInfo])
async def api_languages():
    """List all supported languages."""
    return [
        LanguageInfo(
            code=lang.code,
            name=lang.name,
            native_name=lang.native_name,
            flag=lang.flag,
            rtl=lang.rtl,
            nllb_code=lang.nllb_code,
        )
        for lang in get_all_languages()
    ]


@router.get("/languages/search", response_model=list[LanguageInfo])
async def api_search_languages(q: str = Query("", description="Search query")):
    """Search languages by name, native name, or code."""
    results = search_languages(q)
    return [
        LanguageInfo(
            code=lang.code,
            name=lang.name,
            native_name=lang.native_name,
            flag=lang.flag,
            rtl=lang.rtl,
            nllb_code=lang.nllb_code,
        )
        for lang in results
    ]
