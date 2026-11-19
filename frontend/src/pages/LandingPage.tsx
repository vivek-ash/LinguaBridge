import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Globe2, Languages, Mic, Video, FileText, Brain,
  ArrowRight, Sparkles, Zap, ShieldCheck, CheckCircle2,
  Cpu, Play, Subtitles, Layers, ChevronRight
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' as const }
  }),
};

const features = [
  {
    icon: Languages,
    title: 'Neural Text & Punjabi Studio',
    desc: 'High-accuracy translation between 64 languages with native Gurmukhi, Romanized Punjabi transliteration, and tone modulation.',
    badge: 'NLLB-200 Distilled',
  },
  {
    icon: Video,
    title: 'Two-Pass Video Captioning',
    desc: 'High-accuracy video subtitles powered by Faster-Whisper Medium and neural alignment in any target language.',
    badge: 'Flagship Core',
  },
  {
    icon: Mic,
    title: 'Real-Time Voice Translation',
    desc: 'Instant spoken recognition for Punjabi, Hindi, and English with natural regional Indian tone cadence and pronunciation.',
    badge: 'Interactive Audio',
  },
  {
    icon: ShieldCheck,
    title: '100% Offline & Private',
    desc: 'Zero external telemetry, zero API keys required. Every ML model runs locally on your workstation.',
    badge: 'Hardware Local',
  },
  {
    icon: FileText,
    title: 'Document Translation Studio',
    desc: 'Upload PDF, DOCX, and TXT files with layout formatting preserved and parallel page-by-page inspection.',
    badge: 'Document Studio',
  },
  {
    icon: Brain,
    title: 'Model Evaluation Lab',
    desc: 'Empirical BLEU, chrF++, and METEOR benchmark metrics comparing baseline models with fine-tuned regional adapters.',
    badge: 'ML Benchmarks',
  },
];

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden relative selection:bg-teal-600 selection:text-white transition-colors duration-200">
      {/* Top Navbar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto border-b border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
            <Globe2 className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl font-['Space_Grotesk'] tracking-tight text-slate-900 dark:text-slate-100">
              LinguaBridge
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">
              Enterprise v2.5
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/video')}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Video className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Video Studio</span>
          </button>
          <button
            onClick={() => navigate('/translate')}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Launch Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center text-center px-4 pt-16 md:pt-24 pb-20 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-semibold mb-8 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Powered by Offline NLLB-200 & Whisper Medium • Zero Cloud Required</span>
          </div>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold leading-[1.1] tracking-tight font-['Space_Grotesk'] text-slate-900 dark:text-slate-100 max-w-4xl"
        >
          Universal Translation & Video Accessibility{' '}
          <span className="gradient-text">Without Limits</span>
        </motion.h1>

        {/* Hero Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed"
        >
          High-accuracy two-pass video captioning, real-time voice translation, and neural multilingual text processing across 64 global and regional Indian languages.
        </motion.p>

        {/* Call to Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 items-center"
        >
          <button
            onClick={() => navigate('/translate')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-base shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>Open Translation Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/video')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-400 text-slate-800 dark:text-slate-200 font-semibold text-base transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs"
          >
            <Video className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>AI Video Captioning</span>
          </button>
        </motion.div>

        {/* Quick Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl"
        >
          {[
            { metric: '64+', label: 'Neural Languages', sub: 'Regional Indic & Global' },
            { metric: '<90ms', label: 'Average Latency', sub: 'Offline local inference' },
            { metric: '100%', label: 'Offline & Private', sub: 'Zero external telemetry' },
            { metric: 'Two-Pass', label: 'Speech Alignment', sub: 'Whisper + NLLB pipeline' },
          ].map(({ metric, label, sub }) => (
            <div key={label} className="app-card p-4 text-center space-y-1">
              <div className="text-2xl sm:text-3xl font-bold font-['Space_Grotesk'] text-teal-600 dark:text-teal-400">
                {metric}
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</div>
              <div className="text-[11px] text-slate-500">{sub}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 md:px-12 py-20 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk'] text-slate-900 dark:text-slate-100">
            Engineered for <span className="gradient-text">Precision & Accuracy</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
            A complete suite of AI-driven linguistic accessibility tools running locally on your workstation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc, badge }, i) => (
            <motion.div
              key={title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp}
              custom={i + 1}
              className="app-card p-6 relative overflow-hidden group hover:border-teal-400 dark:hover:border-teal-500/40 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-xs">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                  {badge}
                </span>
              </div>

              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                {desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800 py-8 px-6 md:px-12 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>LinguaBridge • Universal Offline AI Translation & Speech Studio</p>
      </footer>
    </div>
  );
}
