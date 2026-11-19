import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightLeft, Copy, Check, Volume2, VolumeX, Trash2, Loader2,
  Mic, MicOff, Upload, FileText, MessageSquare, Sparkles,
  Radio, Play, Square, Settings2, Globe,
  Download, ArrowRight, RefreshCw, Eye, BookOpen, Printer, Layers,
  Smile, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslationStore } from '@/store/useTranslationStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useDebounce } from '@/hooks/useDebounce';
import LanguagePicker from '@/components/translation/LanguagePicker';
import { translateText, detectLanguage, translateDocument, parseDocument, exportDocument, saveHistory } from '@/lib/api';
import { copyToClipboard, speakText, stopSpeaking, isSpeaking, cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { EmptyState } from '@/components/common/EmptyState';

type Tab = 'text' | 'voice' | 'conversation' | 'documents';

export default function TranslatorPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('text');

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'text', label: t('translator.textTab') || 'Text', icon: FileText },
    { key: 'voice', label: t('translator.voiceTab') || 'Voice', icon: Mic },
    { key: 'conversation', label: t('translator.conversationTab') || 'Conversation', icon: MessageSquare },
    { key: 'documents', label: t('translator.documentsTab') || 'Documents', icon: Upload },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("mx-auto transition-all duration-300", activeTab === 'documents' ? "max-w-7xl" : "max-w-6xl")}
    >
      {/* Header and Mode Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Space_Grotesk'] text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="gradient-text">Neural</span> Translation Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ultra-fast offline neural translation powered by NLLB-200 with native Punjabi, Hindi, and regional Indic fidelity.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all select-none cursor-pointer',
                activeTab === key
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800'
              )}
            >
              <Icon className={cn("w-4 h-4", activeTab === key ? "text-white" : "text-slate-500")} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <ErrorBoundary>
        {activeTab === 'text' && <TextTranslation />}
        {activeTab === 'voice' && <VoiceTranslation />}
        {activeTab === 'conversation' && <ConversationMode />}
        {activeTab === 'documents' && <DocumentTranslation />}
      </ErrorBoundary>
    </motion.div>
  );
}

/* ─── QUICK TARGET LANGUAGES (Featuring Punjabi First) ─────────────────── */
const QUICK_LANGS = [
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' },
  { code: 'hi', label: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'ta', label: 'Tamil', flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali', flag: '🇧🇩' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
];

/* ─── TEXT TRANSLATION ────────────────────────────────────────────────── */
function TextTranslation() {
  const { t } = useTranslation();
  const store = useTranslationStore();
  const settings = useSettingsStore();
  const debouncedText = useDebounce(store.sourceText, 450);
  const [copied, setCopied] = useState(false);
  const [isSpeakingSource, setIsSpeakingSource] = useState(false);
  const [isSpeakingTarget, setIsSpeakingTarget] = useState(false);

  // Auto-translate on debounced text change
  useEffect(() => {
    if (!debouncedText.trim()) {
      store.setTargetText('');
      store.setError(null);
      store.setDetectedLang(null, null);
      store.setDetectedTone(null);
      return;
    }

    let cancelled = false;
    const doTranslate = async () => {
      store.setTranslating(true);
      store.setError(null);
      try {
        const result = await translateText(debouncedText, store.sourceLang, store.targetLang, store.tone);
        if (!cancelled) {
          store.setResult(result.translated_text, result.alternatives, result.latency_ms);
          if (result.detected_lang) {
            store.setDetectedLang(result.detected_lang, result.confidence);
          }
          if (result.detected_tone) {
            store.setDetectedTone(result.detected_tone);
          }
          // Auto-save to history (fire-and-forget)
          saveHistory({
            source_text: debouncedText,
            target_text: result.translated_text,
            source_lang: store.sourceLang,
            target_lang: store.targetLang,
          }).catch(() => {});
        }
      } catch (err: any) {
        if (!cancelled) {
          const detail = err?.response?.data?.detail;
          const msg = typeof detail === 'string' ? detail : err?.message || 'Translation failed. Please verify backend connection.';
          store.setError(msg);
        }
      }
    };
    doTranslate();
    return () => { cancelled = true; };
  }, [debouncedText, store.sourceLang, store.targetLang, store.tone]);

  const handleCopy = async () => {
    if (!store.targetText) return;
    await copyToClipboard(store.targetText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Translated text copied to clipboard!');
  };

  const handleSpeakSource = () => {
    if (!store.sourceText) return;
    if (isSpeakingSource || isSpeaking()) {
      stopSpeaking();
      setIsSpeakingSource(false);
      return;
    }
    setIsSpeakingSource(true);
    speakText(store.sourceText, store.sourceLang, {
      gender: settings.voiceGender,
      persona: settings.voicePersona,
      tone: settings.voiceTone,
      onStart: () => setIsSpeakingSource(true),
      onEnd: () => setIsSpeakingSource(false),
      onError: () => setIsSpeakingSource(false),
    });
  };

  const handleSpeakTarget = () => {
    if (!store.targetText) return;
    if (isSpeakingTarget || isSpeaking()) {
      stopSpeaking();
      setIsSpeakingTarget(false);
      return;
    }
    setIsSpeakingTarget(true);
    speakText(store.targetText, store.targetLang, {
      gender: settings.voiceGender,
      persona: settings.voicePersona,
      tone: settings.voiceTone,
      onStart: () => setIsSpeakingTarget(true),
      onEnd: () => setIsSpeakingTarget(false),
      onError: () => setIsSpeakingTarget(false),
    });
  };

  return (
    <div className="space-y-4">
      {/* Tone & Toolbar Options */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        {/* Human Tone Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 px-2 font-medium">Tone Modulation:</span>
            {(['neutral', 'formal', 'casual'] as const).map((tMode) => (
              <button
                key={tMode}
                onClick={() => store.setTone(tMode)}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-medium transition-all capitalize cursor-pointer',
                  store.tone === tMode
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                {tMode === 'neutral' ? 'Natural' : tMode === 'formal' ? 'Formal (ਤੁਸੀਂ / आप)' : 'Casual (ਤੂੰ / तुम)'}
              </button>
            ))}
          </div>

          {/* Detected Human Tone Badge */}
          {store.detectedTone && store.detectedTone !== 'neutral' && (
            <span className={cn(
              "px-2.5 py-1 rounded-xl text-xs font-medium border flex items-center gap-1.5 animate-fadeIn",
              store.detectedTone === 'formal'
                ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
                : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
            )}>
              <span>{store.detectedTone === 'formal' ? '👔 Detected: Respectful / Formal' : '💬 Detected: Friendly / Casual'}</span>
            </span>
          )}
        </div>

        {/* Quick Target Language Bar */}
        <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1 font-medium">Quick Target:</span>
          {QUICK_LANGS.slice(0, 6).map((l) => (
            <button
              key={l.code}
              onClick={() => store.setTargetLang(l.code)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
                store.targetLang === l.code
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              <span className="text-xs">{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Translation Cards */}
      <div className="relative">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Source Panel */}
          <div className="app-card p-5 flex flex-col relative focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/20 min-h-[300px]">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="w-48 sm:w-56">
                <LanguagePicker
                  value={store.sourceLang}
                  onChange={store.setSourceLang}
                  showAutoDetect
                  detectedLang={store.detectedLang}
                  confidence={store.confidence}
                />
              </div>

              {store.sourceText && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    {store.sourceText.length} chars
                  </span>
                  <button
                    onClick={store.clear}
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Clear text"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Source Textarea */}
            <textarea
              value={store.sourceText}
              onChange={(e) => store.setSourceText(e.target.value)}
              placeholder="Enter text or paste here to translate (supports English, Gurmukhi Punjabi, Romanized Punjabi / Punjlish, Hindi)..."
              className="flex-1 min-h-[190px] bg-transparent resize-none outline-none text-base text-slate-900 dark:text-slate-100 leading-relaxed placeholder-slate-400 font-normal"
              dir={['ar', 'ur', 'he', 'fa'].includes(store.sourceLang) ? 'rtl' : 'ltr'}
              aria-label="Source text"
            />

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-1.5">
                {store.sourceText && (
                  <button
                    onClick={handleSpeakSource}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                      isSpeakingSource
                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    )}
                    aria-label="Listen to original"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen</span>
                  </button>
                )}
              </div>

              {store.detectedLang && store.sourceLang === 'auto' && (
                <span className="text-[11px] font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                  Detected: <strong className="uppercase">{store.detectedLang}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Target Panel */}
          <div className="app-card p-5 flex flex-col relative min-h-[300px]">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="w-48 sm:w-56">
                <LanguagePicker value={store.targetLang} onChange={store.setTargetLang} />
              </div>

              <div className="flex items-center gap-2">
                {store.isTranslating && (
                  <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 text-xs px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Translating...</span>
                  </div>
                )}
                {store.latencyMs !== null && !store.isTranslating && (
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                    <span className="text-[10px]">⚡</span> {Math.round(store.latencyMs)}ms
                  </span>
                )}
              </div>
            </div>

            {/* Target Output Area */}
            <div
              className="flex-1 min-h-[190px] text-base leading-relaxed"
              dir={['ar', 'ur', 'he', 'fa'].includes(store.targetLang) ? 'rtl' : 'ltr'}
            >
              {store.isTranslating && !store.targetText ? (
                <div className="space-y-3 pt-3">
                  <div className="h-5 w-4/5 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="h-5 w-full rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="h-5 w-2/3 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                </div>
              ) : store.error ? (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-sm">
                  {store.error}
                </div>
              ) : store.targetText ? (
                <p className="text-slate-900 dark:text-slate-100 select-text whitespace-pre-wrap font-medium">{store.targetText}</p>
              ) : (
                <p className="text-slate-400 italic select-none">
                  {t('translator.targetPlaceholder') || 'Translation will appear here instantly...'}
                </p>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                {store.targetText && (
                  <>
                    <button
                      onClick={handleCopy}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                        copied
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                      )}
                      aria-label="Copy translated text"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={handleSpeakTarget}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                        isSpeakingTarget
                          ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      )}
                      aria-label="Listen to translation"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen</span>
                    </button>
                  </>
                )}
              </div>

              {store.targetText && (
                <span className="text-[11px] font-mono text-slate-400">
                  {store.targetText.length} chars
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Central Floating Swap Button (Desktop) */}
        <button
          onClick={store.swapLanguages}
          className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 items-center justify-center text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-400 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer group"
          aria-label="Swap languages"
          title="Swap source and target languages"
        >
          <ArrowRightLeft className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300 text-teal-600 dark:text-teal-400" />
        </button>

        {/* Mobile Swap Button */}
        <div className="flex md:hidden justify-center my-3">
          <button
            onClick={store.swapLanguages}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 shadow-sm cursor-pointer"
            aria-label="Swap languages"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 rotate-90 text-teal-600 dark:text-teal-400" />
            <span>Swap Languages</span>
          </button>
        </div>
      </div>

      {/* Alternatives Strip */}
      {store.alternatives.length > 0 && (
        <div className="p-4 rounded-2xl app-card space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Alternative Neural Translations:</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {store.alternatives.map((alt, i) => (
              <button
                key={i}
                onClick={() => store.setTargetText(alt)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 border border-slate-200 dark:border-slate-700/60 text-xs transition-all text-left cursor-pointer"
              >
                {alt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── BCP47 SPEECH MAPPING FOR REAL-TIME VOICE ────────────────────────── */
const BCP47_SPEECH_MAP: Record<string, string> = {
  pa: 'pa-IN',
  hi: 'hi-IN',
  en: 'en-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  ur: 'ur-IN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
  ru: 'ru-RU',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ar: 'ar-SA',
};

/* ─── VOICE TRANSLATION ──────────────────────────────────────────────── */
function VoiceTranslation() {
  const { t } = useTranslation();
  const settings = useSettingsStore();
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('pa'); // Default target Punjabi for instant regional voice
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [detectedConfidence, setDetectedConfidence] = useState<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeakingState, setIsSpeakingState] = useState(false);

  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedTone, setDetectedTone] = useState<string>('neutral');

  const [autoSpeak, setAutoSpeak] = useState(true);
  const [toneMode, setToneMode] = useState<'indian' | 'native'>('indian');
  const [speechRate, setSpeechRate] = useState(0.95);
  const [statusMessage, setStatusMessage] = useState('Click microphone to speak in Punjabi, Hindi, or English');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTranslated, setCopiedTranslated] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  const lastVoiceSpokenRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const swapVoiceLanguages = () => {
    const newSource = targetLang;
    const newTarget = sourceLang === 'auto' ? (detectedLang || 'en') : sourceLang;
    setSourceLang(newSource);
    setTargetLang(newTarget);
    if (translatedText && transcript) {
      const prevOrig = transcript;
      setTranscript(translatedText);
      setTranslatedText(prevOrig);
    }
  };

  const processSpokenSpeech = async (spokenText: string) => {
    const cleanText = spokenText?.trim();
    if (!cleanText || isProcessingRef.current) return;

    const now = Date.now();
    if (cleanText === lastVoiceSpokenRef.current.text && now - lastVoiceSpokenRef.current.time < 2200) {
      return; // Skip duplicate speech processing
    }
    lastVoiceSpokenRef.current = { text: cleanText, time: now };

    isProcessingRef.current = true;
    setIsTranslating(true);
    setTranscript(cleanText);
    setInterimText('');
    setStatusMessage('Translating with AI ML model...');

    try {
      let actualSource = sourceLang;
      if (sourceLang === 'auto') {
        const detectRes = await detectLanguage(spokenText);
        actualSource = detectRes.language || 'en';
        setDetectedLang(detectRes.language);
        setDetectedConfidence(detectRes.confidence);
      } else {
        setDetectedLang(sourceLang);
        setDetectedConfidence(1.0);
      }

      const start = performance.now();
      const res = await translateText(spokenText, actualSource, targetLang);
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(res.latency_ms || elapsed);
      setTranslatedText(res.translated_text);
      setDetectedTone(res.detected_tone || 'neutral');

      saveHistory({
        source_text: spokenText,
        target_text: res.translated_text,
        source_lang: actualSource,
        target_lang: targetLang,
      }).catch(() => {});

      if (autoSpeak && res.translated_text) {
        setStatusMessage(
          toneMode === 'indian'
            ? '🔊 Speaking with Natural Indian Tone...'
            : '🔊 Speaking in Target Language...'
        );
        setIsSpeakingState(true);
        await speakText(res.translated_text, targetLang, {
          tone: toneMode,
          rate: speechRate,
          gender: settings.voiceGender,
          persona: settings.voicePersona,
          onStart: () => setIsSpeakingState(true),
          onEnd: () => {
            setIsSpeakingState(false);
            setStatusMessage('Ready. Click microphone to speak again');
          },
          onError: () => {
            setIsSpeakingState(false);
            setStatusMessage('Ready. Click microphone to speak again');
          },
        });
      } else {
        setStatusMessage('Ready. Click microphone to speak again');
      }
    } catch (err: any) {
      toast.error('Voice translation failed: ' + (err.message || 'Network error'));
      setStatusMessage('Translation failed. Click to try again');
    } finally {
      setIsTranslating(false);
      isProcessingRef.current = false;
    }
  };

  const startListening = () => {
    stopSpeaking();
    setIsSpeakingState(false);

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      toast.error('Web Speech API is not supported in this browser.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const locale =
        sourceLang !== 'auto'
          ? BCP47_SPEECH_MAP[sourceLang] || sourceLang
          : (navigator.language || 'pa-IN');
      recognition.lang = locale;

      recognition.onstart = () => {
        setIsRecording(true);
        setInterimText('');
        setStatusMessage('Listening... speak now in Punjabi, Hindi, or English');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) setInterimText(interim);
        if (finalStr.trim()) {
          try { recognition.abort(); } catch { try { recognition.stop(); } catch {} }
          setInterimText('');
          processSpokenSpeech(finalStr.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition warning:', event.error);
        }
        setIsRecording(false);
        if (!isProcessingRef.current) {
          setStatusMessage('Click microphone to speak');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (!isProcessingRef.current && !isTranslating) {
          setStatusMessage('Click microphone to speak');
        }
      };

      recognition.start();
    } catch (err: any) {
      toast.error('Could not access microphone: ' + (err.message || ''));
      setIsRecording(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsRecording(false);
    if (interimText.trim() && !isProcessingRef.current) {
      const pending = interimText.trim();
      setInterimText('');
      processSpokenSpeech(pending);
    }
  };

  const handleTogglePlayTranslation = () => {
    if (!translatedText) return;
    if (isSpeakingState || isSpeaking()) {
      stopSpeaking();
      setIsSpeakingState(false);
      return;
    }
    setIsSpeakingState(true);
    speakText(translatedText, targetLang, {
      tone: toneMode,
      rate: speechRate,
      gender: settings.voiceGender,
      persona: settings.voicePersona,
      onStart: () => setIsSpeakingState(true),
      onEnd: () => setIsSpeakingState(false),
      onError: () => setIsSpeakingState(false),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Top Bar: Language Selectors & Swap */}
      <div className="app-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 relative z-50">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Spoken Language (Input)
          </label>
          <LanguagePicker
            value={sourceLang}
            onChange={(code) => {
              setSourceLang(code);
              setDetectedLang(null);
            }}
            showAutoDetect={true}
            detectedLang={detectedLang}
            confidence={detectedConfidence}
          />
        </div>

        <button
          onClick={swapVoiceLanguages}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 mt-5 cursor-pointer shadow-xs"
          title="Swap languages"
          aria-label="Swap languages"
        >
          <ArrowRightLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        </button>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Target Spoken Output
          </label>
          <LanguagePicker
            value={targetLang}
            onChange={setTargetLang}
            showAutoDetect={false}
            align="right"
          />
        </div>
      </div>

      {/* Voice Controls Toolbar */}
      <div className="app-card px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Cadence:</span>
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setToneMode('indian')}
              className={cn(
                'px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1 cursor-pointer',
                toneMode === 'indian'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              🇮🇳 Natural Indian Tone
            </button>
            <button
              onClick={() => setToneMode('native')}
              className={cn(
                'px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1 cursor-pointer',
                toneMode === 'native'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              🌐 Global Accent
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoSpeak}
            onChange={(e) => setAutoSpeak(e.target.checked)}
            className="w-4 h-4 rounded text-teal-600 border-slate-300 dark:border-slate-700 accent-teal-600"
          />
          <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            Auto-Speak Voice Translation
          </span>
        </label>
      </div>

      {/* Interactive Microphone Stage */}
      <div className="app-card p-8 flex flex-col items-center relative overflow-hidden text-center">
        {/* Pulsing rings when recording */}
        {isRecording && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 rounded-full bg-rose-500/10 animate-ping" />
          </div>
        )}

        {/* Big Mic Button */}
        <div className="relative mb-5 z-10">
          <button
            onClick={isRecording ? stopListening : startListening}
            disabled={isTranslating}
            className={cn(
              'relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer',
              isRecording
                ? 'bg-rose-600 text-white ring-4 ring-rose-300 dark:ring-rose-900'
                : isSpeakingState
                ? 'bg-teal-600 text-white ring-4 ring-teal-300 dark:ring-teal-900 animate-pulse'
                : isTranslating
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-wait'
                : 'bg-teal-600 hover:bg-teal-700 text-white hover:scale-105 shadow-teal-500/25'
            )}
            aria-label={isRecording ? 'Stop recording' : 'Start speaking'}
          >
            {isTranslating ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-8 h-8" />
            ) : isSpeakingState ? (
              <Volume2 className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">
              {isTranslating ? 'Translating' : isRecording ? 'Stop' : isSpeakingState ? 'Speaking' : 'Speak'}
            </span>
          </button>
        </div>

        {/* Status Message */}
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          {isRecording && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />}
          {isSpeakingState && <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />}
          {statusMessage}
        </p>

        {/* Soundwave Frequency Visualizer */}
        {(isRecording || isSpeakingState) && (
          <div className="flex items-center gap-1 h-10 mb-4 px-6 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  height: isRecording ? [6, 14 + (i % 5) * 4, 6] : [8, 16, 8],
                }}
                transition={{ duration: 0.35 + (i % 4) * 0.1, repeat: Infinity }}
                className={cn('w-1.5 rounded-full', isRecording ? 'bg-rose-500' : 'bg-teal-600')}
              />
            ))}
          </div>
        )}

        {/* Interim Streaming Words */}
        {interimText && (
          <div className="w-full max-w-lg p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-sm text-center mb-4 italic">
            "{interimText}..."
          </div>
        )}

        {/* Results Display */}
        {(transcript || translatedText) && (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-left">
            {/* Original Spoken Text Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Mic className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    Spoken Speech
                  </span>
                  {detectedLang && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      {detectedLang.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-slate-900 dark:text-slate-100 text-sm leading-relaxed min-h-[50px] font-medium">
                  {transcript || '...'}
                </p>
              </div>
            </div>

            {/* Translated Voice Card */}
            <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/30 dark:bg-teal-950/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    Translated Speech ({targetLang.toUpperCase()})
                  </span>
                  {latencyMs && (
                    <span className="text-[10px] text-slate-500 font-mono">{latencyMs}ms</span>
                  )}
                </div>
                <p className="text-slate-900 dark:text-slate-100 text-base font-semibold leading-relaxed min-h-[50px]">
                  {translatedText || '...'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-teal-100 dark:border-teal-900/40">
                <button
                  onClick={handleTogglePlayTranslation}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  {isSpeakingState ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Voice</span>
                      <div className="flex items-center gap-0.5 ml-1">
                        <span className="soundwave-bar-1 w-1 bg-white rounded-full" />
                        <span className="soundwave-bar-2 w-1 bg-white rounded-full" />
                        <span className="soundwave-bar-3 w-1 bg-white rounded-full" />
                        <span className="soundwave-bar-4 w-1 bg-white rounded-full" />
                      </div>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen Again</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── CONVERSATION MODE ──────────────────────────────────────────────── */
interface ConvMessage {
  text: string;
  translated: string;
  lang: string;
  targetLang: string;
  side: 'left' | 'right';
  time: string;
}

function ConversationMode() {
  const settings = useSettingsStore();
  const [messages, setMessages] = useState<ConvMessage[]>([
    {
      text: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ, ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ?',
      translated: 'Greetings! How are you doing today?',
      lang: 'pa',
      targetLang: 'en',
      side: 'left',
      time: '10:14 AM',
    },
    {
      text: "I am doing great, thank you! I'm enjoying learning Punjabi.",
      translated: 'ਮੈਂ ਬਹੁਤ ਵਧੀਆ ਹਾਂ, ਧੰਨਵਾਦ! ਮੈਨੂੰ ਪੰਜਾਬੀ ਸਿੱਖਣ ਦਾ ਆਨੰਦ ਆ ਰਿਹਾ ਹੈ।',
      lang: 'en',
      targetLang: 'pa',
      side: 'right',
      time: '10:15 AM',
    },
  ]);

  const [leftLang, setLeftLang] = useState('pa');
  const [rightLang, setRightLang] = useState('en');
  const [conversationTone, setConversationTone] = useState<'auto' | 'indian' | 'casual' | 'formal' | 'natural'>('auto');
  const [speakerAGender, setSpeakerAGender] = useState<'female' | 'male' | 'auto'>('female');
  const [speakerAPersona, setSpeakerAPersona] = useState<'standard' | 'young' | 'mature'>('standard');
  const [speakerBGender, setSpeakerBGender] = useState<'male' | 'female' | 'auto'>('male');
  const [speakerBPersona, setSpeakerBPersona] = useState<'standard' | 'young' | 'mature'>('standard');
  const [activeSpeaker, setActiveSpeaker] = useState<'left' | 'right' | null>(null);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [interimChat, setInterimChat] = useState('');
  const [isTranslatingChat, setIsTranslatingChat] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isProcessingRef = useRef<boolean>(false);
  const lastConvSpokenRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimChat]);

  const handleTogglePlayMessage = (idx: number, translatedText: string, targetLang: string, side: 'left' | 'right') => {
    if (speakingIdx === idx) {
      stopSpeaking();
      setSpeakingIdx(null);
      return;
    }
    stopSpeaking();
    setSpeakingIdx(idx);

    // Speaker A is on left, Speaker B is on right
    const isLeft = side === 'left';
    const effectiveGender = isLeft
      ? (speakerAGender === 'auto' ? settings.voiceGender : speakerAGender)
      : (speakerBGender === 'auto' ? settings.voiceGender : speakerBGender);
    const effectivePersona = isLeft
      ? (speakerAPersona === 'standard' ? settings.voicePersona : speakerAPersona)
      : (speakerBPersona === 'standard' ? settings.voicePersona : speakerBPersona);

    speakText(translatedText, targetLang, {
      tone: conversationTone as any,
      gender: effectiveGender,
      persona: effectivePersona,
      isolateSpeaker: true,
      onStart: () => setSpeakingIdx(idx),
      onEnd: () => setSpeakingIdx(null),
      onError: () => setSpeakingIdx(null),
    });
  };

  const handleCopyMessage = (idx: number, text: string) => {
    copyToClipboard(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
    toast.success('Copied to clipboard');
  };

  const startSpeaker = (side: 'left' | 'right') => {
    stopSpeaking();
    setSpeakingIdx(null);

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      toast.error('Web Speech API is not supported in this browser.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const src = side === 'left' ? leftLang : rightLang;
      recognition.lang = BCP47_SPEECH_MAP[src] || src;

      recognition.onstart = () => {
        setActiveSpeaker(side);
        setInterimChat('');
      };

      recognition.onresult = (event: any) => {
        let finalStr = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalStr += event.results[i][0].transcript;
          else setInterimChat(event.results[i][0].transcript);
        }
        if (finalStr.trim()) {
          try { recognition.abort(); } catch { try { recognition.stop(); } catch {} }
          setInterimChat('');
          handleProcessConversation(side, finalStr.trim());
        }
      };

      recognition.onerror = () => {
        setActiveSpeaker(null);
        setInterimChat('');
      };
      recognition.onend = () => setActiveSpeaker(null);
      recognition.start();
    } catch {
      setActiveSpeaker(null);
    }
  };

  const stopSpeaker = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { try { recognitionRef.current.stop(); } catch {} }
    }
    setActiveSpeaker(null);
  };

  const handleProcessConversation = async (side: 'left' | 'right', text: string) => {
    const cleanText = text?.trim();
    if (!cleanText || isProcessingRef.current) return;

    const now = Date.now();
    if (cleanText === lastConvSpokenRef.current.text && now - lastConvSpokenRef.current.time < 2200) {
      return; // Skip duplicate speech processing
    }
    lastConvSpokenRef.current = { text: cleanText, time: now };

    isProcessingRef.current = true;
    setIsTranslatingChat(true);
    setInterimChat('');

    try {
      let src = side === 'left' ? leftLang : rightLang;
      let tgt = side === 'left' ? rightLang : leftLang;

      // Smart script alignment
      const hasGurmukhi = /[\u0A00-\u0A7F]/.test(text);
      const hasDevanagari = /[\u0900-\u097F]/.test(text);
      const isPureLatin = /^[A-Za-z0-9\s.,!?'"()-]+$/.test(text);

      if (src === 'pa' && isPureLatin) {
        src = 'en';
        tgt = 'pa';
      } else if (src === 'en' && (hasGurmukhi || hasDevanagari)) {
        src = hasGurmukhi ? 'pa' : 'hi';
        tgt = 'en';
      }

      const sendTone = conversationTone === 'auto' || conversationTone === 'indian' ? undefined : conversationTone;
      const res = await translateText(text, src, tgt, sendTone);
      const newMsg: ConvMessage = {
        text,
        translated: res.translated_text,
        lang: src,
        targetLang: tgt,
        side,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, newMsg]);

      // Speaker A (left) was speaking: Speaker A's translated speech is spoken aloud to Speaker B.
      // Use Speaker A's gender and persona!
      const isLeft = side === 'left';
      const effectiveGender = isLeft
        ? (speakerAGender === 'auto' ? settings.voiceGender : speakerAGender)
        : (speakerBGender === 'auto' ? settings.voiceGender : speakerBGender);
      const effectivePersona = isLeft
        ? (speakerAPersona === 'standard' ? settings.voicePersona : speakerAPersona)
        : (speakerBPersona === 'standard' ? settings.voicePersona : speakerBPersona);

      const currentIdx = messages.length;
      setSpeakingIdx(currentIdx);
      stopSpeaking();
      await speakText(res.translated_text, tgt, {
        tone: conversationTone as any,
        gender: effectiveGender,
        persona: effectivePersona,
        isolateSpeaker: true,
        onStart: () => setSpeakingIdx(currentIdx),
        onEnd: () => setSpeakingIdx(null),
        onError: () => setSpeakingIdx(null),
      });
    } catch {
      toast.error('Conversation translation failed');
    } finally {
      setIsTranslatingChat(false);
      isProcessingRef.current = false;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="app-card p-4 rounded-2xl flex items-center justify-between gap-4 relative z-50">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] flex items-center justify-center">
              A
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Speaker A</span>
          </div>
          <LanguagePicker value={leftLang} onChange={setLeftLang} showAutoDetect={false} />
        </div>

        <button
          onClick={() => {
            const temp = leftLang;
            setLeftLang(rightLang);
            setRightLang(temp);
          }}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-teal-600 dark:text-teal-400 mt-5 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs"
          title="Swap Speakers"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1.5 justify-end">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Speaker B</span>
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[11px] flex items-center justify-center">
              B
            </span>
          </div>
          <LanguagePicker value={rightLang} onChange={setRightLang} showAutoDetect={false} align="right" />
        </div>
      </div>

      {/* Modern Tone & Voice Control Strip */}
      <div className="app-card p-3.5 rounded-2xl space-y-3">
        {/* Row 1: Tone Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Tone Modulation:</span>
          </div>
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200 dark:border-slate-700">
            {[
              { id: 'auto', label: '⚡ Auto' },
              { id: 'indian', label: '🇮🇳 Indian' },
              { id: 'casual', label: '🤝 Casual' },
              { id: 'formal', label: '👔 Formal' },
              { id: 'natural', label: '⚖️ Natural' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setConversationTone(id as any)}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all font-medium cursor-pointer text-xs',
                  conversationTone === id
                    ? 'bg-teal-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Speaker A & Speaker B Voice Profiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Speaker A Profile */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px] flex items-center justify-center shrink-0">
                A
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Speaker A:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={speakerAGender}
                onChange={(e) => setSpeakerAGender(e.target.value as any)}
                className="p-1 px-1.5 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium cursor-pointer"
                title="Speaker A Gender"
              >
                <option value="female">👩 Female</option>
                <option value="male">👨 Male</option>
                <option value="auto">🤖 Auto</option>
              </select>
              <select
                value={speakerAPersona}
                onChange={(e) => setSpeakerAPersona(e.target.value as any)}
                className="p-1 px-1.5 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium cursor-pointer"
                title="Speaker A Vocal Age"
              >
                <option value="standard">👤 Natural</option>
                <option value="young">🧒 Young</option>
                <option value="mature">👔 Mature</option>
              </select>
            </div>
          </div>

          {/* Speaker B Profile */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                B
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Speaker B:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={speakerBGender}
                onChange={(e) => setSpeakerBGender(e.target.value as any)}
                className="p-1 px-1.5 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium cursor-pointer"
                title="Speaker B Gender"
              >
                <option value="male">👨 Male</option>
                <option value="female">👩 Female</option>
                <option value="auto">🤖 Auto</option>
              </select>
              <select
                value={speakerBPersona}
                onChange={(e) => setSpeakerBPersona(e.target.value as any)}
                className="p-1 px-1.5 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium cursor-pointer"
                title="Speaker B Vocal Age"
              >
                <option value="standard">👤 Natural</option>
                <option value="young">🧒 Young</option>
                <option value="mature">👔 Mature</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Live Speaking / Listening Banner */}
      {activeSpeaker && (
        <div className="p-3.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs font-bold text-teal-700 dark:text-teal-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>Speaker {activeSpeaker === 'left' ? 'A' : 'B'} is speaking...</span>
            <div className="flex items-center gap-0.5 h-3.5 text-teal-600 dark:text-teal-400 ml-1">
              <span className="soundwave-bar-1 w-1 bg-current rounded-full" />
              <span className="soundwave-bar-2 w-1 bg-current rounded-full" />
              <span className="soundwave-bar-3 w-1 bg-current rounded-full" />
              <span className="soundwave-bar-4 w-1 bg-current rounded-full" />
            </div>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-300 italic max-w-[50%] truncate font-medium">
            {interimChat || 'Listening for speech...'}
          </span>
        </div>
      )}

      {/* Message History Chat Pane */}
      <div className="app-card p-6 min-h-[400px] max-h-[520px] overflow-y-auto space-y-4 rounded-2xl">
        {messages.map((msg, i) => {
          const isLeft = msg.side === 'left';
          const isMsgSpeaking = speakingIdx === i;

          return (
            <div
              key={i}
              className={cn('flex items-end gap-2.5', isLeft ? 'justify-start' : 'justify-end')}
            >
              {isLeft && (
                <div
                  className={cn(
                    'w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs mb-1',
                    isMsgSpeaking && 'speaking-pulse ring-2 ring-teal-500'
                  )}
                >
                  A
                </div>
              )}

              <div
                className={cn(
                  'max-w-[82%] rounded-2xl p-4 shadow-xs space-y-2 relative transition-all',
                  isLeft
                    ? 'bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-bl-xs text-slate-900 dark:text-slate-100'
                    : 'bg-teal-600 text-white rounded-br-xs shadow-teal-500/10'
                )}
              >
                {/* Header within bubble */}
                <div className="flex items-center justify-between gap-3 text-[11px] font-mono opacity-80">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{isLeft ? 'Speaker A' : 'Speaker B'}</span>
                    <span className="text-[10px] opacity-75">{msg.time}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Speaking Soundwave Equalizer */}
                    {isMsgSpeaking && (
                      <div
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                          isLeft ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300' : 'bg-white/20 text-white'
                        )}
                      >
                        <div className="flex items-center gap-0.5 h-3">
                          <span className="soundwave-bar-1 w-0.5 bg-current rounded-full" />
                          <span className="soundwave-bar-2 w-0.5 bg-current rounded-full" />
                          <span className="soundwave-bar-3 w-0.5 bg-current rounded-full" />
                          <span className="soundwave-bar-4 w-0.5 bg-current rounded-full" />
                        </div>
                        <span>Speaking</span>
                      </div>
                    )}

                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopyMessage(i, `${msg.text}\n${msg.translated}`)}
                      className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      title="Copy message"
                    >
                      {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {/* Listen / Stop Button */}
                    <button
                      onClick={() => handleTogglePlayMessage(i, msg.translated, msg.targetLang, msg.side)}
                      className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      title={isMsgSpeaking ? 'Stop voice' : 'Listen translation'}
                    >
                      {isMsgSpeaking ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Spoken Original */}
                <p className="text-sm font-semibold leading-relaxed">{msg.text}</p>

                {/* Translated Result */}
                <div
                  className={cn(
                    'pt-2 border-t text-xs leading-relaxed font-normal',
                    isLeft ? 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300' : 'border-white/20 text-white/95'
                  )}
                >
                  <span className="text-[10px] uppercase font-bold opacity-75 mr-1">
                    [{msg.targetLang.toUpperCase()}]:
                  </span>
                  {msg.translated}
                </div>
              </div>

              {!isLeft && (
                <div
                  className={cn(
                    'w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs mb-1',
                    isMsgSpeaking && 'speaking-pulse ring-2 ring-teal-300'
                  )}
                >
                  B
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Push to Talk Controls */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => (activeSpeaker === 'left' ? stopSpeaker() : startSpeaker('left'))}
          className={cn(
            'p-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs active:scale-98',
            activeSpeaker === 'left'
              ? 'bg-rose-600 text-white ring-4 ring-rose-300 dark:ring-rose-900'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
          )}
        >
          {activeSpeaker === 'left' ? (
            <>
              <MicOff className="w-5 h-5" />
              <span>Stop Speaking (A)</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Speak as Speaker A</span>
            </>
          )}
        </button>

        <button
          onClick={() => (activeSpeaker === 'right' ? stopSpeaker() : startSpeaker('right'))}
          className={cn(
            'p-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs active:scale-98',
            activeSpeaker === 'right'
              ? 'bg-rose-600 text-white ring-4 ring-rose-300 dark:ring-rose-900'
              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/20'
          )}
        >
          {activeSpeaker === 'right' ? (
            <>
              <MicOff className="w-5 h-5" />
              <span>Stop Speaking (B)</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 text-white" />
              <span>Speak as Speaker B</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── DUAL-PANEL DOCUMENT TRANSLATION ────────────────────────────────── */
function DocumentTranslation() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translatedData, setTranslatedData] = useState<any | null>(null);
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('pa');
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = async (selected: File) => {
    setFile(selected);
    setTranslatedData(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));

    setParsing(true);
    try {
      const data = await parseDocument(selected);
      setParsedData(data);
      if (data.detected_language?.language) setDetectedLang(data.detected_language.language);
      toast.success(`Loaded ${data.total_pages} page(s)`);
    } catch {
      // Non-fatal
    } finally {
      setParsing(false);
    }
  };

  const handleTranslate = async () => {
    if (!file) return;
    setTranslating(true);
    try {
      const data = await translateDocument(file, sourceLang, targetLang);
      setTranslatedData(data);
      toast.success('Document translation complete!');
    } catch (err: any) {
      toast.error('Document translation error: ' + (err.message || 'Check backend'));
    } finally {
      setTranslating(false);
    }
  };

  const handleExport = async (format: 'docx' | 'pdf' | 'txt') => {
    if (!translatedData || !file) return;
    try {
      const blob = await exportDocument({
        filename: file.name,
        format,
        target_lang: targetLang,
        source_lang: sourceLang === 'auto' ? detectedLang || 'en' : sourceLang,
        pages: translatedData.pages,
        paragraphs: translatedData.paragraphs,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      a.download = `${baseName}_${targetLang}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error('Export failed: ' + (err.message || 'Error exporting file'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <div className="app-card p-5 relative z-50">
        <div className="grid lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-4 space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">1. Document Language</label>
            <LanguagePicker value={sourceLang} onChange={setSourceLang} showAutoDetect detectedLang={detectedLang} />
          </div>
          <div className="lg:col-span-1 flex justify-center">
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="lg:col-span-4 space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">2. Target Language</label>
            <LanguagePicker value={targetLang} onChange={setTargetLang} />
          </div>
          <div className="lg:col-span-3 flex items-end">
            <button
              onClick={handleTranslate}
              disabled={!file || translating}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-teal-600 hover:bg-teal-700 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {translating ? 'Translating Document...' : 'Translate Document'}
            </button>
          </div>
        </div>
      </div>

      {/* Dual Panel Preview */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Left Panel: Original Document */}
        <div className="app-card min-h-[500px] p-5 flex flex-col justify-between">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center cursor-pointer hover:border-teal-500 transition-colors"
            >
              <Upload className="w-10 h-10 text-teal-600 dark:text-teal-400 mb-3" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Upload PDF, DOCX, or TXT</h4>
              <p className="text-xs text-slate-500 mt-1">Click to browse or drop file here</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
                >
                  Change File
                </button>
              </div>

              {parsing ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
                  <p className="text-xs font-medium">Parsing document structure...</p>
                </div>
              ) : parsedData?.pages ? (
                <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                  {parsedData.pages.map((page: any) => (
                    <div key={page.page_number} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono pb-1 border-b border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-teal-600">Page {page.page_number}</span>
                        <span>{page.paragraphs?.length || 0} paragraph(s)</span>
                      </div>
                      {(page.paragraphs || []).map((p: any, idx: number) => {
                        const txt = typeof p === 'string' ? p : p.original || p.text || '';
                        return <p key={idx} className="leading-relaxed">{txt}</p>;
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">
                  Document loaded. Click Translate Document to view translation.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Translated Output */}
        <div className="app-card min-h-[500px] p-5 flex flex-col justify-between">
          {translating ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Translating Document...</p>
              <p className="text-xs text-slate-500 mt-1">NLLB-200 offline neural model is translating all paragraphs.</p>
            </div>
          ) : !translatedData ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <BookOpen className="w-10 h-10 mb-3 opacity-40 text-teal-600" />
              <p className="text-sm font-semibold">Translated document will appear here</p>
              <p className="text-xs text-slate-500 mt-1">Upload a document and select Translate Document to begin.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Translated Document ({targetLang.toUpperCase()})
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    ✓ Ready
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {(['docx', 'pdf', 'txt'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => handleExport(fmt)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600 border border-slate-200 dark:border-slate-700 transition-colors uppercase cursor-pointer"
                      title={`Download as ${fmt.toUpperCase()}`}
                    >
                      <Download className="w-3 h-3 inline mr-1" />
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1 flex-1">
                {(translatedData.pages || []).map((page: any) => (
                  <div key={page.page_number} className="p-3.5 rounded-xl bg-teal-50/20 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/60 text-xs text-slate-800 dark:text-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono pb-1 border-b border-teal-100 dark:border-teal-900/40">
                      <span className="font-bold text-teal-600 dark:text-teal-400">Page {page.page_number}</span>
                      <span className="text-slate-500">{page.paragraphs?.length || 0} paragraph(s)</span>
                    </div>
                    {(page.paragraphs || []).map((p: any, idx: number) => {
                      const txt = typeof p === 'string' ? p : p.translated || p.text || '';
                      return <p key={idx} className="leading-relaxed font-medium">{txt}</p>;
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
