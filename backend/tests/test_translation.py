"""Unit tests for translation service."""

import pytest
from unittest.mock import patch, MagicMock


def test_translate_text_fallback():
    """Test that translation returns fallback when model not loaded."""
    from app.services.translation import translate_text
    result = translate_text("Hello world", "en", "hi")
    assert "translated_text" in result
    assert isinstance(result["translated_text"], str)
    assert len(result["translated_text"]) > 0


def test_translate_same_language():
    """Test translating to the same language returns original text."""
    from app.services.translation import translate_text
    result = translate_text("Hello", "en", "en")
    assert result["translated_text"] == "Hello"


def test_translate_empty_text():
    """Test translating empty text."""
    from app.services.translation import translate_text
    result = translate_text("", "en", "hi")
    assert result["translated_text"] == ""
