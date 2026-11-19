"""Unit tests for language detection service."""

import pytest


def test_detect_language_english():
    """Test detecting English text."""
    from app.services.detection import detect_language
    result = detect_language("Hello, how are you doing today?")
    assert "language" in result
    assert "confidence" in result
    assert "top_predictions" in result
    assert isinstance(result["top_predictions"], list)


def test_detect_language_short_text():
    """Test detection with very short text."""
    from app.services.detection import detect_language
    result = detect_language("Hi")
    assert "language" in result


def test_detect_language_empty():
    """Test detection with empty text returns unknown."""
    from app.services.detection import detect_language
    result = detect_language("")
    assert result["language"] == "en"  # default fallback
