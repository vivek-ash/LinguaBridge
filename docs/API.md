# LinguaBridge API Reference

## Base URL

```
http://localhost:8000
```

## Authentication

No authentication required (open API for development).

---

## System

### Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "models": {
    "nllb": false,
    "whisper": false,
    "fasttext": false
  }
}
```

---

## Translation

### Translate Text

```
POST /api/translate
```

**Request Body:**
```json
{
  "text": "Hello, how are you?",
  "source_lang": "en",
  "target_lang": "hi",
  "tone": "formal"
}
```

**Response:**
```json
{
  "translated_text": "नमस्ते, आप कैसे हैं?",
  "source_lang": "en",
  "target_lang": "hi",
  "detected_lang": null,
  "confidence": null,
  "alternatives": [],
  "is_fallback": false,
  "latency_ms": 245
}
```

### Detect Language

```
POST /api/detect
```

**Request Body:**
```json
{
  "text": "Bonjour le monde"
}
```

**Response:**
```json
{
  "language": "fr",
  "confidence": 0.97,
  "top_predictions": [
    {"language": "fr", "confidence": 0.97},
    {"language": "it", "confidence": 0.01},
    {"language": "es", "confidence": 0.01}
  ]
}
```

### List Languages

```
GET /api/languages
```

Returns an array of 63 supported languages.

**Response:**
```json
[
  {
    "code": "en",
    "name": "English",
    "native_name": "English",
    "flag": "🇺🇸",
    "rtl": false,
    "nllb_code": "eng_Latn"
  },
  {
    "code": "hi",
    "name": "Hindi",
    "native_name": "हिन्दी",
    "flag": "🇮🇳",
    "rtl": false,
    "nllb_code": "hin_Deva"
  }
]
```

### Search Languages

```
GET /api/languages/search?q=hindi
```

---

## Voice (WebSocket)

### Real-Time Voice Translation

```
WS /ws/voice
```

**Connect:** The server sends a status message on connection.

**Client → Server:**
```json
{
  "type": "audio",
  "data": "<base64 encoded PCM16 audio>",
  "source_lang": "en",
  "target_lang": "hi"
}
```

**Server → Client:**
```json
{
  "type": "final",
  "text": "Hello world",
  "translated_text": "नमस्ते दुनिया",
  "language": "en",
  "confidence": 0.95,
  "latency_ms": 1200
}
```

---

## Video

### Upload Video

```
POST /api/video/upload
Content-Type: multipart/form-data
```

**Form Fields:**
- `file` — Video file (mp4/webm/mov)
- `source_lang` — Source language code
- `target_lang` — Target language code
- `sign_language` — Sign language type (`asl` or `isl`)

**Response:**
```json
{
  "job_id": "abc123-...",
  "status": "processing"
}
```

### Check Status

```
GET /api/video/status/{job_id}
```

### Get Result

```
GET /api/video/result/{job_id}
```

### Export Subtitles

```
GET /api/video/export/{job_id}/{format}
```

Formats: `srt`, `vtt`, `transcript`

---

## Documents

### Translate Document

```
POST /api/documents/translate
Content-Type: multipart/form-data
```

**Form Fields:**
- `file` — Document (PDF/DOCX/TXT)
- `source_lang` — Source language code
- `target_lang` — Target language code

---

## History

### List History

```
GET /api/history?skip=0&limit=50
```

### Save Translation

```
POST /api/history
```

### Delete Entry

```
DELETE /api/history/{id}
```

### Toggle Favorite

```
POST /api/history/{id}/favorite
```

### List Favorites

```
GET /api/history/favorites
```

---

## Glossary

### List Glossary

```
GET /api/glossary
```

### Add Entry

```
POST /api/glossary
```

**Request Body:**
```json
{
  "source_term": "API",
  "target_term": "एपीआई",
  "source_lang": "en",
  "target_lang": "hi"
}
```

### Delete Entry

```
DELETE /api/glossary/{id}
```

---

## Analytics

### Usage Summary

```
GET /api/analytics/summary
```

### Top Languages

```
GET /api/analytics/languages
```

### Daily Usage

```
GET /api/analytics/daily?days=30
```
