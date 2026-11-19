import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AccentTheme = 'teal' | 'indigo' | 'emerald' | 'violet' | 'amber' | 'cyan';
export type VoiceGender = 'female' | 'male' | 'auto';
export type VoicePersona = 'standard' | 'young' | 'mature';
export type VoiceTone = 'indian' | 'casual' | 'formal' | 'native';

interface SettingsState {
  theme: 'dark' | 'light';
  accentTheme: AccentTheme;
  selectedVoice: string;
  voiceGender: VoiceGender;
  voicePersona: VoicePersona;
  voiceTone: VoiceTone;
  uiLanguage: string;
  highContrast: boolean;
  reducedMotion: boolean;
  defaultSourceLang: string;
  defaultTargetLang: string;
  autoDetect: boolean;
  useLoraModel: boolean;
  sidebarCollapsed: boolean;
  toggleTheme: () => void;
  setTheme: (t: 'dark' | 'light') => void;
  setAccentTheme: (a: AccentTheme) => void;
  setSelectedVoice: (v: string) => void;
  setVoiceGender: (g: VoiceGender) => void;
  setVoicePersona: (p: VoicePersona) => void;
  setVoiceTone: (t: VoiceTone) => void;
  setUiLanguage: (l: string) => void;
  setHighContrast: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setDefaultSourceLang: (l: string) => void;
  setDefaultTargetLang: (l: string) => void;
  setAutoDetect: (v: boolean) => void;
  setUseLoraModel: (v: boolean) => void;
  setSidebarCollapsed: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      accentTheme: 'teal',
      selectedVoice: '',
      voiceGender: 'auto',
      voicePersona: 'standard',
      voiceTone: 'indian',
      uiLanguage: 'en',
      highContrast: false,
      reducedMotion: false,
      defaultSourceLang: 'auto',
      defaultTargetLang: 'hi',
      autoDetect: true,
      useLoraModel: false,
      sidebarCollapsed: false,
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setTheme: (t) => set({ theme: t }),
      setAccentTheme: (a) => set({ accentTheme: a }),
      setSelectedVoice: (v) => set({ selectedVoice: v }),
      setVoiceGender: (g) => {
        if (typeof window !== 'undefined') localStorage.setItem('lb_voice_gender', g);
        set({ voiceGender: g });
      },
      setVoicePersona: (p) => {
        if (typeof window !== 'undefined') localStorage.setItem('lb_voice_persona', p);
        set({ voicePersona: p });
      },
      setVoiceTone: (t) => {
        if (typeof window !== 'undefined') localStorage.setItem('lb_voice_tone', t);
        set({ voiceTone: t });
      },
      setUiLanguage: (l) => set({ uiLanguage: l }),
      setHighContrast: (v) => set({ highContrast: v }),
      setReducedMotion: (v) => set({ reducedMotion: v }),
      setDefaultSourceLang: (l) => set({ defaultSourceLang: l }),
      setDefaultTargetLang: (l) => set({ defaultTargetLang: l }),
      setAutoDetect: (v) => set({ autoDetect: v }),
      setUseLoraModel: (v) => set({ useLoraModel: v }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    }),
    { name: 'linguabridge-settings' }
  )
);
