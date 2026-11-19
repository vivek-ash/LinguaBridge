"""
Seed demo data into LinguaBridge SQLite database.
"""

import sqlite3
import random
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "linguabridge.db"

DEMO_TRANSLATIONS = [
    ("Hello, how are you?", "नमस्ते, आप कैसे हैं?", "en", "hi"),
    ("What is your name?", "आपका नाम क्या है?", "en", "hi"),
    ("Thank you very much", "बहुत-बहुत धन्यवाद", "en", "hi"),
    ("Good morning", "सुप्रभात", "en", "hi"),
    ("I love programming", "मुझे प्रोग्रामिंग पसंद है", "en", "hi"),
    ("The weather is beautiful today", "ਅੱਜ ਮੌਸਮ ਬਹੁਤ ਸੋਹਣਾ ਹੈ", "en", "pa"),
    ("How much does this cost?", "ਇਸਦੀ ਕੀਮਤ ਕੀ ਹੈ?", "en", "pa"),
    ("Where is the train station?", "Où est la gare ?", "en", "fr"),
    ("I would like a coffee please", "Ich hätte gerne einen Kaffee bitte", "en", "de"),
    ("The book is on the table", "El libro está sobre la mesa", "en", "es"),
    ("Machine learning is fascinating", "机器学习很有趣", "en", "zh"),
    ("Let's meet at the park tomorrow", "明日公園で会いましょう", "en", "ja"),
    ("This is a beautiful city", "이것은 아름다운 도시입니다", "en", "ko"),
    ("Peace be upon you", "السلام عليكم", "en", "ar"),
    ("Life is short, art is long", "Жизнь коротка, искусство вечно", "en", "ru"),
    ("Knowledge is power", "ज्ञान ही शक्ति है", "en", "hi"),
    ("The sun rises in the east", "சூரியன் கிழக்கில் உதிக்கிறது", "en", "ta"),
    ("Water is life", "నీరు జీవితం", "en", "te"),
    ("Education is the best investment", "শিক্ষা সর্বোত্তম বিনিয়োগ", "en", "bn"),
    ("Unity is strength", "एकता में बल है", "en", "hi"),
]

GLOSSARY_ENTRIES = [
    ("machine learning", "मशीन लर्निंग", "en", "hi"),
    ("artificial intelligence", "कृत्रिम बुद्धिमत्ता", "en", "hi"),
    ("neural network", "तंत्रिका नेटवर्क", "en", "hi"),
    ("deep learning", "गहन शिक्षण", "en", "hi"),
    ("natural language processing", "प्राकृतिक भाषा प्रसंस्करण", "en", "hi"),
    ("computer vision", "कंप्यूटर दृष्टि", "en", "hi"),
    ("open source", "ਓਪਨ ਸੋਰਸ", "en", "pa"),
    ("algorithm", "ਐਲਗੋਰਿਦਮ", "en", "pa"),
]

def seed():
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    # Ensure tables exist
    cur.execute("""
    CREATE TABLE IF NOT EXISTS translation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_text TEXT NOT NULL,
        target_text TEXT NOT NULL,
        source_lang VARCHAR(10) NOT NULL,
        target_lang VARCHAR(10) NOT NULL,
        detected_lang VARCHAR(10),
        confidence FLOAT,
        is_favorite BOOLEAN NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS glossary_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_term VARCHAR(500) NOT NULL,
        target_term VARCHAR(500) NOT NULL,
        source_lang VARCHAR(10) NOT NULL,
        target_lang VARCHAR(10) NOT NULL,
        created_at TIMESTAMP NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type VARCHAR(50) NOT NULL,
        source_lang VARCHAR(10),
        target_lang VARCHAR(10),
        char_count INTEGER NOT NULL DEFAULT 0,
        latency_ms FLOAT NOT NULL DEFAULT 0.0,
        created_at TIMESTAMP NOT NULL
    )
    """)

    cur.execute("SELECT count(*) FROM translation_history")
    count = cur.fetchone()[0]
    if count > 0:
        print(f"Database already has {count} entries. Skipping seed.")
        conn.close()
        return

    print("Seeding translation history...")
    for i, (src, tgt, sl, tl) in enumerate(DEMO_TRANSLATIONS):
        days_ago = random.randint(0, 29)
        dt = (datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23))).isoformat()
        cur.execute("""
        INSERT INTO translation_history 
        (source_text, target_text, source_lang, target_lang, detected_lang, confidence, is_favorite, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (src, tgt, sl, tl, sl, round(random.uniform(0.85, 0.99), 4), 1 if i < 5 else 0, dt))

    print("Seeding glossary entries...")
    for src, tgt, sl, tl in GLOSSARY_ENTRIES:
        dt = datetime.utcnow().isoformat()
        cur.execute("""
        INSERT INTO glossary_entries (source_term, target_term, source_lang, target_lang, created_at)
        VALUES (?, ?, ?, ?, ?)
        """, (src, tgt, sl, tl, dt))

    print("Seeding usage logs...")
    actions = ["translate", "detect", "voice", "document", "video"]
    langs = ["en", "hi", "pa", "fr", "de", "es", "zh", "ja", "ta", "te"]
    for _ in range(100):
        days_ago = random.randint(0, 29)
        dt = (datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23))).isoformat()
        cur.execute("""
        INSERT INTO usage_logs (action_type, source_lang, target_lang, char_count, latency_ms, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            random.choice(actions),
            random.choice(langs),
            random.choice(langs),
            random.randint(10, 500),
            round(random.uniform(50, 2000), 1),
            dt
        ))

    conn.commit()
    conn.close()
    print("Database seeded successfully with demo data!")

if __name__ == "__main__":
    seed()
