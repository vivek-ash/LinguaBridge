import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, Edit3, Check, X, Copy, ChevronRight, Compass, User, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { VideoSegment, GlossTranscriptEntry } from '@/types';

interface TranscriptPanelProps {
  segments: VideoSegment[];
  glossTranscript?: GlossTranscriptEntry[];
  currentTime: number;
  onSeek: (time: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  mode: 'captioning' | 'sign-language';
  onEditSegment?: (index: number, text: string) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TranscriptPanel({
  segments,
  glossTranscript,
  currentTime,
  onSeek,
  searchQuery,
  onSearchChange,
  mode,
  onEditSegment,
}: TranscriptPanelProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const activeRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastScrolledIndex = useRef<number>(-1);

  const activeIndex = segments.findIndex(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  useEffect(() => {
    if (!autoScroll || activeIndex === -1) return;
    if (activeIndex === lastScrolledIndex.current) return;
    lastScrolledIndex.current = activeIndex;

    const container = listRef.current;
    const el = activeRef.current;
    if (container && el) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const relativeTop = elRect.top - containerRect.top + container.scrollTop;
      const targetScroll = relativeTop - (container.clientHeight / 2) + (elRect.height / 2);
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  }, [activeIndex, autoScroll]);

  const filteredSegments = segments.filter((seg) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      seg.text.toLowerCase().includes(q) ||
      (seg.translated_text?.toLowerCase().includes(q) ?? false) ||
      (seg.english_text?.toLowerCase().includes(q) ?? false)
    );
  });

  const copyAll = () => {
    const text = segments
      .map((s) => {
        const trans = s.translated_text || s.english_text || '';
        return `[${formatTime(s.start)} - ${formatTime(s.end)}] ${s.text}${
          trans && trans !== s.text ? `\n→ ${trans}` : ''
        }`;
      })
      .join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Transcript copied to clipboard');
  };

  const startEdit = (idx: number, currentText: string) => {
    setEditingIdx(idx);
    setEditText(currentText);
  };

  const saveEdit = () => {
    if (editingIdx !== null && onEditSegment) {
      onEditSegment(editingIdx, editText);
      setEditingIdx(null);
      toast.success('Caption updated');
    }
  };

  return (
    <div className="app-card flex flex-col rounded-2xl overflow-hidden shadow-xs h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Interactive Subtitle Transcript
          </h3>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              'text-[10px] px-2.5 py-1 rounded-md font-mono flex items-center gap-1 transition-colors cursor-pointer',
              autoScroll
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            )}
            title={autoScroll ? 'Transcript auto-scroll is active' : 'Auto-scroll is paused'}
          >
            <Compass className={cn('w-3 h-3', autoScroll && 'text-teal-600 dark:text-teal-400')} />
            <span>{autoScroll ? 'Auto-Sync Active' : 'Sync Paused'}</span>
          </button>
        </div>
        <button
          onClick={copyAll}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          Copy All
        </button>
      </div>

      {/* Search Input */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:border-teal-500 transition-colors">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search words, phrases, or timestamps..."
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Segments List */}
      <div
        ref={listRef}
        className="relative flex-1 overflow-y-auto max-h-[460px] divide-y divide-slate-100 dark:divide-slate-800 select-text"
      >
        {filteredSegments.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            {searchQuery ? 'No matching segments found' : 'No transcript available'}
          </div>
        ) : (
          filteredSegments.map((seg, idx) => {
            const isActive = currentTime >= seg.start && currentTime <= seg.end;
            const segIdx = seg.index ?? idx;
            const isEditing = editingIdx === segIdx;
            const glossEntry = glossTranscript?.find((g) => g.segment_index === segIdx);

            return (
              <div
                key={segIdx}
                ref={isActive ? activeRef : undefined}
                onClick={() => onSeek(seg.start)}
                className={cn(
                  'px-4 py-3.5 cursor-pointer transition-all duration-150 group relative',
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-950/40 border-l-4 border-l-teal-600 shadow-2xs'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Timestamp */}
                  <div className="flex flex-col items-start gap-1 shrink-0 min-w-[70px]">
                    <span
                      className={cn(
                        'text-[11px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1 font-medium',
                        isActive
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      {formatTime(seg.start)}
                    </span>
                    {seg.speaker && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        {seg.speaker}
                      </span>
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {mode === 'captioning' && (
                      <>
                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="flex-1 bg-white dark:bg-slate-800 border border-teal-500 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 outline-none shadow-xs"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') setEditingIdx(null);
                              }}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveEdit();
                              }}
                              className="p-1.5 rounded-lg bg-emerald-500 text-white cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingIdx(null);
                              }}
                              className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                'text-sm font-semibold leading-relaxed',
                                isActive ? 'text-teal-900 dark:text-teal-100' : 'text-slate-900 dark:text-slate-100'
                              )}
                            >
                              {seg.translated_text || seg.english_text || seg.text}
                            </p>
                            {onEditSegment && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(segIdx, seg.translated_text || seg.text);
                                }}
                                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                                title="Edit caption"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}

                        {seg.text && seg.text !== seg.translated_text && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            {seg.text}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>
            {filteredSegments.length} caption segment{filteredSegments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span>Click any timestamp to seek</span>
      </div>
    </div>
  );
}
