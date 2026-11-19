import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Languages, Video, History, FlaskConical,
  LayoutDashboard, Settings, ChevronLeft, ChevronRight,
  Globe, Cpu, ShieldCheck
} from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/translate', icon: Languages, labelKey: 'nav.translate', badge: null },
  { path: '/video', icon: Video, labelKey: 'nav.video', badge: 'HD' },
  { path: '/history', icon: History, labelKey: 'nav.history', badge: null },
  { path: '/model-lab', icon: FlaskConical, labelKey: 'nav.modelLab', badge: null },
  { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard', badge: null },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings', badge: null },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const setCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 248 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-screen flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative z-30 select-none shadow-xs"
    >
      {/* Brand Header */}
      <NavLink
        to="/"
        className="flex items-center gap-3 px-4 h-16 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
      >
        <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 flex-shrink-0">
          <Globe className="w-5 h-5 group-hover:scale-105 transition-transform" />
        </div>

        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col min-w-0"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-base brand-title text-slate-900 dark:text-slate-100">
                LinguaBridge
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-mono">
                v2.5
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Neural Translation Engine
            </span>
          </motion.div>
        )}
      </NavLink>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2">
          {!collapsed ? (
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase font-mono">
              Workspace
            </span>
          ) : (
            <div className="h-1" />
          )}
        </div>

        {navItems.map(({ path, icon: Icon, labelKey, badge }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'w-4.5 h-4.5 flex-shrink-0 transition-colors',
                    isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                  )}
                  strokeWidth={1.8}
                />

                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between flex-1 min-w-0"
                  >
                    <span className="truncate">{t(labelKey)}</span>
                    {badge && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {badge}
                      </span>
                    )}
                  </motion.div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Engine Status Card */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        {!collapsed ? (
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Local Engine</span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                READY
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono">
              <span>NLLB-200</span>
              <span>Whisper</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Local Engine Ready">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
        )}
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-18 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-400 shadow-sm z-40 transition-colors cursor-pointer"
        aria-label="Toggle sidebar"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
    </motion.aside>
  );
}
