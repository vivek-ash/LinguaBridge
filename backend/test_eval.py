import sys
from app.services.translation import translate_text
from app.services.detection import detect_language

tests = [
    ("Hola, ¿cómo estás?", "es", "en"),
    ("Bonjour, comment allez-vous?", "fr", "en"),
    ("Guten Tag, wie geht es Ihnen?", "de", "en"),
    ("Hello, how are you?", "en", "es"),
    ("Hello, how are you?", "en", "fr"),
    ("Hello, how are you?", "en", "de"),
    ("Hello, how are you?", "en", "ja"),
    ("Hello, how are you?", "en", "zh"),
    ("Hello, how are you?", "en", "ar"),
    ("Hello, how are you?", "en", "ta"),
    ("Hello, how are you?", "en", "pa"),
    ("Hello, how are you?", "en", "hi"),
    ("नमस्ते, आप कैसे हैं?", "hi", "en"),
]

print("=== TRANSLATION QUALITY TEST ===")
for text, src, tgt in tests:
    res = translate_text(text, src, tgt)
    out = res.get("translated_text", "")
    print(f"[{src} -> {tgt}] {text} ===> {out}")

print("\n=== LANGUAGE DETECTION TEST ===")
detect_samples = [
    ("Hello, how are you?", "en"),
    ("Hola, ¿cómo estás?", "es"),
    ("Bonjour, comment allez-vous?", "fr"),
    ("Guten Tag, wie geht es Ihnen?", "de"),
    ("Ciao, come stai?", "it"),
    ("Olá, como você está?", "pt"),
    ("नमस्ते, आप कैसे हैं?", "hi"),
    ("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?", "pa"),
    ("வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?", "ta"),
    ("مرحبا كيف حالك", "ar"),
    ("Привет, как дела?", "ru"),
    ("こんにちは、お元気ですか？", "ja"),
    ("你好，你好吗？", "zh"),
]

for text, expected in detect_samples:
    det = detect_language(text)
    lang = det.get("language")
    conf = det.get("confidence")
    status = "✅ PASS" if lang == expected else f"❌ FAIL (got {lang})"
    print(f"{status:20s} Expected: {expected:5s} Detected: {lang:5s} ({conf:.2f}) | {text}")
