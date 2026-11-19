import { motion, AnimatePresence } from 'framer-motion';
import { Film, Hand, Sparkles, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { useVideoStore } from '@/store/useVideoStore';
import VideoCaptioning from '@/components/video/VideoCaptioning';
import { cn } from '@/lib/utils';
import type { VideoMode } from '@/types';

const MODES: {
  id: VideoMode;
  label: string;
  icon: React.ReactNode;
  desc: string;
  badge?: string;
}[] = [
  {
    id: 'captioning',
    label: 'AI Video Captioning',
    icon: <Film className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
    desc: 'Two-Pass High Accuracy AI Captioning & Translation',
  },
  {
    id: 'sign-language',
    label: 'Sign Language Translation',
    icon: <Hand className="w-4 h-4 text-amber-500" />,
    desc: '3D Human Avatar sign translation',
    badge: 'Available Soon in Future',
  },
];

export default function VideoStudioPage() {
  const store = useVideoStore();

  const handleModeChange = (mode: VideoMode) => {
    if (mode !== store.mode) {
      store.reset();
      store.setMode(mode);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-['Space_Grotesk'] mb-2 text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <span className="gradient-text">Video</span> Studio
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-5">
          High-accuracy speech transcription, multilingual subtitle generation, and video accessibility tools.
        </p>

        {/* Mode Tabs */}
        <div className="flex flex-wrap gap-3">
          {MODES.map((m) => {
            const isActive = store.mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id)}
                className={cn(
                  'flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-medium transition-all border relative overflow-hidden cursor-pointer shadow-xs',
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-xl border transition-colors',
                    isActive
                      ? 'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  )}
                >
                  {m.icon}
                </div>

                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{m.label}</span>
                    {m.badge && (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {store.mode === 'captioning' ? (
          <motion.div
            key="captioning"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            <VideoCaptioning />
          </motion.div>
        ) : (
          <motion.div
            key="sign-language"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="app-card p-10 rounded-3xl text-center max-w-3xl mx-auto shadow-xl relative overflow-hidden my-6"
          >
            <div className="relative z-10 flex flex-col items-center">
              {/* Icon Badge */}
              <div className="w-20 h-20 rounded-3xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center mb-6 shadow-sm relative">
                <Hand className="w-10 h-10 text-teal-600 dark:text-teal-400" />
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </motion.div>
              </div>

              {/* Status Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-semibold tracking-wide uppercase mb-4">
                <Clock className="w-3.5 h-3.5" />
                <span>To Be Available Soon in Future</span>
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl sm:text-3xl font-bold font-['Space_Grotesk'] text-slate-900 dark:text-slate-100 mb-3">
                AI Video-to-Sign-Language Translation
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xl mx-auto leading-relaxed mb-8">
                Our next-generation sign language neural translation engine with an Indian 3D realistic avatar is currently in active development. It will provide continuous speech-to-sign interpretation for Indian Sign Language (ISL), American Sign Language (ASL), and British Sign Language (BSL).
              </p>

              {/* Upcoming Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-8 text-left">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 mb-2" />
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">Human-Like 3D Avatar</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Realistic body, arm movements, and articulated fingers.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-2" />
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">ISL, ASL & BSL</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Full linguistic grammar and non-manual facial cues.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 mb-2" />
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">Video Synchronization</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Real-time side-by-side video and avatar playback.</p>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                onClick={() => handleModeChange('captioning')}
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <span>Use AI Video Captioning Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
