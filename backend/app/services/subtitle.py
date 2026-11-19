"""
Subtitle generation service – produces SRT and WebVTT formatted subtitles
from timestamped translation segments.
"""

from __future__ import annotations

import logging
from typing import Optional

from app.utils.helpers import format_timestamp_srt, format_timestamp_vtt

logger = logging.getLogger(__name__)


def generate_srt(
    segments: list[dict],
    *,
    dual: bool = False,
) -> str:
    """
    Generate SRT-formatted subtitles.

    Each segment dict must have:
        - index: int
        - start_time: float  (seconds)
        - end_time: float    (seconds)
        - original_text: str
        - translated_text: str

    If *dual* is True both original and translated lines are included.
    """
    lines: list[str] = []
    for i, seg in enumerate(segments, start=1):
        start = format_timestamp_srt(seg.get("start_time", seg.get("start", 0)))
        end = format_timestamp_srt(seg.get("end_time", seg.get("end", 0)))
        lines.append(str(i))
        lines.append(f"{start} --> {end}")
        if dual and seg.get("original_text", seg.get("text")):
            lines.append(seg.get("original_text", seg.get("text", "")))
        lines.append(seg.get("translated_text", seg.get("text", "")))
        lines.append("")  # blank line separator
    return "\n".join(lines)


def generate_vtt(
    segments: list[dict],
    *,
    dual: bool = False,
) -> str:
    """
    Generate WebVTT-formatted subtitles.

    Segment dict shape identical to :func:`generate_srt`.
    """
    lines: list[str] = ["WEBVTT", ""]
    for i, seg in enumerate(segments, start=1):
        start = format_timestamp_vtt(seg.get("start_time", seg.get("start", 0)))
        end = format_timestamp_vtt(seg.get("end_time", seg.get("end", 0)))
        lines.append(str(i))
        lines.append(f"{start} --> {end}")
        if dual and seg.get("original_text", seg.get("text")):
            lines.append(seg.get("original_text", seg.get("text", "")))
        lines.append(seg.get("translated_text", seg.get("text", "")))
        lines.append("")
    return "\n".join(lines)


def generate_transcript(segments: list[dict], translated: bool = False) -> str:
    """
    Generate a plain-text transcript from segments.
    If *translated* is True, uses translated_text; otherwise original_text.
    """
    key = "translated_text" if translated else "original_text"
    return "\n".join(seg.get(key, "") for seg in segments)
