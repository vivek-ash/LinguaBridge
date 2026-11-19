import { NavLink } from 'react-router-dom';
import { Languages, Video, History, Cpu, LayoutDashboard, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { path: '/translate', icon: Languages, label: 'Translate' },
  { path: '/video', icon: Video, label: 'Studio' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/model-lab', icon: Cpu, label: 'Model Lab' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800 px-3 py-1.5 safe-area-bottom shadow-lg transition-colors duration-200">
      <div className="flex justify-around items-center">
        {items.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all',
                isActive
                  ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )
            }
          >
            <Icon className="w-5 h-5" strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
