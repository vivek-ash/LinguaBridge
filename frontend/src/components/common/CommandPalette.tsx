import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Languages, Video, History, Cpu,
  Settings, Moon, Sun, Trash2, ArrowRightLeft, Search
} from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTranslationStore } from '@/store/useTranslationStore';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const clear = useTranslationStore((s) => s.clear);
  const swap = useTranslationStore((s) => s.swapLanguages);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runAction = useCallback((action: () => void) => {
    action();
    setOpen(false);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[18vh] px-4"
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-lg"
          >
            <Command className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden ring-1 ring-teal-500/20">
              <div className="flex items-center gap-2.5 px-4 border-b border-slate-200 dark:border-slate-800">
                <Search className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <Command.Input
                  placeholder="Type a command or jump to page..."
                  className="flex-1 h-13 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
                />
              </div>
              <Command.List className="max-h-72 overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No matching commands found.
                </Command.Empty>
                <Command.Group heading="Navigation" className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1.5 font-semibold">
                  {[
                    { label: 'Translation Studio', icon: Languages, path: '/translate' },
                    { label: 'AI Video Captioning', icon: Video, path: '/video' },
                    { label: 'History & Saved', icon: History, path: '/history' },
                    { label: 'Model Evaluation Lab', icon: Cpu, path: '/model-lab' },
                    { label: 'Settings & Preferences', icon: Settings, path: '/settings' },
                  ].map(({ label, icon: Icon, path }) => (
                    <Command.Item
                      key={path}
                      onSelect={() => runAction(() => navigate(path))}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 cursor-pointer data-[selected=true]:bg-teal-50 dark:data-[selected=true]:bg-teal-950/60 data-[selected=true]:text-teal-600 dark:data-[selected=true]:text-teal-400 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      {label}
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group heading="Quick Actions" className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1.5 font-semibold">
                  <Command.Item
                    onSelect={() => runAction(toggleTheme)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 cursor-pointer data-[selected=true]:bg-teal-50 dark:data-[selected=true]:bg-teal-950/60 data-[selected=true]:text-teal-600 dark:data-[selected=true]:text-teal-400 transition-colors"
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    Toggle Light / Dark Mode
                  </Command.Item>
                  <Command.Item
                    onSelect={() => runAction(swap)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 cursor-pointer data-[selected=true]:bg-teal-50 dark:data-[selected=true]:bg-teal-950/60 data-[selected=true]:text-teal-600 dark:data-[selected=true]:text-teal-400 transition-colors"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    Swap Active Languages
                  </Command.Item>
                  <Command.Item
                    onSelect={() => runAction(clear)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 dark:text-slate-300 cursor-pointer data-[selected=true]:bg-rose-50 dark:data-[selected=true]:bg-rose-950/60 data-[selected=true]:text-rose-600 dark:data-[selected=true]:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    Clear Active Input
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
