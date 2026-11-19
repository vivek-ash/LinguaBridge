import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

// ── Gurmukhi Punjabi to Devanagari & Roman Phonetic Transliteration Engine ──
// Ensures 100% natural, fluent Indian pronunciation for Punjabi text on any system
// without requiring specialized OS Punjabi voice packs.
const GURU_TO_DEVA_MAP: Record<string, string> = {
  'ੳ': 'उ', 'ਅ': 'अ', 'ੲ': 'इ', 'ਸ': 'स', 'ਹ': 'ह',
  'ਕ': 'क', 'ਖ': 'ख', 'ਗ': 'ग', 'ਘ': 'घ', 'ਙ': 'ङ',
  'ਚ': 'च', 'ਛ': 'छ', 'ਜ': 'ज', 'ਝ': 'झ', 'ਞ': 'ञ',
  'ਟ': 'ट', 'ਠ': 'ठ', 'ਡ': 'ड', 'ਢ': 'ढ', 'ਣ': 'ण',
  'ਤ': 'त', 'ਥ': 'थ', 'ਦ': 'द', 'ਧ': 'ध', 'ਨ': 'न',
  'ਪ': 'प', 'ਫ': 'फ', 'ਬ': 'ब', 'ਭ': 'भ', 'ਮ': 'म',
  'ਯ': 'य', 'ਰ': 'र', 'ਲ': 'ल', 'ਵ': 'व', 'ੜ': 'ड़',
  'ਸ਼': 'श', 'ਜ਼': 'ज़', 'ਫ਼': 'फ़', 'ਖ਼': 'ख़', 'ਗ਼': 'ग़',
  'ਾ': 'ा', 'ਿ': 'ि', 'ੀ': 'ी', 'ੁ': 'ु', 'ੂ': 'ू',
  'ੇ': 'े', 'ੈ': 'ै', 'ੋ': 'ो', 'ੌ': 'ौ',
  'ੰ': 'ं', 'ਂ': 'ं', '੍': '्', '਼': '़',
  'ਆ': 'आ', 'ਇ': 'इ', 'ਈ': 'ई', 'ਉ': 'उ', 'ਊ': 'ऊ', 'ਏ': 'ए', 'ਐ': 'ऐ', 'ਓ': 'ओ', 'ਔ': 'औ',
  '੦': '०', '੧': '१', '੨': '२', '੩': '३', '੪': '४',
  '੫': '५', '੬': '६', '੭': '७', '੮': '८', '੯': '९'
};

// High-frequency colloquial phrase mapping for fluent Devanagari spoken rendering
const GURU_PHRASE_DEVA_MAP: Record<string, string> = {
  'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ, ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ?': 'सत श्री अकाल जी, तुहाडा की हाल है?',
  'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ, ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ': 'सत श्री अकाल जी, तुहाडा की हाल है',
  'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ': 'सत श्री अकाल जी',
  'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਵੀਰੇ': 'सत श्री अकाल वीरे',
  'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ': 'सत श्री अकाल',
  'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?': 'तुस्सी किवें हो?',
  'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ': 'तुस्सी किवें हो',
  'ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ?': 'तुहाडा की हाल है?',
  'ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ': 'तुहाडा की हाल है',
  'ਕੀ ਹਾਲ ਆ ਵੀਰੇ': 'की हाल आ वीरे',
  'ਕੀ ਹਾਲ ਹੈ ਵੀਰੇ': 'की हाल है वीरे',
  'ਕੀ ਹਾਲ ਆ': 'की हाल आ',
  'ਕੀ ਹਾਲ ਹੈ': 'की हाल है',
  'ਕਿਵੇਂ ਓ ਵੀਰੇ': 'किवें ओ वीरे',
  'ਕਿਵੇਂ ਓ ਯਾਰ': 'किवें ओ यार',
  'ਮੈਂ ਠੀਕ ਹਾਂ': 'मैं ठीक हाँ',
  'ਮੈਂ ਬਿਲਕੁਲ ਠੀਕ ਹਾਂ': 'मैं बिल्कुल ठीक हाँ',
  'ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ, ਧੰਨਵਾਦ!': 'मैं बहुत वधिया हाँ, धन्नवाद!',
  'ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ, ਧੰਨਵਾਦ': 'मैं बहुत वधिया हाँ, धन्नवाद',
  'ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ': 'मैं बहुत वधिया हाँ',
  'ਬਹੁਤ ਵਧੀਆ': 'बहुत वधिया',
  'ਬਹੁਤ ਬਹੁਤ ਧੰਨਵਾਦ': 'बहुत बहुत धन्नवाद',
  'ਧੰਨਵਾਦ': 'धन्नवाद',
  'ਹੈਲੋ ਵੀਰੇ, ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?': 'हेलो वीरे, तुस्सी किवें हो?',
  'ਹੈਲੋ ਵੀਰੇ': 'हेलो वीरे',
  'ਹੈਲੋ ਭਰਾ': 'हेलो भरा',
  'ਫਿਰ ਮਿਲਦੇ ਹਾਂ': 'फिर मिलदे हाँ',
  'ਆਪਣਾ ਖਿਆਲ ਰੱਖਣਾ': 'अपना खियाल रखना',
  'ਜੀ ਆਇਆਂ ਨੂੰ': 'जी आयां नूं',
  'ਕੋਈ ਗੱਲ ਨਹੀਂ ਜੀ': 'कोई गल्ल नहीं जी',
  'ਕੋਈ ਗੱਲ ਨਹੀਂ': 'कोई गल्ल नहीं',
  'ਚਲੋ ਚੱਲੀਏ': 'चलो चल्लिए',
  'ਤੁਹਾਨੂੰ ਮਿਲ ਕੇ ਬਹੁਤ ਖੁਸ਼ੀ ਹੋਈ': 'तुहानूं मिल के बहुत खुशी होई',
  'ਕੀ ਹੋਇਆ?': 'की होया?',
  'ਕੀ ਹੋਇਆ': 'की होया',
  'ਮੇਰੀ ਗੱਲ ਸੁਣੋ': 'मेरी गल्ल सुणो',
  'ਸਭ ਕੁਝ ਠੀਕ-ਠਾਕ ਹੈ': 'सभ कुछ ठीक-ठाक है',
  'ਘਰ ਪਰਿਵਾਰ ਕਿਵੇਂ ਹੈ?': 'घर परिवार किवें है?',
  'ਘਰ ਪਰਿਵਾਰ ਕਿਵੇਂ ਹੈ': 'घर परिवार किवें है',
};

