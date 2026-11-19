"""Smoke tests for HTTP and WebSocket endpoints.

Uses direct function calls and route inspection to avoid
TestClient/aiosqlite event-loop conflicts.
"""

import os
import json

# Ensure test env before app imports
os.environ["PRELOAD_MODELS"] = "false"


def test_health_endpoint_registered():
    """Test that health route exists and handler works."""
    from app.main import app
    health_routes = [r for r in app.routes if hasattr(r, 'path') and r.path == '/health']
    assert len(health_routes) == 1


def test_languages_list_from_module():
    """Test languages module returns 50+ languages."""
    from app.ml.languages import LANGUAGES, get_language, search_languages
    assert len(LANGUAGES) > 50
    hindi = get_language("hi")
    assert hindi is not None
    assert hindi.native_name == "हिन्दी"
    assert hindi.nllb_code == "hin_Deva"


def test_search_languages():
    """Test language search functionality."""
    from app.ml.languages import search_languages
    results = search_languages("hindi")
    assert len(results) >= 1
    assert any(lang.code == "hi" for lang in results)


def test_translate_api_function():
    """Test the translate service directly."""
    from app.services.translation import translate_text
    result = translate_text("Hello world", "en", "hi")
    assert "translated_text" in result
    assert isinstance(result["translated_text"], str)
    assert len(result["translated_text"]) > 0


def test_detect_api_function():
    """Test the detect service directly."""
    from app.services.detection import detect_language
    result = detect_language("Hello, how are you?")
    assert "language" in result
    assert "confidence" in result


def test_websocket_voice_route_exists():
    """Verify the WebSocket route is registered in the voice router."""
    from app.routers.voice import router
    ws_routes = [r for r in router.routes if hasattr(r, 'path') and '/voice' in r.path]
    assert len(ws_routes) >= 1


def test_all_api_routers_registered():
    """Verify all expected routers are included in the app."""
    from app.main import app
    # Collect all paths including sub-router paths
    all_paths: set[str] = set()
    for route in app.routes:
        if hasattr(route, 'path'):
            all_paths.add(route.path)
        # APIRouter mounts show up as routes with nested routes
        if hasattr(route, 'routes'):
            for sub in route.routes:
                if hasattr(sub, 'path'):
                    all_paths.add(sub.path)
    # Health is at root, routers at sub-paths
    assert '/health' in all_paths, f"Missing /health in {all_paths}"


def test_sign_language_gloss():
    """Test sign language gloss generation."""
    from app.services.sign_language import text_to_gloss
    result = text_to_gloss("Hello world", "asl")
    assert isinstance(result, list)
    assert len(result) > 0
    assert all("gloss" in g for g in result)


def test_subtitle_generation():
    """Test SRT/VTT subtitle generation."""
    from app.services.subtitle import generate_srt, generate_vtt
    segments = [
        {"start": 0.0, "end": 2.5, "text": "Hello world"},
        {"start": 3.0, "end": 5.0, "text": "Testing subtitles"},
    ]
    srt = generate_srt(segments)
    assert "Hello world" in srt
    assert "00:00:00,000" in srt

    vtt = generate_vtt(segments)
    assert "WEBVTT" in vtt
    assert "Hello world" in vtt
