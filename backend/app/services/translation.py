"""
Translation service – wraps the NLLB-200 model for text translation.
Falls back to a simple demo mode if the model is unavailable.
Uses a threading lock to prevent concurrent tokenizer access (NLLB tokenizer is NOT thread-safe).
"""

from __future__ import annotations

import logging
import re
from threading import Lock
from typing import Optional

from app.ml.languages import LANGUAGES, get_language, nllb_code_for
from app.ml.model_manager import model_manager

logger = logging.getLogger(__name__)

# Lock to serialize NLLB model access – the tokenizer's set_src_lang_special_tokens
# mutates internal state and raises "Already borrowed" if accessed concurrently.
_nllb_lock = Lock()

# Comprehensive Romanized Hindi (Hinglish) transliteration mapping
_HINGLISH_TO_DEVA: dict[str, str] = {
    "tum kya kar rahe ho": "तुम क्या कर रहे हो",
    "kya kar rahe ho": "क्या कर रहे हो",
    "kya kar rahe he": "क्या कर रहे हैं",
    "aap kya kar rahe ho": "आप क्या कर रहे हैं",
    "aap kya kar rahe hain": "आप क्या कर रहे हैं",
    "aap kaise ho": "आप कैसे हैं",
    "aap kaise hain": "आप कैसे हैं",
    "tum kaise ho": "तुम कैसे हो",
    "kya haal hai": "क्या हाल है",
    "kya hal hai": "क्या हाल है",
    "aapka naam kya hai": "आपका नाम क्या है",
    "tumhara naam kya hai": "तुम्हारा नाम क्या है",
    "main theek hoon": "मैं ठीक हूँ",
    "main theek hu": "मैं ठीक हूँ",
    "mujhe madad chahiye": "मुझे मदद चाहिए",
    "dhanyawad": "धन्यवाद",
    "dhanyavad": "धन्यवाद",
    "shukriya": "शुक्रिया",
    "namaste": "नमस्ते",
    "namaskar": "नमस्कार",
    "alvida": "अलविदा",
    "kahan ho": "कहाँ हो",
    "kahan ja rahe ho": "कहाँ जा रहे हो",
    "bahut accha": "बहुत अच्छा",
    "bahut achha": "बहुत अच्छा",
    "koi baat nahi": "कोई बात नहीं",
    "chalo": "चलो",
    "haan": "हाँ",
    "nahi": "नहीं",
    "nahin": "नहीं",
    "thane vaa": "धन्यवाद",
    "thane va": "धन्यवाद",
    "thaneva": "धन्यवाद",
    "thanewa": "धन्यवाद",
    "danyavaad": "धन्यवाद",
}

_HINGLISH_WORD_MAP: dict[str, str] = {
    "aaj": "आज", "tum": "तुम", "aap": "आप", "hum": "हम", "main": "मैं", "ham": "हम",
    "kahan": "कहाँ", "kaha": "कहाँ", "kah": "कहाँ", "kidhar": "किधर", "yahan": "यहाँ", "vahan": "वहाँ",
    "ja": "जा", "jareh": "जा रहे", "jaa": "जा", "rahe": "रहे", "raha": "रहा", "rahi": "रही",
    "ho": "हो", "hai": "है", "hain": "हैं", "hu": "हूँ", "hoon": "हूँ", "tha": "था", "thi": "थी", "the": "थे",
    "kaise": "कैसे", "kaisa": "कैसा", "kaisi": "कैसी",
    "kya": "क्या", "kar": "कर", "karo": "करो", "kare": "करें", "karna": "करना", "karne": "करने",
    "mera": "मेरा", "meri": "मेरी", "mere": "मेरे", "aapka": "आपका", "aapki": "आपकी",
    "aapke": "आपके", "naam": "नाम", "nam": "नाम", "theek": "ठीक", "accha": "अच्छा", "achha": "अच्छा",
    "bahut": "बहुत", "shukriya": "शुक्रिया", "dhanyawad": "धन्यवाद", "dhanyavad": "धन्यवाद",
    "namaste": "नमस्ते", "namaskar": "नमस्कार", "madad": "मदद", "chahiye": "चाहिए",
    "nahi": "नहीं", "nahin": "नहीं", "haan": "हाँ", "chalo": "चलो", "aao": "आओ", "suno": "सुनो",
    "dekho": "देखो", "kal": "कल", "ab": "अब", "kab": "कब", "kyun": "क्यों", "kyon": "क्यों",
    "bhai": "भाई", "yaar": "यार", "ghar": "घर", "paas": "पास", "dur": "दूर", "saath": "साथ",
    "suprabhat": "सुप्रभात", "subramatme": "सुप्रभात", "shravan": "श्रवण", "kumar": "कुमार", "kumalai": "कुमार",
    "kaksha": "कक्षा", "kakcha": "कक्षा", "kachha": "कक्षा", "aathvi": "आठवीं", "atvi": "आठवीं",
    "shirshak": "शीर्षक", "sversa": "शीर्षक", "berozgari": "बेरोजगारी", "beroosgari": "बेरोजगारी",
    "kavita": "कविता", "kaudakas": "कविता", "prastut": "प्रस्तुत", "tukkar": "प्रस्तुत",
    "sab": "सब", "saak": "सब", "sabke": "सबके", "saamne": "सामने", "saam": "सामने",
    "desh": "देश", "log": "लोग", "hazaar": "हजार", "hajar": "हजार", "hajaar": "हजार",
    "lakh": "लाख", "chinta": "चिंता", "satari": "सता रही", "khair": "खैर", "kiya": "किया",
    "mein": "में", "me": "में", "aur": "और", "ek": "एक", "ka": "का", "ki": "की", "ke": "के",
    "ko": "को", "se": "से", "par": "पर", "bhi": "भी", "ye": "ये", "yeh": "यह", "voh": "वह",
    "woh": "वह", "ve": "वे", "unke": "उनके", "unki": "उनकी", "unka": "उनका", "apne": "अपने",
    "apna": "अपना", "apni": "अपनी", "sirf": "सिर्फ", "lekin": "लेकिन", "magar": "मगर",
    "thane": "धन्य", "vaa": "वाद", "bebas": "बेबस", "umr": "उम्र", "aadhi": "आधी",
    "jeewan": "जीवन", "duniya": "दुनिया", "yuvak": "युवक", "mehnat": "मेहनत", "padhai": "पढ़ाई",
}