// Word-level phonetic dictionary ensuring pure, fluent, natural Punjabi pronunciation
// instead of robotic character-by-character syllable breaks
const GURU_WORD_DEVA_MAP: Record<string, string> = {
  'ਵਧੀਆ': 'वधिया',
  'ਵਧੀਆਂ': 'वधियां',
  'ਤੁਸੀਂ': 'तुस्सी',
  'ਤੁਸਾਂ': 'तुसां',
  'ਤੁਹਾਡਾ': 'तुहाडा',
  'ਤੁਹਾਡੀ': 'तुहाडी',
  'ਤੁਹਾਡੇ': 'तुहाडे',
  'ਤੁਹਾਨੂੰ': 'तुहानूं',
  'ਮੈਨੂੰ': 'मैनूं',
  'ਤੈਨੂੰ': 'तैनूं',
  'ਸਾਨੂੰ': 'सानूं',
  'ਉਹਨਾਂ': 'ओहनां',
  'ਉਹਨੂੰ': 'ओहनूं',
  'ਇਹਨਾਂ': 'इहनां',
  'ਇਹਨੂੰ': 'इहनूं',
  'ਕਿਵੇਂ': 'किवें',
  'ਕਿੱਥੇ': 'कित्थे',
  'ਕਿੱਧਰ': 'किद्धर',
  'ਇੱਥੇ': 'इत्थे',
  'ਉੱਥੇ': 'उत्थे',
  'ਕੱਲ੍ਹ': 'कल्ल',
  'ਕੱਲ': 'कल्ल',
  'ਅੱਜ': 'अज्ज',
  'ਚੰਗਾ': 'चंगा',
  'ਚੰਗੀ': 'चंगी',
  'ਚੰਗੇ': 'चंगे',
  'ਧੰਨਵਾਦ': 'धन्नवाद',
  'ਗੱਲ': 'गल्ल',
  'ਗੱਲਾਂ': 'गल्लां',
  'ਸਿੱਖਣ': 'सिक्खण',
  'ਸਿੱਖਿਆ': 'सिक्खिया',
  'ਸਿੱਖ': 'सिक्ख',
  'ਵੀਰੇ': 'वीरे',
  'ਵੀਰ': 'वीर',
  'ਭਰਾ': 'भरा',
  'ਭੈਣ': 'भैण',
  'ਰਿਹਾ': 'रिहा',
  'ਰਹੀ': 'रही',
  'ਰਹੇ': 'रहे',
  'ਹੋਇਆ': 'होया',
  'ਹੋਈ': 'होई',
  'ਹੋਏ': 'होए',
  'ਗਿਆ': 'गया',
  'ਗਈ': 'गई',
  'ਗਏ': 'गए',
  'ਲਿਆ': 'लिया',
  'ਲਈ': 'लई',
  'ਲਏ': 'लए',
  'ਦਿੱਤਾ': 'दित्ता',
  'ਦਿੱਤੀ': 'दित्ती',
  'ਦਿੱਤੇ': 'दित्ते',
  'ਕੀਤਾ': 'कीता',
  'ਕੀਤੀ': 'कीती',
  'ਕੀਤੇ': 'कीते',
  'ਪਿਆ': 'पिया',
  'ਪਈ': 'पई',
  'ਪਏ': 'पए',
  'ਆਇਆ': 'आया',
  'ਆਈ': 'आई',
  'ਆਏ': 'आए',
  'ਬੈਠਾ': 'बैठा',
  'ਬੈਠੀ': 'बैठी',
  'ਬੈਠੇ': 'बैठे',
  'ਉੱਠਿਆ': 'उठिया',
  'ਉੱਠੋ': 'उठो',
  'ਚੱਲਿਆ': 'चल्लिया',
  'ਚੱਲੋ': 'चल्लो',
  'ਚਲੋ': 'चलो',
  'ਚੱਲੀਏ': 'चल्लिए',
  'ਸੁਣੋ': 'सुणो',
  'ਦੱਸੋ': 'दस्सो',
  'ਦੱਸ': 'दस्स',
  'ਦੱਸਿਆ': 'दस्सिया',
  'ਵੇਖੋ': 'वेखो',
  'ਵੇਖ': 'वेख',
  'ਖਾਣਾ': 'खाणा',
  'ਪਾਣੀ': 'पाणी',
  'ਕੰਮ': 'कम्म',
  'ਹਾਂਜੀ': 'हाँजी',
  'ਸਤਿ': 'सत',
  'ਸ੍ਰੀ': 'श्री',
  'ਅਕਾਲ': 'अकाल',
  'ਆਨੰਦ': 'आनंद',
  'ਪੰਜਾਬੀ': 'पंजाबी',
};

