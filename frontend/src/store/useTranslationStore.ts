import { create } from 'zustand';

interface TranslationState {
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  detectedLang: string | null;
  confidence: number | null;
  detectedTone: string | null;
  isTranslating: boolean;
  error: string | null;
  tone: 'formal' | 'casual' | 'neutral';
  alternatives: string[];
  latencyMs: number | null;
  setSourceText: (text: string) => void;
  setTargetText: (text: string) => void;
  setSourceLang: (lang: string) => void;
  setTargetLang: (lang: string) => void;
  setDetectedLang: (lang: string | null, confidence?: number | null) => void;
  setDetectedTone: (tone: string | null) => void;
  swapLanguages: () => void;
  setTone: (tone: 'formal' | 'casual' | 'neutral') => void;
  setTranslating: (v: boolean) => void;
  setError: (e: string | null) => void;
  setResult: (text: string, alternatives?: string[], latency?: number, detectedTone?: string) => void;
  clear: () => void;
}

export const useTranslationStore = create<TranslationState>((set, get) => ({
  sourceText: '',
  targetText: '',
  sourceLang: 'auto',
  targetLang: 'hi',
  detectedLang: null,
  confidence: null,
  detectedTone: null,
  isTranslating: false,
  error: null,
  tone: 'neutral',
  alternatives: [],
  latencyMs: null,
  setSourceText: (text) => set({ sourceText: text, error: null }),
  setTargetText: (text) => set({ targetText: text }),
  setSourceLang: (lang) => set({ sourceLang: lang }),
  setTargetLang: (lang) => set({ targetLang: lang }),
  setDetectedLang: (lang, confidence) => set({ detectedLang: lang, confidence: confidence ?? null }),
  setDetectedTone: (tone) => set({ detectedTone: tone }),
  swapLanguages: () => {
    const { sourceLang, targetLang, sourceText, targetText, detectedLang } = get();
    const newSource = detectedLang || (sourceLang === 'auto' ? 'en' : sourceLang);
    set({
      sourceLang: targetLang,
      targetLang: newSource,
      sourceText: targetText,
      targetText: sourceText,
      detectedLang: null,
      confidence: null,
    });
  },
  setTone: (tone) => set({ tone }),
  setTranslating: (v) => set({ isTranslating: v }),
  setError: (e) => set({ error: e, isTranslating: false }),
  setResult: (text, alternatives, latency, detectedTone) => set({
    targetText: text,
    alternatives: alternatives || [],
    latencyMs: latency ?? null,
    detectedTone: detectedTone ?? null,
    isTranslating: false,
    error: null,
  }),
  clear: () => set({
    sourceText: '', targetText: '', detectedLang: null, confidence: null, detectedTone: null,
    isTranslating: false, error: null, alternatives: [], latencyMs: null,
  }),
}));