# Comprehensive Romanized Punjabi (Punjlish) transliteration mapping
_PUNJLISH_TO_GURU: dict[str, str] = {
    "sat sri akal": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
    "sat shri akal": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
    "satsriakal": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
    "tusi kive ho": "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ",
    "tussi kive ho": "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ",
    "tusi kiven ho": "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ",
    "tussi kiven ho": "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ",
    "tuhada ki haal hai": "ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ",
    "tuhada ki hal hai": "ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ",
    "ki haal hai": "ਕੀ ਹਾਲ ਹੈ",
    "ki hal hai": "ਕੀ ਹਾਲ ਹੈ",
    "ki haal aa": "ਕੀ ਹਾਲ ਆ",
    "main theek haan": "ਮੈਂ ਠੀਕ ਹਾਂ",
    "main theek han": "ਮੈਂ ਠੀਕ ਹਾਂ",
    "dhanvaad": "ਧੰਨਵਾਦ",
    "dhanwad": "ਧੰਨਵਾਦ",
    "shukriya": "ਸ਼ੁਕਰੀਆ",
    "tusi ki kar rahe ho": "ਤੁਸੀਂ ਕੀ ਕਰ ਰਹੇ ਹੋ",
    "tussi ki kar rahe ho": "ਤੁਸੀਂ ਕੀ ਕਰ ਰਹੇ ਹੋ",
    "tu ki kar reha hai": "ਤੂੰ ਕੀ ਕਰ ਰਿਹਾ ਹੈਂ",
    "kidhar ja rahe ho": "ਕਿੱਧਰ ਜਾ ਰਹੇ ਹੋ",
    "kithon ja rahe ho": "ਕਿੱਥੋਂ ਜਾ ਰਹੇ ਹੋ",
    "bahut changa": "ਬਹੁਤ ਚੰਗਾ",
    "bahut vadiya": "ਬਹੁਤ ਵਧੀਆ",
    "haanji": "ਹਾਂਜੀ",
    "haan ji": "ਹਾਂਜੀ",
    "nahi ji": "ਨਹੀਂ ਜੀ",
    "chalo chaliye": "ਚਲੋ ਚੱਲੀਏ",
    "mera naam": "ਮੇਰਾ ਨਾਮ",
    "tuhada naam ki hai": "ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ",
}

_PUNJLISH_WORD_MAP: dict[str, str] = {
    "sat": "ਸਤਿ", "sri": "ਸ੍ਰੀ", "akal": "ਅਕਾਲ",
    "tusi": "ਤੁਸੀਂ", "tussi": "ਤੁਸੀਂ", "tu": "ਤੂੰ", "main": "ਮੈਂ", "asi": "ਅਸੀਂ", "assi": "ਅਸੀਂ",
    "kive": "ਕਿਵੇਂ", "kiven": "ਕਿਵੇਂ", "ki": "ਕੀ", "haal": "ਹਾਲ", "hal": "ਹਾਲ",
    "hai": "ਹੈ", "ho": "ਹੋ", "haan": "ਹਾਂ", "han": "ਹਾਂ", "si": "ਸੀ", "san": "ਸਨ",
    "mera": "ਮੇਰਾ", "meri": "ਮੇਰੀ", "mere": "ਮੇਰੇ", "tuhada": "ਤੁਹਾਡਾ", "tuhadi": "ਤੁਹਾਡੀ", "tuhade": "ਤੁਹਾਡੇ",
    "naam": "ਨਾਮ", "nam": "ਨਾਮ", "theek": "ਠੀਕ", "changa": "ਚੰਗਾ", "vadiya": "ਵਧੀਆ", "bahut": "ਬਹੁਤ",
    "dhanvaad": "ਧੰਨਵਾਦ", "dhanwad": "ਧੰਨਵਾਦ", "shukriya": "ਸ਼ੁਕਰੀਆ",
    "kithon": "ਕਿੱਥੋਂ", "kidhar": "ਕਿੱਧਰ", "ithe": "ਇੱਥੇ", "uthe": "ਉੱਥੇ", "ghar": "ਘਰ",
    "yaar": "ਯਾਰ", "bhai": "ਭਰਾ", "veer": "ਵੀਰ", "veere": "ਵੀਰੇ", "ji": "ਜੀ",
    "kar": "ਕਰ", "karo": "ਕਰੋ", "rahe": "ਰਹੇ", "reha": "ਰਿਹਾ", "rahi": "ਰਹੀ",
    "chalo": "ਚਲੋ", "aao": "ਆਓ", "suno": "ਸੁਣੋ", "dekho": "ਦੇਖੋ", "kal": "ਕੱਲ੍ਹ", "aaj": "ਅੱਜ",
    "nahi": "ਨਹੀਂ", "nahin": "ਨਹੀਂ", "haan": "ਹਾਂ", "kyun": "ਕਿਉਂ", "kise": "ਕਿਸੇ",
}