export function guruToDevaPhonetic(text: string): string {
  const trimmed = text.trim();
  if (GURU_PHRASE_DEVA_MAP[trimmed]) return GURU_PHRASE_DEVA_MAP[trimmed];

  // Replace common phrase substrings first (longest match first)
  let working = text;
  for (const [guruPhrase, devaPhrase] of Object.entries(GURU_PHRASE_DEVA_MAP)) {
    if (working.includes(guruPhrase)) {
      working = working.replaceAll(guruPhrase, devaPhrase);
    }
  }

  // Pre-process common Gurmukhi phonetic contractions before character iteration:
  // e.g. 'ਸਤਿ ਸ੍ਰੀ' -> 'सत श्री' (avoids 'sati sri' robotic artifact)
  working = working.replaceAll('ਸਤਿ ਸ੍ਰੀ', 'सत श्री');
  working = working.replaceAll('ਸਤਿ ਸ਼੍ਰੀ', 'सत श्री');

  // Replace whole words that have dedicated phonetic spellings
  working = working.replace(/[\u0A00-\u0A7F]+/g, (match) => {
    if (GURU_WORD_DEVA_MAP[match]) {
      return GURU_WORD_DEVA_MAP[match];
    }
    // Handle phonetic suffix contractions:
    // e.g., '...ੀਆ' (\u0A40\u0A06) -> '...िया'
    let word = match;
    if (word.endsWith('ੀਆ')) {
      const base = word.slice(0, -2);
      return (GURU_WORD_DEVA_MAP[base] || guruToDevaRaw(base)) + 'िया';
    }
    if (word.endsWith('ੀਆ') || word.endsWith('ੀਆਂ')) {
      const base = word.slice(0, -3);
      return (GURU_WORD_DEVA_MAP[base] || guruToDevaRaw(base)) + 'ियां';
    }
    return guruToDevaRaw(word);
  });

  return working;
}

function guruToDevaRaw(text: string): string {
  let res = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    // Addak (ੱ) indicates gemination (doubling the next consonant in Devanagari)
    if (c === 'ੱ' && i + 1 < text.length) {
      const nxt = GURU_TO_DEVA_MAP[text[i + 1]] || text[i + 1];
      res += nxt + '्';
    } else {
      res += GURU_TO_DEVA_MAP[c] || c;
    }
  }
  return res;
}

const GURU_COMMON_PHRASES: Record<string, string> = {
  'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ, ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ?': 'Sat Sri Akal ji, tuhada ki haal hai?',
  'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ, ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ': 'Sat Sri Akal ji, tuhada ki haal hai',
  'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ': 'Sat Sri Akal ji',
  'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਵੀਰੇ': 'Sat Sri Akal veere',
  'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ': 'Sat Sri Akal',
  'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?': 'Tusi kive ho?',
  'ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ': 'Tusi kive ho',
  'ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ?': 'Tuhada ki haal hai?',
  'ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ': 'Tuhada ki haal hai',
  'ਕੀ ਹਾਲ ਆ ਵੀਰੇ': 'Ki haal aa veere',
  'ਕੀ ਹਾਲ ਹੈ ਵੀਰੇ': 'Ki haal hai veere',
  'ਕੀ ਹਾਲ ਆ': 'Ki haal aa',
  'ਕੀ ਹਾਲ ਹੈ': 'Ki haal hai',
  'ਕਿਵੇਂ ਓ ਵੀਰੇ': 'Kive o veere',
  'ਕਿਵੇਂ ਓ ਯਾਰ': 'Kive o yaar',
  'ਮੈਂ ਠੀਕ ਹਾਂ': 'Main theek haan',
  'ਮੈਂ ਬਿਲਕੁਲ ਠੀਕ ਹਾਂ': 'Main bilkul theek haan',
  'ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ, ਧੰਨਵਾਦ!': 'Main bahut vadiya haan, dhanvaad!',
  'ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ, ਧੰਨਵਾਦ': 'Main bahut vadiya haan, dhanvaad',
  'ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ, ਧੰਨਵਾਦ! ਮੈਨੂੰ ਪੰਜਾਬੀ ਸਿੱਖਣ ਦਾ ਆਨੰਦ ਆ ਰਿਹਾ ਹੈ।': 'Main bahut vadiya haan, dhanvaad! Mainu Punjabi sikhan da aanand aa reha hai.',
  'ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ, ਧੰਨਵਾਦ! ਮੈਨੂੰ ਪੰਜਾਬੀ ਸਿੱਖਣ ਦਾ ਆਨੰਦ ਆ ਰਿਹਾ ਹੈ': 'Main bahut vadiya haan, dhanvaad! Mainu Punjabi sikhan da aanand aa reha hai',
  'ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ': 'Main bahut vadiya haan',
  'ਬਹੁਤ ਵਧੀਆ': 'Bahut vadiya',
  'ਧੰਨਵਾਦ': 'Dhanvaad',
  'ਬਹੁਤ ਬਹੁਤ ਧੰਨਵਾਦ': 'Bahut bahut dhanvaad',
  'ਹੈਲੋ ਵੀਰੇ, ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?': 'Hello veere, tusi kive ho?',
  'ਹੈਲੋ ਵੀਰੇ': 'Hello veere',
  'ਹੈਲੋ ਭਰਾ': 'Hello bhra',
  'ਫਿਰ ਮਿਲਦੇ ਹਾਂ': 'Phir milde haan',
  'ਫਿਰ ਮਿਲਾਂਗੇ': 'Phir milange',
  'ਆਪਣਾ ਖਿਆਲ ਰੱਖਣਾ': 'Apna khyaal rakhna',
  'ਜੀ ਆਇਆਂ ਨੂੰ': 'Ji aayan nu',
  'ਕੋਈ ਗੱਲ ਨਹੀਂ ਜੀ': 'Koi gal nahi ji',
  'ਕੋਈ ਗੱਲ ਨਹੀਂ': 'Koi gal nahi',
  'ਚਲੋ ਚੱਲੀਏ': 'Chalo chaliye',
  'ਤੁਹਾਨੂੰ ਮਿਲ ਕੇ ਬਹੁਤ ਖੁਸ਼ੀ ਹੋਈ': 'Tuhanu mil ke bahut khushi hoyi',
  'ਕੀ ਹੋਇਆ?': 'Ki hoya?',
  'ਮੇਰੀ ਗੱਲ ਸੁਣੋ': 'Meri gal suno',
  'ਸਭ ਕੁਝ ਠੀਕ-ਠਾਕ ਹੈ': 'Sab kujh theek-thaak hai',
  'ਘਰ ਪਰਿਵਾਰ ਕਿਵੇਂ ਹੈ?': 'Ghar parivaar kive hai?',
  'ਤੁਸੀਂ ਕੀ ਕਰ ਰਹੇ ਹੋ?': 'Tusi ki kar rahe ho?',
  'ਤੁਸੀਂ ਕਿੱਥੇ ਜਾ ਰਹੇ ਹੋ?': 'Tusi kitthe ja rahe ho?',
};

