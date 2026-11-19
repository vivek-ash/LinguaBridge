import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center glass-card my-4"
    >
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 shadow-inner">
        <Icon className="w-8 h-8 text-indigo-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

export function LoadingState({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-10 h-10 rounded-full border-2 border-indigo-500/25 border-t-indigo-500 animate-spin mb-4" />
      <p className="text-xs sm:text-sm text-slate-400 font-medium">{text}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="skeleton h-4 w-3/4 rounded-lg" />
      <div className="skeleton h-3 w-full rounded-lg" />
      <div className="skeleton h-3 w-2/3 rounded-lg" />
    </div>
  );
}
