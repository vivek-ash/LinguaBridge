import { useTranslation } from 'react-i18next';
import { Moon, Sun, Command, ShieldCheck, Cpu } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function Header() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useSettingsStore();

  const handleOpenCommand = () => {
    // Trigger keyboard event for cmdk
    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true });
    document.dispatchEvent(event);
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between px-4 md:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-20 select-none transition-colors duration-200">
      {/* Quick Search Bar / Command Palette Trigger */}
      <button
        onClick={handleOpenCommand}
        className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-xs group"
      >
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
          <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-semibold text-slate-700 dark:text-slate-200 shadow-xs flex items-center gap-0.5">
            <Command className="w-3 h-3" /> K
          </kbd>
        </div>
        <span className="hidden sm:inline font-normal text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
          Quick search languages, models, actions...
        </span>
        <span className="sm:hidden font-normal text-slate-500 dark:text-slate-400">Search...</span>
      </button>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Offline-First / Privacy Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium text-[11px]">100% Offline AI Inference</span>
        </div>

        {/* System Active Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-xs text-teal-700 dark:text-teal-300">
          <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400 animate-pulse" />
          <Cpu className="w-3 h-3 text-teal-600 dark:text-teal-400" />
          <span className="font-mono font-medium text-[11px]">NLLB-200 + Whisper Ready</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-all shadow-xs cursor-pointer"
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4.5 h-4.5 text-amber-400 hover:rotate-45 transition-transform duration-300" />
          ) : (
            <Moon className="w-4.5 h-4.5 text-teal-600 hover:-rotate-12 transition-transform duration-300" />
          )}
        </button>
      </div>
    </header>
  );
}