const GURU_TO_ROMAN_WORD: Record<string, string> = {
  'ਵਧੀਆ': 'vadiya',
  'ਤੁਸੀਂ': 'tussi',
  'ਤੁਹਾਡਾ': 'tuhada',
  'ਤੁਹਾਡੀ': 'tuhadi',
  'ਤੁਹਾਡੇ': 'tuhade',
  'ਤੁਹਾਨੂੰ': 'tuhanu',
  'ਮੈਨੂੰ': 'mainu',
  'ਤੈਨੂੰ': 'tainu',
  'ਸਾਨੂੰ': 'sanu',
  'ਪੰਜਾਬੀ': 'punjabi',
  'ਸਿੱਖਣ': 'sikhan',
  'ਆਨੰਦ': 'aanand',
  'ਰਿਹਾ': 'reha',
  'ਰਹੀ': 'rahi',
  'ਰਹੇ': 'rahe',
  'ਧੰਨਵਾਦ': 'dhanvaad',
  'ਕਿਵੇਂ': 'kive',
  'ਕਿੱਥੇ': 'kitthe',
  'ਕਿੱਧਰ': 'kiddhar',
  'ਸਤਿ': 'sat',
  'ਸ੍ਰੀ': 'sri',
  'ਅਕਾਲ': 'akal',
  'ਵੀਰੇ': 'veere',
  'ਚਲੋ': 'chalo',
  'ਚੱਲੀਏ': 'chaliye',
  'ਹਾਂਜੀ': 'haanji',
};

const GURU_TO_ROMAN_CHAR: Record<string, string> = {
  'ੳ': 'u', 'ਅ': 'a', 'ੲ': 'i', 'ਸ': 's', 'ਹ': 'h',
  'ਕ': 'k', 'ਖ': 'kh', 'ਗ': 'g', 'ਘ': 'gh', 'ਙ': 'ng',
  'ਚ': 'ch', 'ਛ': 'chh', 'ਜ': 'j', 'ਝ': 'jh', 'ਞ': 'ny',
  'ਟ': 't', 'ਠ': 'th', 'ਡ': 'd', 'ਢ': 'dh', 'ਣ': 'n',
  'ਤ': 't', 'ਥ': 'th', 'ਦ': 'd', 'ਧ': 'dh', 'ਨ': 'n',
  'ਪ': 'p', 'ਫ': 'ph', 'ਬ': 'b', 'ਭ': 'bh', 'ਮ': 'm',
  'ਯ': 'y', 'ਰ': 'r', 'ਲ': 'l', 'ਵ': 'v', 'ੜ': 'r',
  'ਸ਼': 'sh', 'ਖ਼': 'kh', 'ਗ਼': 'gh', 'ਜ਼': 'z', 'ਫ਼': 'f', 'ਲ਼': 'l',
  'ਾ': 'aa', 'ਿ': 'i', 'ੀ': 'ee', 'ੁ': 'u', 'ੂ': 'oo',
  'ੇ': 'e', 'ੈ': 'ai', 'ੋ': 'o', 'ੌ': 'au',
  'ੰ': 'n', 'ਂ': 'n', '੍': '', '਼': '', 'ੱ': '',
};

export function guruToRomanPhonetic(text: string): string {
  const trimmed = text.trim();
  if (GURU_COMMON_PHRASES[trimmed]) return GURU_COMMON_PHRASES[trimmed];

  let working = text;
  for (const [guruPhrase, romanPhrase] of Object.entries(GURU_COMMON_PHRASES)) {
    if (working.includes(guruPhrase)) {
      working = working.replaceAll(guruPhrase, romanPhrase);
    }
  }

  // Word-level roman phonetic substitution
  working = working.replace(/[\u0A00-\u0A7F]+/g, (match) => {
    if (GURU_TO_ROMAN_WORD[match]) return GURU_TO_ROMAN_WORD[match];
    let res = '';
    for (let i = 0; i < match.length; i++) {
      const c = match[i];
      if (c === 'ੱ' && i + 1 < match.length) {
        const nxt = GURU_TO_ROMAN_CHAR[match[i + 1]] || match[i + 1];
        res += nxt;
      } else {
        res += GURU_TO_ROMAN_CHAR[c] !== undefined ? GURU_TO_ROMAN_CHAR[c] : c;
      }
    }
    return res;
  });

  return working;
}

