import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Globe, Languages, Brain, Info, Moon, Sun,
  ShieldCheck, Cpu, Sparkles, Check, Volume2, Database,
  Keyboard, Download, Trash2, Sliders, AlertTriangle, Monitor,
  Play, Square, Radio
} from 'lucide-react';
import { useSettingsStore, type AccentTheme, type VoiceTone } from '@/store/useSettingsStore';
import { clearAllHistory, getHistory } from '@/lib/api';
import LanguagePicker from '@/components/translation/LanguagePicker';
import { cn, getVoicesAsync, speakText, stopSpeaking, isSpeaking, isVoiceGender } from '@/lib/utils';
import { SUPPORTED_UI_LANGUAGES } from '@/lib/constants';
import { toast } from 'sonner';

const ACCENT_OPTIONS: Array<{ id: AccentTheme; name: string; hex: string; desc: string }> = [
  { id: 'teal', name: 'Ocean Teal', hex: '#0D9488', desc: 'Clean neural teal' },
  { id: 'indigo', name: 'Electric Iris', hex: '#6366f1', desc: 'Enterprise neural indigo' },
  { id: 'emerald', name: 'Emerald Mint', hex: '#10b981', desc: 'Vibrant clean tech green' },
  { id: 'violet', name: 'Royal Amethyst', hex: '#8b5cf6', desc: 'Modern luxury purple' },
  { id: 'amber', name: 'Amber Saffron', hex: '#f59e0b', desc: 'Warm Indic saffron gold' },
  { id: 'cyan', name: 'Cyber Cyan', hex: '#06b6d4', desc: 'Futuristic aqua glow' },
];

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const settings = useSettingsStore();

  // Voice synthesis states (stored in localStorage)
  const [speechRate, setSpeechRate] = useState<number>(() => {
    return parseFloat(localStorage.getItem('lb_speech_rate') || '0.95');
  });
  const [speechPitch, setSpeechPitch] = useState<number>(() => {
    return parseFloat(localStorage.getItem('lb_speech_pitch') || '1.0');
  });
  const [voiceTone, setVoiceTone] = useState<VoiceTone>(() => {
    return (localStorage.getItem('lb_voice_tone') as any) || settings.voiceTone || 'indian';
  });
  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    return localStorage.getItem('lb_auto_speak') === 'true';
  });

  // Voice selection & preview states
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    return settings.selectedVoice || (typeof window !== 'undefined' ? localStorage.getItem('lb_selected_voice') || '' : '');
  });
  const [isPreviewSpeaking, setIsPreviewSpeaking] = useState<boolean>(false);

  useEffect(() => {
    getVoicesAsync().then((voices) => {
      setAvailableVoices(voices);
      if (!selectedVoice && voices.length > 0) {
        const defaultIndian = voices.find((v) => {
          const n = v.name.toLowerCase();
          const l = v.lang.toLowerCase();
          return l.includes('hi') || l === 'en-in' || n.includes('swara') || n.includes('heera') || n.includes('ravi') || n.includes('punjabi');
        });
        if (defaultIndian) {
          setSelectedVoice(defaultIndian.name);
          localStorage.setItem('lb_selected_voice', defaultIndian.name);
          settings.setSelectedVoice(defaultIndian.name);
        }
      }
    });

    return () => {
      stopSpeaking();
    };
  }, []);

  const handleVoiceChange = (vName: string) => {
    setSelectedVoice(vName);
    localStorage.setItem('lb_selected_voice', vName);
    settings.setSelectedVoice(vName);
    toast.success(`Voice set to: ${vName || 'System Default'}`);
  };

  const handleGenderChange = (g: 'female' | 'male' | 'auto') => {
    settings.setVoiceGender(g);
    localStorage.setItem('lb_voice_gender', g);
    if (g !== 'auto' && availableVoices.length > 0) {
      const matching = availableVoices.find(v => isVoiceGender(v, g));
      if (matching) {
        setSelectedVoice(matching.name);
        localStorage.setItem('lb_selected_voice', matching.name);
        settings.setSelectedVoice(matching.name);
      }
    }
    toast.success(`Voice gender profile set to: ${g === 'female' ? '👩 Female' : g === 'male' ? '👨 Male' : '🤖 Auto'}`);
  };

  const handlePersonaChange = (p: 'standard' | 'young' | 'mature') => {
    settings.setVoicePersona(p);
    localStorage.setItem('lb_voice_persona', p);
    toast.success(`Vocal persona set to ${p === 'young' ? '🧒 Youthful' : p === 'mature' ? '👔 Mature' : '👤 Natural'}`);
  };

  const handlePreviewVoice = async () => {
    if (isPreviewSpeaking) {
      stopSpeaking();
      setIsPreviewSpeaking(false);
      return;
    }
    setIsPreviewSpeaking(true);
    toast.info(`Playing ${settings.voiceGender} voice preview in Punjabi & English...`);
    await speakText(
      'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! LinguaBridge ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। Welcome to LinguaBridge!',
      'pa',
      {
        voiceName: selectedVoice,
        rate: speechRate,
        pitch: speechPitch,
        gender: settings.voiceGender,
        persona: settings.voicePersona,
        tone: voiceTone as any,
        onStart: () => setIsPreviewSpeaking(true),
        onEnd: () => setIsPreviewSpeaking(false),
        onError: () => setIsPreviewSpeaking(false),
      }
    );
  };

  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleSpeechRateChange = (val: number) => {
    setSpeechRate(val);
    localStorage.setItem('lb_speech_rate', val.toString());
  };

  const handleSpeechPitchChange = (val: number) => {
    setSpeechPitch(val);
    localStorage.setItem('lb_speech_pitch', val.toString());
  };

  const handleVoiceToneChange = (val: VoiceTone) => {
    setVoiceTone(val);
    settings.setVoiceTone(val);
    localStorage.setItem('lb_voice_tone', val);
  };

  const handleAutoSpeakChange = (val: boolean) => {
    setAutoSpeak(val);
    localStorage.setItem('lb_auto_speak', val ? 'true' : 'false');
  };

  const handleBackupExport = async () => {
    try {
      const historyData = await getHistory(1, 500);
      const backup = {
        app: 'LinguaBridge',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        settings: {
          theme: settings.theme,
          uiLanguage: settings.uiLanguage,
          defaultTargetLang: settings.defaultTargetLang,
          autoDetect: settings.autoDetect,
          speechRate,
          speechPitch,
          voiceTone,
          autoSpeak,
        },
        history: historyData.items || [],
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linguabridge_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('App settings & history backup downloaded');
    } catch {
      toast.error('Failed to create backup file');
    }
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await clearAllHistory();
      setShowClearModal(false);
      toast.success('All history & cached translations cleared');
    } catch {
      toast.error('Failed to clear cache');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-['Space_Grotesk'] text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <span className="gradient-text">Settings</span> & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure interface appearance, offline speech synthesis, storage backups, and ML models.
        </p>
      </div>

      {/* ── Section 1: Appearance & Display Theme ── */}
      <div className="app-card p-6 space-y-5">
        <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Palette className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Interface Theme & Appearance
          </h2>
        </div>

        {/* Visual Theme Selector Cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Dark Mode Card */}
          <button
            type="button"
            onClick={() => settings.setTheme('dark')}
            className={cn(
              'p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-36 relative overflow-hidden group',
              settings.theme === 'dark'
                ? 'border-teal-500 bg-slate-900 ring-2 ring-teal-500/30 shadow-md'
                : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 hover:border-slate-400'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-teal-400" />
                <span className="font-bold text-sm text-white">Dark Slate Obsidian</span>
              </div>
              {settings.theme === 'dark' && (
                <span className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            {/* Mini preview */}
            <div className="w-full bg-[#0b0f19] p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <div className="h-2 w-16 bg-slate-700 rounded-sm" />
              <div className="h-2 w-24 bg-slate-800 rounded-sm ml-auto" />
            </div>

            <p className="text-[11px] text-slate-400">Deep slate low-light contrast optimized for dark rooms</p>
          </button>

          {/* Light Mode Card */}
          <button
            type="button"
            onClick={() => settings.setTheme('light')}
            className={cn(
              'p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-36 relative overflow-hidden group',
              settings.theme === 'light'
                ? 'border-teal-500 bg-white ring-2 ring-teal-500/30 shadow-md'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-400'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-500" />
                <span className="font-bold text-sm text-slate-900">Pristine Enterprise Light</span>
              </div>
              {settings.theme === 'light' && (
                <span className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            {/* Mini preview */}
            <div className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
              <div className="h-2 w-16 bg-slate-300 rounded-sm" />
              <div className="h-2 w-24 bg-slate-200 rounded-sm ml-auto" />
            </div>

            <p className="text-[11px] text-slate-500">High-clarity executive light theme with crisp typography</p>
          </button>
        </div>

        {/* Accent Color Palettes */}
        <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800/80">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-500" />
            <span>Theme Accent Palette</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {ACCENT_OPTIONS.map((accent) => {
              const isActive = (settings.accentTheme || 'teal') === accent.id;
              return (
                <button
                  key={accent.id}
                  type="button"
                  onClick={() => {
                    settings.setAccentTheme(accent.id);
                    toast.success(`Theme accent set to ${accent.name}`);
                  }}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2',
                    isActive
                      ? 'border-teal-500 dark:border-teal-400 bg-teal-50/60 dark:bg-teal-950/40 ring-2 ring-teal-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 hover:border-slate-400'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-4 h-4 rounded-full shadow-xs" style={{ backgroundColor: accent.hex }} />
                    {isActive && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{accent.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{accent.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contrast & Animation Toggles */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">High Contrast Borders</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Increase outline visibility around cards and inputs</div>
            </div>
            <button
              onClick={() => settings.setHighContrast(!settings.highContrast)}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                settings.highContrast ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform duration-200',
                  settings.highContrast ? 'translate-x-5.5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Reduced Motion</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Minimize animations for faster page responsiveness</div>
            </div>
            <button
              onClick={() => settings.setReducedMotion(!settings.reducedMotion)}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                settings.reducedMotion ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform duration-200',
                  settings.reducedMotion ? 'translate-x-5.5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 2: Speech Synthesis & Audio Engine ── */}
      <div className="app-card p-6 space-y-5">
        <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Volume2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Voice Synthesis & Audio Pronunciation
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Speech Rate Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Speaking Speed Rate</span>
              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{speechRate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.35"
              step="0.05"
              value={speechRate}
              onChange={(e) => handleSpeechRateChange(parseFloat(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.75x (Gentle)</span>
              <span>1.0x (Normal)</span>
              <span>1.35x (Fast)</span>
            </div>
          </div>

          {/* Voice Pitch Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Voice Pitch</span>
              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{speechPitch.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.80"
              max="1.25"
              step="0.05"
              value={speechPitch}
              onChange={(e) => handleSpeechPitchChange(parseFloat(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.80 (Deep)</span>
              <span>1.0 (Standard)</span>
              <span>1.25 (Bright)</span>
            </div>
          </div>
        </div>

        {/* Voice Selection & Real-Time Audio Preview */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Select Speech Synthesis Voice
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose an Indian or system voice (Swara, Madhur, Heera, Ravi, Neerja, etc.)
              </div>
            </div>

            <button
              type="button"
              onClick={handlePreviewVoice}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs',
                isPreviewSpeaking
                  ? 'bg-rose-600 text-white'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              )}
            >
              {isPreviewSpeaking ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Playing</span>
                  <div className="flex items-center gap-0.5 ml-1">
                    <span className="soundwave-bar-1 w-1 bg-white rounded-full" />
                    <span className="soundwave-bar-2 w-1 bg-white rounded-full" />
                    <span className="soundwave-bar-3 w-1 bg-white rounded-full" />
                    <span className="soundwave-bar-4 w-1 bg-white rounded-full" />
                  </div>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Preview Selected Voice</span>
                </>
              )}
            </button>
          </div>

          <div>
            <select
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium cursor-pointer focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            >
              <option value="">Auto-Detect Optimal Natural Voice (Recommended)</option>
              {availableVoices.filter((v) => {
                const l = v.lang.toLowerCase();
                const n = v.name.toLowerCase();
                return (
                  l.includes('hi') ||
                  l === 'en-in' ||
                  l.startsWith('pa') ||
                  n.includes('swara') ||
                  n.includes('heera') ||
                  n.includes('ravi') ||
                  n.includes('madhur') ||
                  n.includes('neerja') ||
                  n.includes('india')
                );
              }).length > 0 && (
                <optgroup label="🇮🇳 Recommended Indian Voices (Authentic Pronunciation)">
                  {availableVoices
                    .filter((v) => {
                      const l = v.lang.toLowerCase();
                      const n = v.name.toLowerCase();
                      return (
                        l.includes('hi') ||
                        l === 'en-in' ||
                        l.startsWith('pa') ||
                        n.includes('swara') ||
                        n.includes('heera') ||
                        n.includes('ravi') ||
                        n.includes('madhur') ||
                        n.includes('neerja') ||
                        n.includes('india')
                      );
                    })
                    .map((v) => (
                      <option key={v.name} value={v.name}>
                        🇮🇳 {v.name} ({v.lang})
                      </option>
                    ))}
                </optgroup>
              )}
              <optgroup label="🌐 All System Voices">
                {availableVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Voice Gender & Age Group / Persona Controls */}
        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          {/* Gender Selector */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Voice Gender / Speaker Profile</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'female', label: '👩 Female' },
                { id: 'male', label: '👨 Male' },
                { id: 'auto', label: '🤖 Auto' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleGenderChange(id as any)}
                  className={cn(
                    'py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer text-center',
                    settings.voiceGender === id
                      ? 'bg-teal-600 text-white shadow-xs font-semibold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Age Group / Vocal Style */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Vocal Age / Persona Style</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'young', label: '🧒 Youthful' },
                { id: 'standard', label: '👤 Natural' },
                { id: 'mature', label: '👔 Mature' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handlePersonaChange(id as any)}
                  className={cn(
                    'py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer text-center',
                    settings.voicePersona === id
                      ? 'bg-teal-600 text-white shadow-xs font-semibold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pronunciation Accent & Tone Controls */}
        <div className="grid sm:grid-cols-2 gap-4 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pronunciation Tone & Cadence</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleVoiceToneChange('indian')}
                className={cn(
                  'py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer',
                  voiceTone === 'indian'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                )}
              >
                🇮🇳 Indian Cadence
              </button>
              <button
                type="button"
                onClick={() => handleVoiceToneChange('casual')}
                className={cn(
                  'py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer',
                  voiceTone === 'casual'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                )}
              >
                🤝 Casual & Friendly
              </button>
              <button
                type="button"
                onClick={() => handleVoiceToneChange('formal')}
                className={cn(
                  'py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer',
                  voiceTone === 'formal'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                )}
              >
                👔 Formal Respectful
              </button>
              <button
                type="button"
                onClick={() => handleVoiceToneChange('native')}
                className={cn(
                  'py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer',
                  voiceTone === 'native'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                )}
              >
                🌐 Global Native
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Auto-Speak Translations</div>
              <div className="text-[11px] text-slate-400">Read output aloud immediately on voice input</div>
            </div>
            <button
              onClick={() => handleAutoSpeakChange(!autoSpeak)}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                autoSpeak ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform duration-200',
                  autoSpeak ? 'translate-x-5.5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 3: Data & Storage Management ── */}
      <div className="app-card p-6 space-y-5">
        <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Database className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Local Data & Storage Management
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Export Full App Backup */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Backup & Data Export
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Download your complete translation history, starred items, and preferences as a portable JSON file.
            </p>
            <button
              onClick={handleBackupExport}
              className="mt-2 w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer shadow-xs"
            >
              Download JSON Backup
            </button>
          </div>

          {/* Clear Cache */}
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
            <div className="text-sm font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Erase Translation Cache
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Permanently clear saved translations from your local offline database cache.
            </p>
            <button
              onClick={() => setShowClearModal(true)}
              className="mt-2 w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Clear Storage Cache
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 4: Keyboard Shortcuts Guide ── */}
      <div className="app-card p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Keyboard className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Keyboard Shortcuts Cheat Sheet
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'Ctrl + K', action: 'Quick Search / Command Palette' },
            { key: 'Ctrl + S', action: 'Swap Active Languages' },
            { key: 'Ctrl + C', action: 'Copy Translated Text' },
            { key: 'Esc', action: 'Dismiss Open Popups / Dialogs' },
          ].map(({ key, action }) => (
            <div key={key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                {key}
              </kbd>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{action}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 5: Offline ML Architecture & Device Inspector ── */}
      <div className="app-card p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Local Machine Learning Architecture & Engine Status
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">NLLB-200 (600M)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[11px] text-slate-500">64-Language Neural Translation LM</div>
            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
              STATUS: LOCAL WEIGHTS ACTIVE
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Whisper Medium</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[11px] text-slate-500">Multilingual Speech-to-Text STT</div>
            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
              STATUS: INT8 QUANTIZED ENGINE
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">FastText lid.176</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[11px] text-slate-500">Zero-Latency Language Identifier</div>
            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
              STATUS: PRE-COMPILED BINARY
            </div>
          </div>
        </div>
      </div>

      {/* Clear Cache Modal */}
      <AnimatePresence>
        {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowClearModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md app-card p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Clear Cache & History?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Erase all local translation storage</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                This will delete all past translations and cached query records stored on your system.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearData}
                  disabled={isClearing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  {isClearing ? 'Clearing...' : 'Confirm Clear'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
