"""
LinguaBridge Demo Script
========================
Quick demo of the LinguaBridge API endpoints.
Run this after starting the backend: python -m uvicorn app.main:app --port 8000

Usage:
    cd backend
    python demo.py
"""

import httpx
import json
import sys

BASE = "http://localhost:8000"


def banner(title: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def demo_health():
    banner("🏥 Health Check")
    r = httpx.get(f"{BASE}/health")
    data = r.json()
    print(f"  Status: {data['status']}")
    print(f"  Models: NLLB={'✅' if data['models']['nllb'] else '⬜'} "
          f"Whisper={'✅' if data['models']['whisper'] else '⬜'} "
          f"fastText={'✅' if data['models']['fasttext'] else '⬜'}")


def demo_languages():
    banner("🌍 Supported Languages")
    r = httpx.get(f"{BASE}/api/languages")
    langs = r.json()
    print(f"  Total: {len(langs)} languages\n")
    # Show a sample
    for lang in langs[:10]:
        rtl = " (RTL)" if lang.get("rtl") else ""
        print(f"  {lang['flag']}  {lang['code']:5s} {lang['name']:20s} {lang['native_name']}{rtl}")
    print(f"  ... and {len(langs)-10} more")


def demo_translate():
    banner("🔤 Text Translation")
    pairs = [
        ("Hello, how are you?", "en", "hi"),
        ("Machine learning is transforming the world.", "en", "pa"),
        ("The weather is beautiful today.", "en", "ta"),
    ]
    for text, src, tgt in pairs:
        try:
            r = httpx.post(f"{BASE}/api/translate", json={
                "text": text, "source_lang": src, "target_lang": tgt
            }, timeout=30.0)
            data = r.json()
            print(f"\n  [{src}→{tgt}] {text}")
            print(f"  Result:  {data['translated_text']}")
            print(f"  Latency: {data.get('latency_ms', '?')}ms  "
                  f"Fallback: {data.get('is_fallback', '?')}")
        except httpx.ReadTimeout:
            print(f"\n  [{src}→{tgt}] {text}")
            print(f"  ⏳ Timed out (first call loads ML models — try again)")
        except Exception as e:
            print(f"\n  [{src}→{tgt}] Error: {e}")


def demo_detect():
    banner("🔍 Language Detection")
    texts = [
        "Hello, how are you doing today?",
        "Bonjour, comment allez-vous?",
        "नमस्ते, आप कैसे हैं?",
        "こんにちは、お元気ですか？",
    ]
    for text in texts:
        try:
            r = httpx.post(f"{BASE}/api/detect", json={"text": text}, timeout=15.0)
            data = r.json()
            print(f"\n  Text: {text}")
            print(f"  Detected: {data['language']}  "
                  f"Confidence: {data['confidence']:.1%}")
        except Exception as e:
            print(f"\n  Text: {text}\n  Error: {e}")


def demo_search_languages():
    banner("🔎 Language Search")
    for query in ["hindi", "chinese", "pun"]:
        r = httpx.get(f"{BASE}/api/languages/search?q={query}")
        results = r.json()
        matches = ", ".join(f"{l['flag']} {l['name']}" for l in results)
        print(f"  '{query}' → {matches or 'no matches'}")


def demo_gloss():
    banner("🤟 Sign Language Gloss")
    # We can test gloss generation directly
    try:
        sys.path.insert(0, ".")
        from app.services.sign_language import text_to_gloss
        text = "Hello, I love you"
        gloss = text_to_gloss(text, "asl")
        print(f"  Text:  {text}")
        print(f"  Gloss: {' '.join(g['gloss'] for g in gloss)}")
        for g in gloss:
            sign_type = "✋ Sign" if g['type'] == 'sign' else "🤟 Fingerspell"
            print(f"    {sign_type}: {g['gloss']} ({g['duration_ms']}ms)")
    except Exception as e:
        print(f"  Skipped (import error): {e}")


def demo_history():
    banner("📜 Translation History")
    try:
        r = httpx.get(f"{BASE}/api/history?limit=5", timeout=10.0)
        data = r.json()
        items = data if isinstance(data, list) else data.get("items", [])
        print(f"  Found {len(items)} recent translations")
        for item in items[:3]:
            src = item.get("source_text", "")[:40]
            tgt = item.get("target_text", "")[:40]
            fav = "⭐" if item.get("is_favorite") else "  "
            print(f"  {fav} [{item.get('source_lang','?')}→{item.get('target_lang','?')}] {src} → {tgt}")
    except Exception as e:
        print(f"  Error: {e}")


def demo_analytics():
    banner("📊 Analytics")
    try:
        r = httpx.get(f"{BASE}/api/analytics/summary", timeout=10.0)
        data = r.json()
        print(f"  Total translations: {data.get('total_translations', 0)}")
        print(f"  Total characters:   {data.get('total_characters', 0)}")
        print(f"  Avg latency:        {data.get('avg_latency_ms', 0):.0f}ms")
    except Exception as e:
        print(f"  Error: {e}")


def main():
    print()
    print("  🌐 LinguaBridge — Demo Script")
    print("  ─────────────────────────────")

    try:
        httpx.get(f"{BASE}/health", timeout=3)
    except Exception:
        print(f"\n  ❌ Backend not running at {BASE}")
        print(f"     Start it with: python -m uvicorn app.main:app --port 8000")
        sys.exit(1)

    demo_health()
    demo_languages()
    demo_search_languages()
    demo_translate()
    demo_detect()
    demo_gloss()
    demo_history()
    demo_analytics()

    banner("✅ Demo Complete!")
    print("  Open http://localhost:5173 in your browser to see the full UI.\n")


if __name__ == "__main__":
    main()