const DEVA_COMMON_PHRASES: Record<string, string> = {
  'नमस्ते': 'Namaste',
  'नमस्ते भाई': 'Namaste bhai',
  'नमस्ते भाई, आप कैसे हैं?': 'Namaste bhai, aap kaise hain?',
  'आप कैसे हैं?': 'Aap kaise hain?',
  'आप कैसे हैं': 'Aap kaise hain',
  'तुम कैसे हो?': 'Tum kaise ho?',
  'तुम कैसे हो': 'Tum kaise ho',
  'क्या हाल है भाई?': 'Kya haal hai bhai?',
  'क्या हाल है भाई': 'Kya haal hai bhai',
  'क्या हाल है': 'Kya haal hai',
  'मैं ठीक हूँ': 'Main theek hoon',
  'मैं ठीक हूँ।': 'Main theek hoon.',
  'मैं बहुत अच्छा हूँ': 'Main bahut achha hoon',
  'धन्यवाद': 'Dhanyawaad',
  'बहुत अच्छा': 'Bahut achha',
  'हेलो भाई': 'Hello bhai',
};

const DEVA_TO_ROMAN_CHAR: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ੁ': 'u', 'ੂ': 'oo', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ं': 'n', '्': '', '़': ''
};

export function devaToRomanPhonetic(text: string): string {
  const trimmed = text.trim();
  if (DEVA_COMMON_PHRASES[trimmed]) return DEVA_COMMON_PHRASES[trimmed];

  let res = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    res += DEVA_TO_ROMAN_CHAR[c] !== undefined ? DEVA_TO_ROMAN_CHAR[c] : c;
  }
  return res;
}

// ── Indian Tone & Multilingual Speech Synthesis Engine ─────────────────────

export interface SpeakOptions {
  tone?: 'indian' | 'native' | 'casual' | 'formal' | 'friendly' | 'auto';
  gender?: 'female' | 'male' | 'auto';
  persona?: 'standard' | 'young' | 'mature';
  rate?: number;
  pitch?: number;
  voiceName?: string;
  isolateSpeaker?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

const INDIAN_LANG_MAP: Record<string, string[]> = {
  en: ['en-IN', 'en_IN'],
  hi: ['hi-IN', 'hi_IN', 'hi'],
  pa: ['pa-IN', 'pa'],
  ta: ['ta-IN', 'ta_IN', 'ta'],
  te: ['te-IN', 'te_IN', 'te'],
  bn: ['bn-IN', 'bn_BD', 'bn'],
  mr: ['mr-IN', 'mr'],
  gu: ['gu-IN', 'gu'],
  kn: ['kn-IN', 'kn'],
  ml: ['ml-IN', 'ml'],
  ur: ['ur-IN', 'ur-PK', 'ur'],
  or: ['or-IN', 'or'],
  ne: ['ne-NP', 'ne-IN', 'ne'],
};

const FEMALE_KEYWORDS = [
  'swara', 'kalpana', 'heera', 'neerja', 'zira', 'jenny', 'aria',
  'samantha', 'victoria', 'female', 'woman', 'girl', 'susan', 'hazel',
  'linda', 'catherine', 'katja', 'elvira', 'denise', 'ananya', 'priya', 'pooja', 'kavya', 'shruti'
];

const MALE_KEYWORDS = [
  'madhur', 'ravi', 'prabhat', 'david', 'mark', 'guy', 'george',
  'male', 'man', 'boy', 'richard', 'james', 'sean', 'stefan',
  'alvaro', 'claude', 'henri', 'ojas', 'hemant', 'mohan', 'rajesh', 'amit', 'arjun', 'vikram'
];

export function isVoiceGender(v: SpeechSynthesisVoice, gender: 'female' | 'male'): boolean {
  const name = v.name.toLowerCase();
  if (gender === 'female') {
    if (FEMALE_KEYWORDS.some((k) => name.includes(k))) return true;
    if (MALE_KEYWORDS.some((k) => name.includes(k))) return false;
    return true; // default lean
  }
  if (gender === 'male') {
    if (MALE_KEYWORDS.some((k) => name.includes(k))) return true;
    if (FEMALE_KEYWORDS.some((k) => name.includes(k))) return false;
    return false;
  }
  return true;
}

/**
 * Get the loaded SpeechSynthesis voices, waiting if not yet loaded.
 */
export function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    const handler = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices());
    }, 600);
  });
}

/**
 * Auto-detects the most authentic pronunciation tone based on target language.
 */
export function resolveEffectiveTone(lang: string, requestedTone?: string): 'indian' | 'casual' | 'formal' | 'native' {
  if (requestedTone && requestedTone !== 'auto') {
    return requestedTone as any;
  }
  const norm = lang.toLowerCase().split('-')[0];
  if (['pa', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'ur', 'or', 'ne'].includes(norm)) {
    return 'indian';
  }
  if (norm === 'en') {
    return 'casual';
  }
  return 'native';
}

/**
 * Finds the most natural voice matching language, gender, and tone.
 */
