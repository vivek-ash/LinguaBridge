"""
Comprehensive language metadata for 50+ languages.
Includes ISO codes, English names, native names, emoji flags, RTL markers,
and NLLB FLORES-200 codes.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True, slots=True)
class LanguageMeta:
    """Metadata for a single supported language."""
    code: str          # ISO 639-1
    name: str          # English name
    native_name: str   # Name in native script
    flag: str          # Emoji flag
    rtl: bool          # Right-to-left script
    nllb_code: str     # NLLB / FLORES-200 language code


# ── Master language catalogue ────────────────────────────────────────────────

LANGUAGES: dict[str, LanguageMeta] = {
    "en": LanguageMeta("en", "English", "English", "🇬🇧", False, "eng_Latn"),
    "es": LanguageMeta("es", "Spanish", "Español", "🇪🇸", False, "spa_Latn"),
    "fr": LanguageMeta("fr", "French", "Français", "🇫🇷", False, "fra_Latn"),
    "de": LanguageMeta("de", "German", "Deutsch", "🇩🇪", False, "deu_Latn"),
    "it": LanguageMeta("it", "Italian", "Italiano", "🇮🇹", False, "ita_Latn"),
    "pt": LanguageMeta("pt", "Portuguese", "Português", "🇵🇹", False, "por_Latn"),
    "ru": LanguageMeta("ru", "Russian", "Русский", "🇷🇺", False, "rus_Cyrl"),
    "zh": LanguageMeta("zh", "Chinese (Simplified)", "简体中文", "🇨🇳", False, "zho_Hans"),
    "zh-TW": LanguageMeta("zh-TW", "Chinese (Traditional)", "繁體中文", "🇹🇼", False, "zho_Hant"),
    "ja": LanguageMeta("ja", "Japanese", "日本語", "🇯🇵", False, "jpn_Jpan"),
    "ko": LanguageMeta("ko", "Korean", "한국어", "🇰🇷", False, "kor_Hang"),
    "ar": LanguageMeta("ar", "Arabic", "العربية", "🇸🇦", True, "arb_Arab"),
    "hi": LanguageMeta("hi", "Hindi", "हिन्दी", "🇮🇳", False, "hin_Deva"),
    "pa": LanguageMeta("pa", "Punjabi", "ਪੰਜਾਬੀ", "🇮🇳", False, "pan_Guru"),
    "ta": LanguageMeta("ta", "Tamil", "தமிழ்", "🇮🇳", False, "tam_Taml"),
    "te": LanguageMeta("te", "Telugu", "తెలుగు", "🇮🇳", False, "tel_Telu"),
    "bn": LanguageMeta("bn", "Bengali", "বাংলা", "🇧🇩", False, "ben_Beng"),
    "mr": LanguageMeta("mr", "Marathi", "मराठी", "🇮🇳", False, "mar_Deva"),
    "ur": LanguageMeta("ur", "Urdu", "اردو", "🇵🇰", True, "urd_Arab"),
    "gu": LanguageMeta("gu", "Gujarati", "ગુજરાતી", "🇮🇳", False, "guj_Gujr"),
    "kn": LanguageMeta("kn", "Kannada", "ಕನ್ನಡ", "🇮🇳", False, "kan_Knda"),
    "ml": LanguageMeta("ml", "Malayalam", "മലയാളം", "🇮🇳", False, "mal_Mlym"),
    "or": LanguageMeta("or", "Odia", "ଓଡ଼ିଆ", "🇮🇳", False, "ory_Orya"),
    "ne": LanguageMeta("ne", "Nepali", "नेपाली", "🇳🇵", False, "npi_Deva"),
    "si": LanguageMeta("si", "Sinhala", "සිංහල", "🇱🇰", False, "sin_Sinh"),
    "th": LanguageMeta("th", "Thai", "ไทย", "🇹🇭", False, "tha_Thai"),
    "vi": LanguageMeta("vi", "Vietnamese", "Tiếng Việt", "🇻🇳", False, "vie_Latn"),
    "id": LanguageMeta("id", "Indonesian", "Bahasa Indonesia", "🇮🇩", False, "ind_Latn"),
    "ms": LanguageMeta("ms", "Malay", "Bahasa Melayu", "🇲🇾", False, "zsm_Latn"),
    "tr": LanguageMeta("tr", "Turkish", "Türkçe", "🇹🇷", False, "tur_Latn"),
    "pl": LanguageMeta("pl", "Polish", "Polski", "🇵🇱", False, "pol_Latn"),
    "nl": LanguageMeta("nl", "Dutch", "Nederlands", "🇳🇱", False, "nld_Latn"),
    "sv": LanguageMeta("sv", "Swedish", "Svenska", "🇸🇪", False, "swe_Latn"),
    "no": LanguageMeta("no", "Norwegian", "Norsk", "🇳🇴", False, "nob_Latn"),
    "da": LanguageMeta("da", "Danish", "Dansk", "🇩🇰", False, "dan_Latn"),
    "fi": LanguageMeta("fi", "Finnish", "Suomi", "🇫🇮", False, "fin_Latn"),
    "cs": LanguageMeta("cs", "Czech", "Čeština", "🇨🇿", False, "ces_Latn"),
    "ro": LanguageMeta("ro", "Romanian", "Română", "🇷🇴", False, "ron_Latn"),
    "hu": LanguageMeta("hu", "Hungarian", "Magyar", "🇭🇺", False, "hun_Latn"),
    "el": LanguageMeta("el", "Greek", "Ελληνικά", "🇬🇷", False, "ell_Grek"),
    "he": LanguageMeta("he", "Hebrew", "עברית", "🇮🇱", True, "heb_Hebr"),
    "fa": LanguageMeta("fa", "Persian", "فارسی", "🇮🇷", True, "pes_Arab"),
    "uk": LanguageMeta("uk", "Ukrainian", "Українська", "🇺🇦", False, "ukr_Cyrl"),
    "sw": LanguageMeta("sw", "Swahili", "Kiswahili", "🇰🇪", False, "swh_Latn"),
    "am": LanguageMeta("am", "Amharic", "አማርኛ", "🇪🇹", False, "amh_Ethi"),
    "yo": LanguageMeta("yo", "Yoruba", "Yorùbá", "🇳🇬", False, "yor_Latn"),
    "ig": LanguageMeta("ig", "Igbo", "Igbo", "🇳🇬", False, "ibo_Latn"),
    "ha": LanguageMeta("ha", "Hausa", "Hausa", "🇳🇬", False, "hau_Latn"),
    "zu": LanguageMeta("zu", "Zulu", "isiZulu", "🇿🇦", False, "zul_Latn"),
    "af": LanguageMeta("af", "Afrikaans", "Afrikaans", "🇿🇦", False, "afr_Latn"),
    "bg": LanguageMeta("bg", "Bulgarian", "Български", "🇧🇬", False, "bul_Cyrl"),
    "ca": LanguageMeta("ca", "Catalan", "Català", "🇪🇸", False, "cat_Latn"),
    "hr": LanguageMeta("hr", "Croatian", "Hrvatski", "🇭🇷", False, "hrv_Latn"),
    "sk": LanguageMeta("sk", "Slovak", "Slovenčina", "🇸🇰", False, "slk_Latn"),
    "sl": LanguageMeta("sl", "Slovenian", "Slovenščina", "🇸🇮", False, "slv_Latn"),
    "sr": LanguageMeta("sr", "Serbian", "Српски", "🇷🇸", False, "srp_Cyrl"),
    "lt": LanguageMeta("lt", "Lithuanian", "Lietuvių", "🇱🇹", False, "lit_Latn"),
    "lv": LanguageMeta("lv", "Latvian", "Latviešu", "🇱🇻", False, "lvs_Latn"),
    "et": LanguageMeta("et", "Estonian", "Eesti", "🇪🇪", False, "est_Latn"),
    "ka": LanguageMeta("ka", "Georgian", "ქართული", "🇬🇪", False, "kat_Geor"),
    "my": LanguageMeta("my", "Myanmar", "မြန်မာ", "🇲🇲", False, "mya_Mymr"),
    "km": LanguageMeta("km", "Khmer", "ខ្មែរ", "🇰🇭", False, "khm_Khmr"),
    "lo": LanguageMeta("lo", "Lao", "ລາວ", "🇱🇦", False, "lao_Laoo"),
}

# Reverse maps for quick lookups
_NLLB_TO_CODE: dict[str, str] = {lang.nllb_code: code for code, lang in LANGUAGES.items()}
_NAME_TO_CODE: dict[str, str] = {lang.name.lower(): code for code, lang in LANGUAGES.items()}

# Mapping from fastText language labels (__label__xx) to our ISO codes
FASTTEXT_TO_ISO: dict[str, str] = {
    "en": "en", "es": "es", "fr": "fr", "de": "de", "it": "it",
    "pt": "pt", "ru": "ru", "zh": "zh", "ja": "ja", "ko": "ko",
    "ar": "ar", "hi": "hi", "pa": "pa", "ta": "ta", "te": "te",
    "bn": "bn", "mr": "mr", "ur": "ur", "gu": "gu", "kn": "kn",
    "ml": "ml", "or": "or", "ne": "ne", "si": "si", "th": "th",
    "vi": "vi", "id": "id", "ms": "ms", "tr": "tr", "pl": "pl",
    "nl": "nl", "sv": "sv", "no": "no", "da": "da", "fi": "fi",
    "cs": "cs", "ro": "ro", "hu": "hu", "el": "el", "he": "he",
    "fa": "fa", "uk": "uk", "sw": "sw", "am": "am", "yo": "yo",
    "ig": "ig", "ha": "ha", "zu": "zu", "af": "af", "bg": "bg",
    "ca": "ca", "hr": "hr", "sk": "sk", "sl": "sl", "sr": "sr",
    "lt": "lt", "lv": "lv", "et": "et", "ka": "ka", "my": "my",
    "km": "km", "lo": "lo",
}


def get_language(code: str) -> Optional[LanguageMeta]:
    """Get language metadata by ISO code."""
    return LANGUAGES.get(code)


def get_language_by_nllb(nllb_code: str) -> Optional[LanguageMeta]:
    """Get language metadata by NLLB/FLORES code."""
    iso = _NLLB_TO_CODE.get(nllb_code)
    return LANGUAGES.get(iso) if iso else None


def search_languages(query: str) -> list[LanguageMeta]:
    """Search languages by name, native name, or code (case-insensitive)."""
    q = query.lower().strip()
    if not q:
        return list(LANGUAGES.values())
    results: list[LanguageMeta] = []
    for lang in LANGUAGES.values():
        if (
            q in lang.code.lower()
            or q in lang.name.lower()
            or q in lang.native_name.lower()
            or q in lang.nllb_code.lower()
        ):
            results.append(lang)
    return results


def get_all_languages() -> list[LanguageMeta]:
    """Return all supported languages sorted by English name."""
    return sorted(LANGUAGES.values(), key=lambda lang: lang.name)


def nllb_code_for(iso_code: str) -> Optional[str]:
    """Return the NLLB code for a given ISO code, or None."""
    lang = LANGUAGES.get(iso_code)
    return lang.nllb_code if lang else None


def iso_code_for_fasttext(ft_label: str) -> Optional[str]:
    """Map a fastText label (e.g. 'en') to our ISO code."""
    return FASTTEXT_TO_ISO.get(ft_label)