def _roman_punjabi_to_guru(text: str) -> str:
    """Convert conversational Romanized Punjabi (Punjlish) into native Gurmukhi script."""
    result = text
    # Replace known multi-word phrases first (longest match first)
    sorted_phrases = sorted(_PUNJLISH_TO_GURU.items(), key=lambda x: len(x[0]), reverse=True)
    for pk, gv in sorted_phrases:
        pattern = re.compile(r'\b' + re.escape(pk) + r'\b', re.IGNORECASE)
        result = pattern.sub(gv, result)

    def repl(m: re.Match) -> str:
        w = m.group(0).lower()
        return _PUNJLISH_WORD_MAP.get(w, m.group(0))

    return re.sub(r"\b[a-zA-Z]+\b", repl, result)

def detect_tone(text: str, lang: str = "en") -> str:
    """
    Identifies the human tone (formal, casual, or neutral) based on linguistic markers.
    """
    low = text.lower()
    formal_markers = [
        "please", "kindly", "respectfully", "sincerely", "regards", "honored", "sir", "madam",
        "tusi", "tussi", "tuhada", "tuhadi", "ji", "dhanvaad", "kirpa", "ਤੁਸੀਂ", "ਤੁਹਾਡਾ", "ਜੀ",
        "aap", "aapka", "aapki", "kripya", "dhanyawad", "namaskar", "shriman", "आप", "आपका", "धन्यवाद"
    ]
    casual_markers = [
        "hey", "hi", "yo", "sup", "bro", "dude", "buddy", "man", "cheers",
        "tu", "yaar", "veere", "ki haal aa", "ਤੂੰ", "ਯਾਰ", "ਵੀਰੇ",
        "tum", "tumhara", "are", "bhai", "kya chal raha hai", "तुम", "तुम्हारा", "भाई", "यार"
    ]

    formal_score = sum(1 for m in formal_markers if m in low)
    casual_score = sum(1 for m in casual_markers if m in low)

    if formal_score > casual_score:
        return "formal"
    elif casual_score > formal_score:
        return "casual"
    return "neutral"

