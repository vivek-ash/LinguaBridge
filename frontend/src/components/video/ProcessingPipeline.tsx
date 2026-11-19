import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stage {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface ProcessingPipelineProps {
  stages: Stage[];
  currentStage: string;
  progress: number;
  error?: string | null;
}

export default function ProcessingPipeline({
  stages,
  currentStage,
  progress,
  error,
}: ProcessingPipelineProps) {
  const currentIdx = stages.findIndex(s => s.id === currentStage);
  const isComplete = currentStage === 'complete';
  const isError = currentStage === 'error' || !!error;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden mb-6">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            isError
              ? 'bg-rose-500'
              : isComplete
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400'
          )}
        />
      </div>

      {/* Stages */}
      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const isActive = stage.id === currentStage;
          const isDone = idx < currentIdx || isComplete;
          const isPending = idx > currentIdx && !isComplete;

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all',
                isActive && 'bg-indigo-500/15 border border-indigo-500/30 shadow-xs',
                isDone && 'opacity-65',
              )}
            >
              <div className="flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : isActive ? (
                  isError ? (
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  )
                ) : (
                  <Circle className="w-5 h-5 text-slate-600" />
                )}
              </div>
              <span className={cn(
                'text-sm font-medium',
                isActive ? 'text-slate-100 font-semibold' : isDone ? 'text-slate-300' : 'text-slate-500'
              )}>
                {stage.label}
              </span>
              {isActive && !isError && (
                <span className="ml-auto text-xs text-indigo-300 font-mono font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {Math.round(progress)}%
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20"
        >
          <p className="text-sm text-red-300">{error}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