export async function findBestVoice(
  lang: string,
  options?: {
    tone?: string;
    gender?: 'female' | 'male' | 'auto';
    preferredVoiceName?: string;
    isolateSpeaker?: boolean;
  }
): Promise<{ voice: SpeechSynthesisVoice | null; spokenText: string; effectiveLang: string; pitchMultiplier: number }> {
  const voices = await getVoicesAsync();
  const normalizedLang = lang.toLowerCase().split('-')[0];
  const gender = options?.gender || 'auto';
  const tone = resolveEffectiveTone(lang, options?.tone);

  const matchesGender = (v: SpeechSynthesisVoice): boolean => {
    if (gender === 'auto') return true;
    return isVoiceGender(v, gender);
  };

  // 1. Explicit voice requested by caller (verify gender compatibility if gender is explicit)
  if (options?.preferredVoiceName && voices.length > 0) {
    const matchedVoice = voices.find((v) => v.name === options.preferredVoiceName);
    if (matchedVoice) {
      const vLang = matchedVoice.lang.toLowerCase();
      const isCompat =
        vLang.startsWith(normalizedLang) ||
        (normalizedLang === 'pa' && (vLang.includes('hi') || vLang.includes('en-in') || vLang.startsWith('pa'))) ||
        (normalizedLang === 'hi' && (vLang.includes('hi') || vLang.includes('en-in')));
      if ((isCompat || !options.isolateSpeaker) && (gender === 'auto' || matchesGender(matchedVoice))) {
        return { voice: matchedVoice, spokenText: '', effectiveLang: matchedVoice.lang, pitchMultiplier: 1.0 };
      }
    }
  }

  // 2. Global voice from Settings (ONLY if isolateSpeaker is false AND matches gender)
  if (!options?.isolateSpeaker && typeof window !== 'undefined') {
    const globalVoiceName = localStorage.getItem('lb_selected_voice');
    if (globalVoiceName) {
      const gVoice = voices.find((v) => v.name === globalVoiceName);
      if (gVoice) {
        const vLang = gVoice.lang.toLowerCase();
        const isCompat =
          vLang.startsWith(normalizedLang) ||
          (normalizedLang === 'pa' && (vLang.includes('hi') || vLang.includes('en-in') || vLang.startsWith('pa'))) ||
          (normalizedLang === 'hi' && (vLang.includes('hi') || vLang.includes('en-in')));
        if (isCompat && (gender === 'auto' || matchesGender(gVoice))) {
          return { voice: gVoice, spokenText: '', effectiveLang: gVoice.lang, pitchMultiplier: 1.0 };
        }
      }
    }
  }

  if (voices.length === 0) {
    return { voice: null, spokenText: '', effectiveLang: lang, pitchMultiplier: 1.0 };
  }

  // 3. Punjabi Handling:
  if (normalizedLang === 'pa') {
    // 3a. Native Punjabi Voices
    const nativePaVoices = voices.filter((v) => {
      const l = v.lang.toLowerCase();
      const n = v.name.toLowerCase();
      return l.startsWith('pa') || n.includes('punjabi') || n.includes('ojas');
    });
    const nativePaGender = nativePaVoices.find(matchesGender);
    if (nativePaGender) {
      return { voice: nativePaGender, spokenText: '', effectiveLang: 'pa-IN', pitchMultiplier: 1.0 };
    }

    // 3b. Indian Hindi voices matching requested gender
    const hindiVoices = voices.filter((v) => {
      const l = v.lang.toLowerCase();
      const n = v.name.toLowerCase();
      return l.includes('hi') || n.includes('hindi') || n.includes('swara') || n.includes('madhur') || n.includes('kalpana') || n.includes('hemant');
    });
    const hindiVoiceGender = hindiVoices.find(matchesGender);
    if (hindiVoiceGender) {
      return { voice: hindiVoiceGender, spokenText: '', effectiveLang: 'hi-IN', pitchMultiplier: 1.0 };
    }

    // 3c. Indian English voices matching requested gender (with natural Indian phonetic Punjabi)
    const indianEnVoices = voices.filter((v) => {
      const l = v.lang.toLowerCase();
      const n = v.name.toLowerCase();
      return l === 'en-in' || l === 'en_in' || n.includes('heera') || n.includes('ravi') || n.includes('neerja') || n.includes('prabhat') || n.includes('india');
    });
    const indianEnGender = indianEnVoices.find(matchesGender);
    if (indianEnGender) {
      return { voice: indianEnGender, spokenText: '', effectiveLang: 'en-IN', pitchMultiplier: 1.0 };
    }

    // Fallback: If no exact gender matched in Punjabi/Hindi/Indian-EN, take best available Indian voice
    // and apply pitch formant transformation so Male/Female distinction is always audible
    const fallbackIndian = nativePaVoices[0] || hindiVoices[0] || indianEnVoices[0];
    if (fallbackIndian) {
      const isPhysicallyFemale = isVoiceGender(fallbackIndian, 'female');
      const pitchMod = gender === 'male' && isPhysicallyFemale ? 0.68 : gender === 'female' && !isPhysicallyFemale ? 1.35 : 1.0;
      return { voice: fallbackIndian, spokenText: '', effectiveLang: fallbackIndian.lang, pitchMultiplier: pitchMod };
    }
  }

  // 4. Hindi Handling:
  if (normalizedLang === 'hi') {
    const hindiVoices = voices.filter((v) => {
      const l = v.lang.toLowerCase();
      const n = v.name.toLowerCase();
      return l.includes('hi') || n.includes('hindi') || n.includes('swara') || n.includes('madhur') || n.includes('kalpana') || n.includes('hemant');
    });
    const hindiGender = hindiVoices.find(matchesGender);
    if (hindiGender) {
      return { voice: hindiGender, spokenText: '', effectiveLang: 'hi-IN', pitchMultiplier: 1.0 };
    }
    // Check Indian English matching gender as fallback
    const indianEnVoices = voices.filter((v) => {
      const l = v.lang.toLowerCase();
      const n = v.name.toLowerCase();
      return l === 'en-in' || l === 'en_in' || n.includes('heera') || n.includes('ravi') || n.includes('neerja') || n.includes('prabhat');
    });
    const indianEnGender = indianEnVoices.find(matchesGender);
    if (indianEnGender) {
      return { voice: indianEnGender, spokenText: '', effectiveLang: 'en-IN', pitchMultiplier: 1.0 };
    }
    if (hindiVoices.length > 0) {
      const pitchMod = gender === 'male' ? 0.68 : 1.15;
      return { voice: hindiVoices[0], spokenText: '', effectiveLang: 'hi-IN', pitchMultiplier: pitchMod };
    }
  }

  // 5. English Handling:
  if (normalizedLang === 'en') {
    if (tone === 'indian') {
      const indianEnVoices = voices.filter((v) => {
        const l = v.lang.toLowerCase();
        const n = v.name.toLowerCase();
        return l === 'en-in' || l === 'en_in' || n.includes('india') || n.includes('heera') || n.includes('ravi') || n.includes('neerja') || n.includes('prabhat');
      });
      const indianEnGender = indianEnVoices.find(matchesGender);
      if (indianEnGender) {
        return { voice: indianEnGender, spokenText: '', effectiveLang: 'en-IN', pitchMultiplier: 1.0 };
      }
      // Fallback: If no dedicated en-IN voice is found on OS, check if Hindi voice (hi-IN) is present
      const hindiVoices = voices.filter((v) => {
        const l = v.lang.toLowerCase();
        const n = v.name.toLowerCase();
        return l.includes('hi') || n.includes('hindi') || n.includes('swara') || n.includes('madhur') || n.includes('kalpana') || n.includes('hemant');
      });
      const hindiVoiceGender = hindiVoices.find(matchesGender);
      if (hindiVoiceGender) {
        return { voice: hindiVoiceGender, spokenText: '', effectiveLang: 'hi-IN', pitchMultiplier: 1.0 };
      }
    }
    const englishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    const englishGender = englishVoices.find(matchesGender);
    if (englishGender) {
      return { voice: englishGender, spokenText: '', effectiveLang: englishGender.lang, pitchMultiplier: 1.0 };
    }
    if (englishVoices.length > 0) {
      const pitchMod = gender === 'male' ? 0.72 : 1.30;
      return { voice: englishVoices[0], spokenText: '', effectiveLang: englishVoices[0].lang, pitchMultiplier: pitchMod };
    }
  }

  // 6. Regional Indian Languages (Tamil, Telugu, Bengali, Marathi, etc.)
  if (INDIAN_LANG_MAP[normalizedLang]) {
    const targetLocales = INDIAN_LANG_MAP[normalizedLang];
    const matchingLang = voices.filter((v) =>
      targetLocales.some((loc) => v.lang.toLowerCase().startsWith(loc.toLowerCase()))
    );
    const chosen = matchingLang.find(matchesGender) || matchingLang[0];
    if (chosen) {
      const pitchMod = gender === 'male' && isVoiceGender(chosen, 'female') ? 0.70 : gender === 'female' && isVoiceGender(chosen, 'male') ? 1.30 : 1.0;
      return { voice: chosen, spokenText: '', effectiveLang: chosen.lang, pitchMultiplier: pitchMod };
    }
  }

  // 7. General Language Match with Gender
  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(normalizedLang));
  const generalMatch = langVoices.find(matchesGender) || langVoices[0];
  if (generalMatch) {
    const pitchMod = gender === 'male' && isVoiceGender(generalMatch, 'female') ? 0.70 : gender === 'female' && isVoiceGender(generalMatch, 'male') ? 1.30 : 1.0;
    return { voice: generalMatch, spokenText: '', effectiveLang: generalMatch.lang, pitchMultiplier: pitchMod };
  }

  // 8. Default Fallback
  const defaultVoice = voices.find(matchesGender) || voices.find((v) => v.default) || voices[0] || null;
  return { voice: defaultVoice, spokenText: '', effectiveLang: defaultVoice ? defaultVoice.lang : lang, pitchMultiplier: 1.0 };
}