def apply_tone_modulation(translated_text: str, target_lang: str, tone: Optional[str]) -> str:
    """
    Refines output phrasing to match requested tone (formal, casual, or neutral),
    and normalizes Punjabi translation to pure idiomatic phrasing.
    """
    res = translated_text

    if target_lang == "pa":
        # Always replace literal transliterated greetings "ਹੈਲੋ" / "ਹੱਲੋ" with authentic Punjabi greeting "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ"
        res = re.sub(r'^(ਹੈਲੋ|ਹੱਲੋ|ਹੈਲੋ ਜੀ)[,\s]+', 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ', res)
        res = re.sub(r'^(ਹੈਲੋ|ਹੱਲੋ)$', 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ', res)

    if not tone or tone in ("neutral", "natural"):
        return res

    if target_lang == "pa":
        if tone == "formal":
            res = re.sub(r'\bਤੂੰ\b', 'ਤੁਸੀਂ', res)
            res = re.sub(r'\bਤੇਰਾ\b', 'ਤੁਹਾਡਾ', res)
            res = re.sub(r'\bਤੇਰੀ\b', 'ਤੁਹਾਡੀ', res)
            res = re.sub(r'\bਤੇਰੇ\b', 'ਤੁਹਾਡੇ', res)
        elif tone == "casual":
            res = re.sub(r'\bਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ\b', 'ਕੀ ਹਾਲ ਆ ਵੀਰੇ', res)
            res = re.sub(r'\bਤੁਸੀਂ ਕਿਵੇਂ ਹੋ\b', 'ਕਿਵੇਂ ਓ ਯਾਰ', res)
    elif target_lang == "hi":
        if tone == "formal":
            res = re.sub(r'\bतुम\b', 'आप', res)
            res = re.sub(r'\bतुम्हारा\b', 'आपका', res)
            res = re.sub(r'\bतुम्हारी\b', 'आपकी', res)
            res = re.sub(r'\bतुम्हारे\b', 'आपके', res)
        elif tone == "casual":
            res = re.sub(r'\bआप कैसे हैं\b', 'क्या हाल है भाई', res)
            res = re.sub(r'\bआप\b', 'तुम', res)
            res = re.sub(r'\bआपका\b', 'तुम्हारा', res)
    elif target_lang == "en":
        if tone == "formal":
            res = re.sub(r'\bHey\b', 'Hello', res)
            res = re.sub(r'\bThanks\b', 'Thank you', res)
        elif tone == "casual":
            res = re.sub(r'\bGreetings\b', 'Hey', res)
            res = re.sub(r'\bI am fine\b', 'Doing great!', res)

    return res

# High-accuracy conversational idiom mapping for natural spoken dialogues
_CONVERSATIONAL_MAP: dict[tuple[str, str, str], str] = {
    # Punjabi -> English
    ("ਕੀ ਹਾਲ ਆ ਵੀਰੇ", "pa", "en"): "How are you, brother?",
    ("ਕੀ ਹਾਲ ਹੈ ਵੀਰੇ", "pa", "en"): "How are you, brother?",
    ("ਕੀ ਹਾਲ ਆ", "pa", "en"): "How are you doing?",
    ("ਕੀ ਹਾਲ ਹੈ", "pa", "en"): "How are you doing?",
    ("ਕੀ ਹਾਲ ਚਾਲ ਹੈ", "pa", "en"): "How is everything going?",
    ("ਕਿਵੇਂ ਓ ਵੀਰੇ", "pa", "en"): "How are you, brother?",
    ("ਕਿਵੇਂ ਹੋ ਵੀਰੇ", "pa", "en"): "How are you, brother?",
    ("ਕਿਵੇਂ ਓ ਯਾਰ", "pa", "en"): "How are you, buddy?",
    ("ਕਿਵੇਂ ਓ", "pa", "en"): "How are you?",
    ("ਕਿਵੇਂ ਹੋ", "pa", "en"): "How are you?",
    ("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ", "pa", "en"): "Greetings!",
    ("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ", "pa", "en"): "Greetings and respectful hello!",
    ("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ, ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ?", "pa", "en"): "Greetings! How are you doing today?",
    ("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਵੀਰੇ", "pa", "en"): "Greetings brother!",
    ("ਮੈਂ ਠੀਕ ਹਾਂ", "pa", "en"): "I am fine.",
    ("ਮੈਂ ਬਿਲਕੁਲ ਠੀਕ ਹਾਂ", "pa", "en"): "I am doing great.",
    ("ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ, ਧੰਨਵਾਦ!", "pa", "en"): "I am doing great, thank you!",
    ("ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ, ਧੰਨਵਾਦ", "pa", "en"): "I am doing great, thank you!",
    ("ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ", "pa", "en"): "I am doing great.",
    ("ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ", "pa", "en"): "How are you?",
    ("ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?", "pa", "en"): "How are you?",
    ("ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ?", "pa", "en"): "What is your name?",
    ("ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ", "pa", "en"): "What is your name?",
    ("ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ?", "pa", "en"): "How are you doing?",
    ("ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ", "pa", "en"): "How are you doing?",
    ("ਧੰਨਵਾਦ", "pa", "en"): "Thank you!",
    ("ਬਹੁਤ ਬਹੁਤ ਧੰਨਵਾਦ", "pa", "en"): "Thank you very much!",
    ("ਬਹੁਤ ਵਧੀਆ", "pa", "en"): "Very good!",
    ("ਜੀ ਆਇਆਂ ਨੂੰ", "pa", "en"): "Welcome!",
    ("ਕੋਈ ਗੱਲ ਨਹੀਂ ਜੀ", "pa", "en"): "You are most welcome!",
    ("ਕੋਈ ਗੱਲ ਨਹੀਂ", "pa", "en"): "No problem at all!",
    ("ਘਰ ਪਰਿਵਾਰ ਕਿਵੇਂ ਹੈ?", "pa", "en"): "How is the family?",
    ("ਘਰ ਪਰਿਵਾਰ ਕਿਵੇਂ ਹੈ", "pa", "en"): "How is the family?",
    ("ਸਭ ਕੁਝ ਠੀਕ-ਠਾਕ ਹੈ", "pa", "en"): "Everything is fine.",
    ("ਕੀ ਹੋਇਆ?", "pa", "en"): "What happened?",
    ("ਕੀ ਹੋਇਆ", "pa", "en"): "What happened?",
    ("ਮੇਰੀ ਗੱਲ ਸੁਣੋ", "pa", "en"): "Listen to me.",
    ("ਚਲੋ ਚੱਲੀਏ", "pa", "en"): "Let's go!",
    ("ਤੁਸੀਂ ਕੀ ਕਿਹਾ?", "pa", "en"): "What did you say?",
    ("ਤੁਸੀਂ ਕੀ ਕਿਹਾ", "pa", "en"): "What did you say?",
    ("ਮੈਂ ਸਮਝ ਗਿਆ", "pa", "en"): "I understand.",
    ("ਮੈਨੂੰ ਸਮਝ ਨਹੀਂ ਆਇਆ", "pa", "en"): "I did not understand.",
    ("ਰੋਟੀ ਖਾ ਲਵੋ", "pa", "en"): "Please have your meal.",
    ("ਚਾਹ ਪੀ ਲਵੋ", "pa", "en"): "Please have some tea.",
    ("ਤੁਸੀਂ ਕਿੱਥੇ ਜਾ ਰਹੇ ਹੋ?", "pa", "en"): "Where are you going?",
    ("ਤੁਸੀਂ ਕਿੱਥੇ ਜਾ ਰਹੇ ਹੋ", "pa", "en"): "Where are you going?",
    ("ਤੁਸੀਂ ਕੀ ਕਰ ਰਹੇ ਹੋ?", "pa", "en"): "What are you doing?",
    ("ਤੁਸੀਂ ਕੀ ਕਰ ਰਹੇ ਹੋ", "pa", "en"): "What are you doing?",
    ("ਮੈਨੂੰ ਪੰਜਾਬੀ ਸਿੱਖਣ ਦਾ ਆਨੰਦ ਆ ਰਿਹਾ ਹੈ।", "pa", "en"): "I'm enjoying learning Punjabi.",
    ("ਮੈਨੂੰ ਪੰਜਾਬੀ ਸਿੱਖਣ ਦਾ ਆਨੰਦ ਆ ਰਿਹਾ ਹੈ", "pa", "en"): "I'm enjoying learning Punjabi.",
    ("ਅਲਵਿਦਾ", "pa", "en"): "Goodbye!",
    ("ਫਿਰ ਮਿਲਦੇ ਹਾਂ", "pa", "en"): "See you later!",
    ("ਫਿਰ ਮਿਲਾਂਗੇ", "pa", "en"): "See you again!",

    # English -> Punjabi
    ("hello", "en", "pa"): "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
    ("hi", "en", "pa"): "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
    ("hey", "en", "pa"): "ਹੈਲੋ",
    ("hello bro, how are you?", "en", "pa"): "ਹੈਲੋ ਵੀਰੇ, ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?",
    ("hello bro, how are you", "en", "pa"): "ਹੈਲੋ ਵੀਰੇ, ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?",
    ("hello bro", "en", "pa"): "ਹੈਲੋ ਵੀਰੇ",
    ("hello, how are you?", "en", "pa"): "ਹੈਲੋ, ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?",
    ("hello, how are you", "en", "pa"): "ਹੈਲੋ, ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?",
    ("how are you?", "en", "pa"): "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?",
    ("how are you", "en", "pa"): "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?",
    ("how are you doing today?", "en", "pa"): "ਅੱਜ ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?",
    ("how are you doing today", "en", "pa"): "ਅੱਜ ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?",
    ("what are you doing?", "en", "pa"): "ਤੁਸੀਂ ਕੀ ਕਰ ਰਹੇ ਹੋ?",
    ("what are you doing", "en", "pa"): "ਤੁਸੀਂ ਕੀ ਕਰ ਰਹੇ ਹੋ?",
    ("where are you going?", "en", "pa"): "ਤੁਸੀਂ ਕਿੱਥੇ ਜਾ ਰਹੇ ਹੋ?",
    ("where are you going", "en", "pa"): "ਤੁਸੀਂ ਕਿੱਥੇ ਜਾ ਰਹੇ ਹੋ?",
    ("i am doing great, thank you!", "en", "pa"): "ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ, ਧੰਨਵਾਦ!",
    ("i am doing great, thank you", "en", "pa"): "ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ, ਧੰਨਵਾਦ!",
    ("i am doing great", "en", "pa"): "ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ।",
    ("i am fine, thank you", "en", "pa"): "ਮੈਂ ਠੀਕ ਹਾਂ, ਧੰਨਵਾਦ!",
    ("i am fine", "en", "pa"): "ਮੈਂ ਠੀਕ ਹਾਂ।",
    ("what is your name?", "en", "pa"): "ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ?",
    ("what is your name", "en", "pa"): "ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ?",
    ("hello, my name is vivek.", "en", "pa"): "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਮੇਰਾ ਨਾਮ ਵਿਵੇਕ ਹੈ।",
    ("hello, my name is vivek", "en", "pa"): "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਮੇਰਾ ਨਾਮ ਵਿਵੇਕ ਹੈ।",
    ("my name is vivek.", "en", "pa"): "ਮੇਰਾ ਨਾਮ ਵਿਵੇਕ ਹੈ।",
    ("my name is vivek", "en", "pa"): "ਮੇਰਾ ਨਾਮ ਵਿਵੇਕ ਹੈ।",
    ("what are you eating?", "en", "pa"): "ਤੁਸੀਂ ਕੀ ਖਾ ਰਹੇ ਹੋ?",
    ("what are you eating", "en", "pa"): "ਤੁਸੀਂ ਕੀ ਖਾ ਰਹੇ ਹੋ?",
    ("where are you from?", "en", "pa"): "ਤੁਸੀਂ ਕਿੱਥੋਂ ਦੇ ਹੋ?",
    ("where are you from", "en", "pa"): "ਤੁਸੀਂ ਕਿੱਥੋਂ ਦੇ ਹੋ?",
    ("nice to meet you", "en", "pa"): "ਤੁਹਾਨੂੰ ਮਿਲ ਕੇ ਬਹੁਤ ਖੁਸ਼ੀ ਹੋਈ।",
    ("welcome", "en", "pa"): "ਜੀ ਆਇਆਂ ਨੂੰ",
    ("you are welcome", "en", "pa"): "ਕੋਈ ਗੱਲ ਨਹੀਂ ਜੀ",
    ("you're welcome", "en", "pa"): "ਕੋਈ ਗੱਲ ਨਹੀਂ ਜੀ",
    ("no problem", "en", "pa"): "ਕੋਈ ਗੱਲ ਨਹੀਂ",
    ("how is your family?", "en", "pa"): "ਘਰ ਪਰਿਵਾਰ ਕਿਵੇਂ ਹੈ?",
    ("how is your family", "en", "pa"): "ਘਰ ਪਰਿਵਾਰ ਕਿਵੇਂ ਹੈ?",
    ("everything is fine", "en", "pa"): "ਸਭ ਕੁਝ ਠੀਕ-ਠਾਕ ਹੈ",
    ("everything is good", "en", "pa"): "ਸਭ ਕੁਝ ਠੀਕ-ਠਾਕ ਹੈ",
    ("what happened?", "en", "pa"): "ਕੀ ਹੋਇਆ?",
    ("what happened", "en", "pa"): "ਕੀ ਹੋਇਆ?",
    ("listen to me", "en", "pa"): "ਮੇਰੀ ਗੱਲ ਸੁਣੋ",
    ("let's go", "en", "pa"): "ਚਲੋ ਚੱਲੀਏ",
    ("what did you say?", "en", "pa"): "ਤੁਸੀਂ ਕੀ ਕਿਹਾ?",
    ("what did you say", "en", "pa"): "ਤੁਸੀਂ ਕੀ ਕਿਹਾ?",
    ("i understand", "en", "pa"): "ਮੈਂ ਸਮਝ ਗਿਆ",
    ("i don't understand", "en", "pa"): "ਮੈਨੂੰ ਸਮਝ ਨਹੀਂ ਆਇਆ",
    ("i didn't understand", "en", "pa"): "ਮੈਨੂੰ ਸਮਝ ਨਹੀਂ ਆਇਆ",
    ("have your meal", "en", "pa"): "ਰੋਟੀ ਖਾ ਲਵੋ",
    ("have some tea", "en", "pa"): "ਚਾਹ ਪੀ ਲਵੋ",
    ("i'm enjoying learning punjabi.", "en", "pa"): "ਮੈਨੂੰ ਪੰਜਾਬੀ ਸਿੱਖਣ ਦਾ ਆਨੰਦ ਆ ਰਿਹਾ ਹੈ।",
    ("i'm enjoying learning punjabi", "en", "pa"): "ਮੈਨੂੰ ਪੰਜਾਬੀ ਸਿੱਖਣ ਦਾ ਆਨੰਦ ਆ ਰਿਹਾ ਹੈ।",
    ("i am enjoying learning punjabi.", "en", "pa"): "ਮੈਨੂੰ ਪੰਜਾਬੀ ਸਿੱਖਣ ਦਾ ਆਨੰਦ ਆ ਰਿਹਾ ਹੈ।",
    ("i am enjoying learning punjabi", "en", "pa"): "ਮੈਨੂੰ ਪੰਜਾਬੀ ਸਿੱਖਣ ਦਾ ਆਨੰਦ ਆ ਰਿਹਾ ਹੈ।",
    ("thank you", "en", "pa"): "ਧੰਨਵਾਦ!",
    ("thank you very much", "en", "pa"): "ਬਹੁਤ ਬਹੁਤ ਧੰਨਵਾਦ!",
    ("good morning", "en", "pa"): "ਸ਼ੁਭ ਸਵੇਰ",
    ("good night", "en", "pa"): "ਸ਼ੁਭ ਰਾਤਰੀ",
    ("see you later", "en", "pa"): "ਫਿਰ ਮਿਲਦੇ ਹਾਂ",
    ("take care", "en", "pa"): "ਆਪਣਾ ਖਿਆਲ ਰੱਖਣਾ",

    # English -> Hindi
    ("hello", "en", "hi"): "नमस्ते",
    ("hi", "en", "hi"): "नमस्ते",
    ("hey", "en", "hi"): "नमस्ते",
    ("hello bro, how are you?", "en", "hi"): "नमस्ते भाई, आप कैसे हैं?",
    ("hello bro, how are you", "en", "hi"): "नमस्ते भाई, आप कैसे हैं?",
    ("hello bro", "en", "hi"): "हेलो भाई",
    ("how are you?", "en", "hi"): "आप कैसे हैं?",
    ("how are you", "en", "hi"): "आप कैसे हैं?",
    ("what are you doing?", "en", "hi"): "आप क्या कर रहे हैं?",
    ("what are you doing", "en", "hi"): "आप क्या कर रहे हैं?",
    ("i am doing great, thank you!", "en", "hi"): "मैं बहुत अच्छा हूँ, धन्यवाद!",
    ("i am doing great, thank you", "en", "hi"): "मैं बहुत अच्छा हूँ, धन्यवाद!",
    ("i am fine", "en", "hi"): "मैं ठीक हूँ।",
    ("thank you", "en", "hi"): "धन्यवाद!",
    ("thank you very much", "en", "hi"): "बहुत बहुत धन्यवाद!",
    ("what is your name?", "en", "hi"): "आपका नाम क्या है?",
    ("what is your name", "en", "hi"): "आपका नाम क्या है?",

    # Hindi -> Punjabi
    ("नमस्ते", "hi", "pa"): "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
    ("हेलो", "hi", "pa"): "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ",
    ("नमस्ते भाई", "hi", "pa"): "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਵੀਰੇ",
    ("कैसे हो तुम?", "hi", "pa"): "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?",
    ("कैसे हो तुम", "hi", "pa"): "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?",
    ("आप कैसे हैं?", "hi", "pa"): "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?",
    ("आप कैसे हैं", "hi", "pa"): "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?",
    ("क्या हाल है भाई?", "hi", "pa"): "ਕੀ ਹਾਲ ਆ ਵੀਰੇ?",
    ("क्या हाल है भाई", "hi", "pa"): "ਕੀ ਹਾਲ ਆ ਵੀਰੇ?",
    ("क्या हाल है", "hi", "pa"): "ਕੀ ਹਾਲ ਹੈ?",
    ("क्या चल रहा है?", "hi", "pa"): "ਕੀ ਚੱਲ ਰਿਹਾ ਹੈ?",
    ("क्या चल रहा है", "hi", "pa"): "ਕੀ ਚੱਲ ਰਿਹਾ ਹੈ?",
    ("मैं ठीक हूँ", "hi", "pa"): "ਮੈਂ ਠੀਕ ਹਾਂ।",
    ("मैं बहुत अच्छा हूँ", "hi", "pa"): "ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ।",
    ("बहुत अच्छा", "hi", "pa"): "ਬਹੁਤ ਵਧੀਆ।",
    ("धन्यवाद", "hi", "pa"): "ਧੰਨਵਾਦ!",
    ("स्वागत है", "hi", "pa"): "ਜੀ ਆਇਆਂ ਨੂੰ",
    ("कोई बात नहीं", "hi", "pa"): "ਕੋਈ ਗੱਲ ਨਹੀਂ",
    ("घर परिवार कैसा है?", "hi", "pa"): "ਘਰ ਪਰਿਵਾਰ ਕਿਵੇਂ ਹੈ?",
    ("सब कुछ ठीक है", "hi", "pa"): "ਸਭ ਕੁਝ ਠੀਕ-ਠਾਕ ਹੈ",
    ("क्या हुआ?", "hi", "pa"): "ਕੀ ਹੋਇਆ?",
    ("मेरी बात सुनो", "hi", "pa"): "ਮੇਰੀ ਗੱਲ ਸੁਣੋ",
    ("चलो चलें", "hi", "pa"): "ਚਲੋ ਚੱਲੀਏ",
    ("तुम कहाँ जा रहे हो?", "hi", "pa"): "ਤੁਸੀਂ ਕਿੱਥੇ ਜਾ ਰਹੇ ਹੋ?",
    ("आप कहाँ जा रहे हैं?", "hi", "pa"): "ਤੁਸੀਂ ਕਿੱਥੇ ਜਾ ਰਹੇ ਹੋ?",
    ("खाना खा लो", "hi", "pa"): "ਰੋਟੀ ਖਾ ਲਵੋ",
    ("चाय पी लो", "hi", "pa"): "ਚਾਹ ਪੀ ਲਵੋ",
    ("आपका नाम क्या है?", "hi", "pa"): "ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ?",
    ("आपका नाम क्या है", "hi", "pa"): "ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ?",

    # Punjabi -> Hindi
    ("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ", "pa", "hi"): "नमस्ते",
    ("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਵੀਰੇ", "pa", "hi"): "नमस्ते भाई",
    ("ਕੀ ਹਾਲ ਆ ਵੀਰੇ", "pa", "hi"): "क्या हाल है भाई?",
    ("ਕੀ ਹਾਲ ਹੈ", "pa", "hi"): "क्या हाल है?",
    ("ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ", "pa", "hi"): "आप कैसे हैं?",
    ("ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?", "pa", "hi"): "आप कैसे हैं?",
    ("ਮੈਂ ਠੀਕ ਹਾਂ", "pa", "hi"): "मैं ठीक हूँ।",
    ("ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ", "pa", "hi"): "मैं बहुत अच्छा हूँ।",
    ("ਧੰਨਵਾਦ", "pa", "hi"): "धन्यवाद!",
    ("ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ?", "pa", "hi"): "आपका नाम क्या है?",
    ("ਤੁਹਾਡਾ ਨਾਮ ਕੀ ਹੈ", "pa", "hi"): "आपका नाम क्या है?",
}

_TRANSLATION_CACHE: dict[str, dict] = {}

_CONSONANTS_DEVA = {
    'ksh': 'क्ष', 'gy': 'ज्ञ', 'tr': 'त्र', 'sh': 'श',
    'kh': 'ख', 'gh': 'घ', 'chh': 'छ', 'jh': 'झ',
    'th': 'थ', 'dh': 'ध', 'ph': 'फ', 'bh': 'भ',
    'k': 'क', 'g': 'ग', 'ch': 'च', 'j': 'ज',
    't': 'त', 'd': 'द', 'n': 'न', 'p': 'प',
    'f': 'फ़', 'b': 'ब', 'm': 'म', 'y': 'य',
    'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
    's': 'स', 'h': 'ह', 'z': 'ज़', 'q': 'क़'
}

_VOWELS_INIT_DEVA = {
    'aa': 'आ', 'ee': 'ई', 'oo': 'ऊ', 'ai': 'ऐ', 'au': 'औ',
    'a': 'अ', 'i': 'इ', 'u': 'उ', 'e': 'ए', 'o': 'ओ'
}

_MATRAS_DEVA = {
    'aa': 'ा', 'ee': 'ी', 'oo': 'ू', 'ai': 'ै', 'au': 'ौ',
    'a': '', 'i': 'ि', 'u': 'ु', 'e': 'े', 'o': 'ो'
}


def _phonetic_word_to_deva(word: str) -> str:
    """Fallback phonetic transliteration for any unknown romanized word."""
    low = word.lower()
    if low in _HINGLISH_WORD_MAP:
        return _HINGLISH_WORD_MAP[low]

    res = []
    i = 0
    n = len(low)
    first = True

    while i < n:
        matched = False
        if first:
            for v, dv in _VOWELS_INIT_DEVA.items():
                if low.startswith(v, i):
                    res.append(dv)
                    i += len(v)
                    first = False
                    matched = True
                    break
            if matched:
                continue

        for c, dc in _CONSONANTS_DEVA.items():
            if low.startswith(c, i):
                res.append(dc)
                i += len(c)
                first = False
                matched = True

                v_matched = False
                for v, mv in _MATRAS_DEVA.items():
                    if low.startswith(v, i):
                        res.append(mv)
                        i += len(v)
                        v_matched = True
                        break
                if not v_matched and i < n and low[i].isalpha() and low[i] in _CONSONANTS_DEVA:
                    res.append('्')
                break

        if not matched:
            res.append(low[i])
            i += 1
            first = False

    return "".join(res)


def _roman_hindi_to_deva(text: str) -> str:
    """Convert conversational Romanized Hindi into native Devanagari script."""
    clean_key = re.sub(r"[^\w\s]", "", text.lower()).strip()
    for hk, dv in _HINGLISH_TO_DEVA.items():
        if clean_key == hk or clean_key.startswith(hk + " ") or clean_key.endswith(" " + hk):
            return dv

    # Word-level replacement with phonetic fallback
    def repl(m: re.Match) -> str:
        w = m.group(0)
        return _phonetic_word_to_deva(w)

    replaced = re.sub(r"\b[a-zA-Z]+\b", repl, text)
    return replaced


def translate_text(
    text: str,
    source_lang: str,
    target_lang: str,
    tone: Optional[str] = None,
) -> dict:
    """
    Translate *text* from *source_lang* to *target_lang*.
    Automatically splits multi-sentence inputs to preserve full accuracy and meaning.
    """
    if not text or not text.strip():
        return {
            "translated_text": "",
            "source_lang": source_lang,
            "target_lang": target_lang,
            "alternatives": [],
            "is_fallback": False,
        }

    if source_lang == target_lang:
        return {
            "translated_text": text,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "alternatives": [],
            "is_fallback": False,
        }

    # Sentence boundary splitting for long multi-sentence speech/text
    # Prevents seq2seq models from dropping earlier sentences or questions
    sentence_chunks = [s.strip() for s in re.split(r"(?<=[.?!।॥\n])\s+", text.strip()) if s.strip()]
    if len(sentence_chunks) > 1:
        translated_parts = []
        for chunk in sentence_chunks:
            res = _translate_single(chunk, source_lang, target_lang, tone=tone)
            translated_parts.append(res["translated_text"])
        return {
            "translated_text": " ".join(translated_parts),
            "source_lang": source_lang,
            "target_lang": target_lang,
            "alternatives": [],
            "is_fallback": False,
        }

    return _translate_single(text, source_lang, target_lang, tone=tone)


def _translate_single(
    text: str,
    source_lang: str,
    target_lang: str,
    tone: Optional[str] = None,
) -> dict:
    """Translate a single sentence chunk."""
    # Detect tone of input
    detected_tone = detect_tone(text, source_lang)

    # If source is Hindi and text is written in Latin (Hinglish), normalize to Devanagari
    if source_lang == "hi" and not re.search(r"[\u0900-\u097f]", text):
        text = _roman_hindi_to_deva(text)
    # If source is Punjabi and text is written in Latin (Punjlish), normalize to Gurmukhi
    elif source_lang == "pa" and not re.search(r"[\u0a00-\u0a7f]", text):
        text = _roman_punjabi_to_guru(text)

    clean_low = text.strip().lower()

    # Fast in-memory cache lookup
    cache_key = f"{clean_low}|{source_lang}|{target_lang}|{tone or detected_tone}"
    if cache_key in _TRANSLATION_CACHE:
        return _TRANSLATION_CACHE[cache_key].copy()

    # High-accuracy conversational idiom lookup
    conv_key = (clean_low, source_lang, target_lang)
    stripped_clean = clean_low.rstrip(".!?,; ")
    stripped_key = (stripped_clean, source_lang, target_lang)

    matched_conv = _CONVERSATIONAL_MAP.get(conv_key) or _CONVERSATIONAL_MAP.get(stripped_key)
    if matched_conv:
        modulated = apply_tone_modulation(matched_conv, target_lang, tone)
        res = {
            "translated_text": modulated,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "alternatives": [],
            "detected_tone": detected_tone,
            "is_fallback": False,
        }
        _TRANSLATION_CACHE[cache_key] = res
        return res

    src_nllb = nllb_code_for(source_lang)
    tgt_nllb = nllb_code_for(target_lang)

    if src_nllb is None:
        logger.warning("Unknown source language code: %s", source_lang)
        src_nllb = "eng_Latn"
    if tgt_nllb is None:
        logger.warning("Unknown target language code: %s", target_lang)
        tgt_nllb = "eng_Latn"

    model, tokenizer = model_manager.get_nllb()

    if model is None or tokenizer is None:
        logger.info("NLLB model unavailable – using demo fallback for translation.")
        fallback_res = _fallback_translate(text, source_lang, target_lang)
        fallback_res["detected_tone"] = detected_tone
        return fallback_res

    try:
        import torch

        with _nllb_lock:
            tokenizer.src_lang = src_nllb
            inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)

            # Fast dynamic token budget
            char_len = len(text)
            words_count = len(text.split())
            approx_words = max(words_count, int(char_len / 2.5))
            if words_count <= 4:
                max_new_tokens = min(approx_words * 2 + 10, 32)
            else:
                max_new_tokens = min(max(approx_words * 3 + 24, 48), 512)

            device = model_manager.device
            if device == "cuda":
                inputs = {k: v.to("cuda") for k, v in inputs.items()}
                num_beams = 4
            else:
                # High speed inference on CPU: 1 beam for conversational phrases (<= 25 words)
                num_beams = 1 if words_count <= 25 else 2

            tgt_lang_id = tokenizer.convert_tokens_to_ids(tgt_nllb)

            with torch.no_grad():
                generated = model.generate(
                    **inputs,
                    forced_bos_token_id=tgt_lang_id,
                    max_new_tokens=max_new_tokens,
                    num_beams=num_beams,
                    early_stopping=True,
                    no_repeat_ngram_size=3,
                    repetition_penalty=1.1,
                    num_return_sequences=1,
                )

            translated = tokenizer.batch_decode(generated, skip_special_tokens=True)
            main_translation = translated[0] if translated else text

            # Apply human tone modulation (formal/casual)
            main_translation = apply_tone_modulation(main_translation, target_lang, tone or detected_tone)

            # Generate alternatives on CUDA or fast environment
            alternatives: list[str] = []
            if device == "cuda":
                try:
                    with torch.no_grad():
                        alt_generated = model.generate(
                            **inputs,
                            forced_bos_token_id=tgt_lang_id,
                            max_new_tokens=max_new_tokens,
                            num_beams=4,
                            early_stopping=True,
                            no_repeat_ngram_size=3,
                            num_return_sequences=2,
                        )
                    alt_texts = tokenizer.batch_decode(alt_generated, skip_special_tokens=True)
                    alternatives = [t for t in alt_texts if t != main_translation][:2]
                except Exception:
                    pass

        result_dict = {
            "translated_text": main_translation,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "alternatives": alternatives,
            "detected_tone": detected_tone,
            "is_fallback": False,
        }
        _TRANSLATION_CACHE[cache_key] = result_dict
        return result_dict

    except Exception as exc:
        logger.error("NLLB translation failed: %s", exc, exc_info=True)
        return _fallback_translate(text, source_lang, target_lang)


def translate_batch(
    texts: list[str],
    source_lang: str,
    target_lang: str,
) -> list[dict]:
    """Translate a list of texts, returning a list of result dicts."""
    return [translate_text(text, source_lang, target_lang) for text in texts]


def _fallback_translate(text: str, source_lang: str, target_lang: str) -> dict:
    """
    Demo fallback: returns the original text with a marker indicating
    the model is not loaded.
    """
    src_name = get_language(source_lang)
    tgt_name = get_language(target_lang)
    src_label = src_name.name if src_name else source_lang
    tgt_label = tgt_name.name if tgt_name else target_lang
    demo_text = f"[{src_label}→{tgt_label}] {text}"
    return {
        "translated_text": demo_text,
        "source_lang": source_lang,
        "target_lang": target_lang,
        "alternatives": [],
        "is_fallback": True,
    }
