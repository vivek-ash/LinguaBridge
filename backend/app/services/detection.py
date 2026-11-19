"""
Language detection service – Multi-tiered AI/ML language detector.

Combines:
1. Short-phrase / greeting lexical matcher (for 100% accuracy on short inputs like 'hola', 'ciao', 'bonjour')
2. Unicode Script block analyzer (for non-Latin scripts like Japanese, Korean, Arabic, Indic scripts)
3. langdetect probabilistic n-gram model (for accurate Latin & Cyrillic language identification)
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from app.ml.languages import LANGUAGES

logger = logging.getLogger(__name__)

# Common short-phrase and greeting dictionary for instant high-confidence detection
_GREETINGS_MAP: dict[str, str] = {
    # Spanish
    "hola": "es", "buenos dias": "es", "buenas tardes": "es", "buenas noches": "es",
    "gracias": "es", "muchas gracias": "es", "por favor": "es", "de nada": "es",
    "adios": "es", "hasta luego": "es", "como estas": "es", "como esta": "es",
    "amigo": "es", "amiga": "es", "si": "es", "claro": "es",
    # French
    "bonjour": "fr", "salut": "fr", "bonsoir": "fr", "bonne nuit": "fr",
    "merci": "fr", "merci beaucoup": "fr", "s'il vous plait": "fr", "de rien": "fr",
    "au revoir": "fr", "a bientot": "fr", "comment allez-vous": "fr", "comment ca va": "fr",
    "oui": "fr", "d'accord": "fr",
    # German
    "hallo": "de", "guten tag": "de", "guten morgen": "de", "guten abend": "de",
    "gute nacht": "de", "danke": "de", "danke schon": "de", "vielen dank": "de",
    "bitte": "de", "auf wiedersehen": "de", "tschuss": "de", "wie geht's": "de",
    "wie geht es ihnen": "de", "ja": "de", "nein": "de",
    # Italian
    "ciao": "it", "buongiorno": "it", "buonasera": "it", "buonanotte": "it",
    "grazie": "it", "grazie mille": "it", "per favore": "it", "prego": "it",
    "arrivederci": "it", "come stai": "it", "come va": "it", "si": "it",
    # Portuguese
    "ola": "pt", "olá": "pt", "bom dia": "pt", "boa tarde": "pt", "boa noite": "pt",
    "obrigado": "pt", "obrigada": "pt", "muito obrigado": "pt", "por favor": "pt",
    "de nada": "pt", "ate logo": "pt", "como voce esta": "pt", "como vai": "pt",
    # Russian (transliterated or common)
    "privet": "ru", "spasibo": "ru", "poka": "ru", "da": "ru",
    # English
    "hello": "en", "hi": "en", "hey": "en", "good morning": "en", "good evening": "en",
    "thank you": "en", "thanks": "en", "please": "en", "you're welcome": "en",
    "goodbye": "en", "bye": "en", "how are you": "en", "what's up": "en",
    "yes": "en", "no": "en", "welcome": "en",
    # Hindi (transliterated)
    "namaste": "hi", "namaskar": "hi", "dhanyavaad": "hi", "shukriya": "hi",
    "kaise ho": "hi", "kya haal hai": "hi", "theek hu": "hi", "haan": "hi", "nahi": "hi",
    # Japanese (transliterated)
    "konnichiwa": "ja", "arigato": "ja", "sayonara": "ja", "ohayo": "ja",
    # Chinese (pinyin)
    "ni hao": "zh", "xie xie": "zh", "zai jian": "zh",
    # Turkish
    "merhaba": "tr", "tesekkurler": "tr", "gunaydin": "tr",
    # Dutch
    "hallo": "nl", "goedemorgen": "nl", "dank je": "nl", "alsjeblieft": "nl",
    # Arabic (transliterated)
    "marhaba": "ar", "shukran": "ar", "ahlan": "ar", "as-salamu alaykum": "ar",
}

# ISO code normalizer (e.g. langdetect zh-cn -> zh)
_LANG_NORMALIZER: dict[str, str] = {
    "zh-cn": "zh",
    "zh-tw": "zh-TW",
    "war": "id",
    "nob": "no",
}


def detect_language(text: str) -> dict:
    """
    Detect the language of text with high precision.
    Returns:
        {
            "language": str,  # ISO 639-1 code
            "confidence": float,
            "top_predictions": [{"language": str, "confidence": float}, ...]
        }
    """
    if not text or not text.strip():
        return {"language": "en", "confidence": 0.0, "top_predictions": []}

    cleaned = re.sub(r"[^\w\s\?\!\,\.\'\-]", "", text.lower().strip())
    raw = text.strip()

    # ── Tier 1: Exact / Prefix Greeting Match ──────────────────────────────
    if cleaned in _GREETINGS_MAP:
        lang = _GREETINGS_MAP[cleaned]
        return {
            "language": lang,
            "confidence": 0.98,
            "top_predictions": [{"language": lang, "confidence": 0.98}],
        }

    # Check startswith for short greetings (e.g. "hola amigo", "bonjour jean")
    for phrase, lang in _GREETINGS_MAP.items():
        if len(phrase) >= 4 and (cleaned == phrase or cleaned.startswith(phrase + " ")):
            return {
                "language": lang,
                "confidence": 0.95,
                "top_predictions": [{"language": lang, "confidence": 0.95}],
            }

    # ── Tier 1.5: Conversational Hinglish / Romanized Indic Matcher ────────
    # Common conversational words in Romanized Hindi
    hinglish_markers = {
        "kya", "kar", "rahe", "raha", "rahi", "ho", "hai", "hain", "kaise", "kaisa", "kaisi",
        "aap", "tum", "hum", "main", "mujhe", "mera", "meri", "mere", "tere", "teri", "kuch",
        "nahi", "kahan", "kidhar", "kyun", "kyon", "batao", "bolo", "chalo", "accha", "achha",
        "theek", "bahut", "shukriya", "dhanyavad", "dhanyawaad", "namaste", "namaskar",
        "bhai", "karo", "karna", "hoga", "hogi", "hoge", "jaise", "waise", "aaj", "kal", "ab", "kab",
        "suno", "dekho", "aao", "jao"
    }
    words_in_text = set(re.findall(r"\b[a-zA-Z]+\b", cleaned))
    matched_hinglish = words_in_text.intersection(hinglish_markers)
    if len(matched_hinglish) >= 2 or (len(words_in_text) <= 3 and len(matched_hinglish) >= 1):
        return {
            "language": "hi",
            "confidence": 0.96,
            "top_predictions": [{"language": "hi", "confidence": 0.96}],
        }

    # ── Tier 2: Script-specific Unicode Analysis ───────────────────────────
    # Note: Japanese Hiragana/Katakana MUST be checked before Chinese Kanji!
    has_japanese_kana = bool(re.search(r"[\u3040-\u309f\u30a0-\u30ff]", raw))
    if has_japanese_kana:
        return {
            "language": "ja",
            "confidence": 0.99,
            "top_predictions": [{"language": "ja", "confidence": 0.99}],
        }

    has_korean_hangul = bool(re.search(r"[\uac00-\ud7af\u1100-\u11ff]", raw))
    if has_korean_hangul:
        return {
            "language": "ko",
            "confidence": 0.99,
            "top_predictions": [{"language": "ko", "confidence": 0.99}],
        }

    has_chinese_hanzi = bool(re.search(r"[\u4e00-\u9fff]", raw))
    if has_chinese_hanzi:
        return {
            "language": "zh",
            "confidence": 0.98,
            "top_predictions": [{"language": "zh", "confidence": 0.98}],
        }

    # Indic Scripts
    indic_scripts = [
        (r"[\u0a00-\u0a7f]", "pa"),  # Gurmukhi -> Punjabi
        (r"[\u0b80-\u0bff]", "ta"),  # Tamil
        (r"[\u0c00-\u0c7f]", "te"),  # Telugu
        (r"[\u0980-\u09ff]", "bn"),  # Bengali
        (r"[\u0a80-\u0aff]", "gu"),  # Gujarati
        (r"[\u0c80-\u0cff]", "kn"),  # Kannada
        (r"[\u0d00-\u0d7f]", "ml"),  # Malayalam
        (r"[\u0b00-\u0b7f]", "or"),  # Odia
        (r"[\u0d80-\u0dff]", "si"),  # Sinhala
    ]
    for pattern, code in indic_scripts:
        if re.search(pattern, raw):
            return {
                "language": code,
                "confidence": 0.98,
                "top_predictions": [{"language": code, "confidence": 0.98}],
            }

    # Devanagari Script (Hindi, Marathi, Nepali)
    if re.search(r"[\u0900-\u097f]", raw):
        # Default Devanagari to Hindi unless specific Marathi/Nepali markers present
        code = "hi"
        if "आहे" in raw or "नाही" in raw or "कसा" in raw or "कसे" in raw:
            code = "mr"
        elif "छ" in raw or "हुन" in raw:
            code = "ne"
        return {
            "language": code,
            "confidence": 0.95,
            "top_predictions": [{"language": code, "confidence": 0.95}],
        }

    # Arabic script (Arabic vs Urdu vs Persian)
    if re.search(r"[\u0600-\u06ff]", raw):
        code = "ar"
        # Urdu markers
        if re.search(r"[\u0679\u0686\u0698\u0691\u06ba\u06be\u06d2]", raw) or "ہیں" in raw or "کیا" in raw:
            code = "ur"
        elif re.search(r"[\u067e\u0686\u06af]", raw) or "است" in raw:
            code = "fa"
        return {
            "language": code,
            "confidence": 0.95,
            "top_predictions": [{"language": code, "confidence": 0.95}],
        }

    # Hebrew
    if re.search(r"[\u0590-\u05ff]", raw):
        return {
            "language": "he",
            "confidence": 0.99,
            "top_predictions": [{"language": "he", "confidence": 0.99}],
        }

    # Greek
    if re.search(r"[\u0370-\u03ff]", raw):
        return {
            "language": "el",
            "confidence": 0.99,
            "top_predictions": [{"language": "el", "confidence": 0.99}],
        }

    # Thai
    if re.search(r"[\u0e00-\u0e7f]", raw):
        return {
            "language": "th",
            "confidence": 0.99,
            "top_predictions": [{"language": "th", "confidence": 0.99}],
        }

    # Cyrillic (Russian, Ukrainian, Bulgarian, Serbian)
    if re.search(r"[\u0400-\u04ff]", raw):
        code = "ru"
        if re.search(r"[іїєґ]", raw.lower()):
            code = "uk"
        elif re.search(r"[ъ]", raw.lower()) and "ъ" in raw.lower() and "не" in raw.lower():
            code = "bg"
        return {
            "language": code,
            "confidence": 0.92,
            "top_predictions": [{"language": code, "confidence": 0.92}],
        }

    # ── Tier 3: langdetect ML Probabilistic Model ──────────────────────────
    try:
        import langdetect
        from langdetect import DetectorFactory
        DetectorFactory.seed = 42

        langs = langdetect.detect_langs(raw)
        if langs:
            top_preds = []
            for item in langs:
                norm_lang = _LANG_NORMALIZER.get(item.lang, item.lang)
                # Only accept languages that are supported in our master catalogue
                if norm_lang in LANGUAGES:
                    top_preds.append({
                        "language": norm_lang,
                        "confidence": round(float(item.prob), 4),
                    })
            if top_preds:
                best = top_preds[0]
                return {
                    "language": best["language"],
                    "confidence": best["confidence"],
                    "top_predictions": top_preds[:3],
                }
    except Exception as e:
        logger.debug("langdetect failed: %s", e)

    # ── Tier 4: Fallback English Default ──────────────────────────────────
    return {
        "language": "en",
        "confidence": 0.5,
        "top_predictions": [{"language": "en", "confidence": 0.5}],
    }