let currentAudio: HTMLAudioElement | null = null;
let isSpeakingActive = false;
let currentSpeechId = 0;

/**
 * Speak text out loud with natural Indian tone and cadence.
 * Uses high-fidelity natural audio stream for Punjabi ('pa') and languages
 * where the user's OS lacks native voice packages, with instantaneous fallback
 * to the browser SpeechSynthesis engine.
 * Guaranteed single-playback: ensures speech is never repeated twice.
 */
export async function speakText(
  text: string,
  lang: string,
  options?: SpeakOptions
): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!text || !text.trim()) return;

  const speechId = ++currentSpeechId;
  stopSpeaking();

  const normalizedLang = lang.toLowerCase().split('-')[0];
  const voices = await getVoicesAsync();
  if (speechId !== currentSpeechId) return;

  // 1. Check if browser has a genuine native voice installed for this specific language
  const hasNativeVoice = voices.some((v) => {
    const l = v.lang.toLowerCase();
    const n = v.name.toLowerCase();
    return l.startsWith(normalizedLang) || (normalizedLang === 'pa' && (l.startsWith('pa') || n.includes('punjabi')));
  });

  // 2. For Punjabi ('pa') or any language where the local OS lacks a genuine native voice,
  // play the crystal-clear native pronunciation audio stream:
  if (!hasNativeVoice || normalizedLang === 'pa') {
    let hasFallenBack = false;
    const fallbackToSynth = () => {
      if (hasFallenBack || speechId !== currentSpeechId) return;
      hasFallenBack = true;
      currentAudio = null;
      isSpeakingActive = false;
      _speakViaSpeechSynthesis(text, lang, options, speechId);
    };

    try {
      const ttsLang = normalizedLang === 'pa' ? 'pa' : normalizedLang;
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 450))}&tl=${ttsLang}&client=tw-ob`;
      const audio = new Audio(ttsUrl);
      currentAudio = audio;

      const requestedRate = options?.rate ?? (typeof window !== 'undefined' ? parseFloat(localStorage.getItem('lb_speech_rate') || '1.0') : 1.0);
      if (requestedRate && requestedRate > 0) {
        audio.playbackRate = Math.max(0.75, Math.min(1.35, requestedRate));
      }

      audio.onplay = () => {
        if (speechId !== currentSpeechId) {
          try { audio.pause(); } catch {}
          return;
        }
        isSpeakingActive = true;
        options?.onStart?.();
      };

      audio.onended = () => {
        if (speechId === currentSpeechId) {
          currentAudio = null;
          isSpeakingActive = false;
          options?.onEnd?.();
        }
      };

      audio.onerror = () => {
        fallbackToSynth();
      };

      await audio.play();
      return;
    } catch {
      fallbackToSynth();
      return;
    }
  }

  // Local SpeechSynthesis (for English, Hindi, and when native voices exist)
  await _speakViaSpeechSynthesis(text, lang, options, speechId);
}

async function _speakViaSpeechSynthesis(
  text: string,
  lang: string,
  options?: SpeakOptions,
  expectedSpeechId?: number
): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (expectedSpeechId !== undefined && expectedSpeechId !== currentSpeechId) return;

  const requestedGender = options?.gender ?? (typeof window !== 'undefined' ? (localStorage.getItem('lb_voice_gender') as any) : null) ?? 'auto';
  const requestedPersona = options?.persona ?? (typeof window !== 'undefined' ? (localStorage.getItem('lb_voice_persona') as any) : null) ?? 'standard';
  const requestedTone = options?.tone ?? (typeof window !== 'undefined' ? (localStorage.getItem('lb_voice_tone') as any) : null) ?? 'auto';
  const effectiveTone = resolveEffectiveTone(lang, requestedTone);

  let customRate = options?.rate ?? (typeof window !== 'undefined' ? parseFloat(localStorage.getItem('lb_speech_rate') || '0.96') : 0.96);
  let customPitch = options?.pitch ?? (typeof window !== 'undefined' ? parseFloat(localStorage.getItem('lb_speech_pitch') || '1.0') : 1.0);

  // Age Persona Modifiers
  if (requestedPersona === 'young') {
    customPitch = customPitch * 1.28;
    customRate = customRate * 1.08;
  } else if (requestedPersona === 'mature') {
    customPitch = customPitch * 0.72;
    customRate = customRate * 0.88;
  }

  // Tone adjustments
  if (effectiveTone === 'casual') {
    customRate = customRate * 1.04;
  } else if (effectiveTone === 'formal') {
    customRate = customRate * 0.90;
    customPitch = customPitch * 0.95;
  } else if (effectiveTone === 'indian') {
    customRate = customRate * 0.94;
    customPitch = customPitch * 1.02;
  }

  const normalizedLang = lang.toLowerCase().split('-')[0];

  const { voice, effectiveLang, pitchMultiplier } = await findBestVoice(lang, {
    tone: effectiveTone,
    gender: requestedGender,
    preferredVoiceName: options?.voiceName,
    isolateSpeaker: options?.isolateSpeaker,
  });

  if (expectedSpeechId !== undefined && expectedSpeechId !== currentSpeechId) return;

  customPitch = Math.max(0.5, Math.min(1.85, customPitch * pitchMultiplier));
  customRate = Math.max(0.7, Math.min(1.4, customRate));

  let textToSpeak = text;
  const voiceLang = (voice?.lang || effectiveLang || '').toLowerCase();
  const voiceName = (voice?.name || '').toLowerCase();
  const isVoiceNativePa = voiceLang.startsWith('pa') || voiceName.includes('punjabi');
  const isVoiceHindi = voiceLang.startsWith('hi') || voiceName.includes('hindi') || voiceName.includes('swara') || voiceName.includes('madhur') || voiceName.includes('kalpana') || voiceName.includes('hemant');

  if (normalizedLang === 'pa') {
    if (isVoiceNativePa) {
      textToSpeak = text;
    } else if (isVoiceHindi) {
      textToSpeak = guruToDevaPhonetic(text);
    } else {
      textToSpeak = guruToRomanPhonetic(text);
    }
  } else if (normalizedLang === 'hi') {
    if (isVoiceHindi || isVoiceNativePa) {
      textToSpeak = text;
    } else {
      textToSpeak = devaToRomanPhonetic(text);
    }
  }

  const utterance = new SpeechSynthesisUtterance(textToSpeak);

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = effectiveLang;
  }

  utterance.rate = customRate;
  utterance.pitch = customPitch;

  utterance.onstart = () => {
    if (expectedSpeechId !== undefined && expectedSpeechId !== currentSpeechId) {
      window.speechSynthesis.cancel();
      return;
    }
    isSpeakingActive = true;
    options?.onStart?.();
  };

  utterance.onend = () => {
    if (expectedSpeechId === undefined || expectedSpeechId === currentSpeechId) {
      isSpeakingActive = false;
      options?.onEnd?.();
    }
  };

  utterance.onerror = (e) => {
    if (expectedSpeechId === undefined || expectedSpeechId === currentSpeechId) {
      isSpeakingActive = false;
      options?.onError?.(e);
    }
  };

  // Crucial: Clear any previous queued utterance before speaking so it never speaks twice
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

/**
 * Cancel any ongoing speech synthesis or audio playback immediately.
 */
export function stopSpeaking(): void {
  if (typeof window !== 'undefined') {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch {}
      currentAudio = null;
    }
  }
  isSpeakingActive = false;
}

/**
 * Check if browser is currently speaking or playing audio.
 */
export function isSpeaking(): boolean {
  if (typeof window === 'undefined') return false;
  const synthSpeaking = 'speechSynthesis' in window && window.speechSynthesis.speaking;
  const audioPlaying = currentAudio !== null && !currentAudio.paused;
  return Boolean(synthSpeaking || audioPlaying || isSpeakingActive);
}
