import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Heart, Search, Trash2, Star, Clock,
  ArrowRight, Copy, Check, Download, ArrowUpRight,
  Filter, CheckSquare, Square, AlertTriangle, X,
  BarChart2, FileText, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { getHistory, getFavorites, deleteHistoryItem, toggleFavorite, clearAllHistory } from '@/lib/api';
import { useTranslationStore } from '@/store/useTranslationStore';
import { EmptyState, LoadingState } from '@/components/common/EmptyState';
import { formatDate, truncateText, copyToClipboard, cn } from '@/lib/utils';
import type { HistoryItem } from '@/types';

const FLAG_MAP: Record<string, string> = {
  en: '🇬🇧', hi: '🇮🇳', pa: '🇮🇳', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪',
  ta: '🇮🇳', te: '🇮🇳', bn: '🇧🇩', mr: '🇮🇳', gu: '🇮🇳', kn: '🇮🇳',
  ar: '🇸🇦', ja: '🇯🇵', zh: '🇨🇳', ru: '🇷🇺', pt: '🇵🇹', ur: '🇵🇰',
};

export default function HistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const translationStore = useTranslationStore();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pairFilter, setPairFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showClearModal, setShowClearModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [tab]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = tab === 'favorites' ? await getFavorites() : await getHistory(1, 100);
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteHistoryItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('Translation removed from history');
    } catch {
      toast.error('Could not delete history item');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const toDelete = Array.from(selectedIds);
      await Promise.all(toDelete.map((id) => deleteHistoryItem(id)));
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
      toast.success(`Removed ${toDelete.length} translation(s)`);
    } catch {
      toast.error('Failed to delete some selected items');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAll = async () => {
    setIsDeleting(true);
    try {
      await clearAllHistory();
      setItems([]);
      setSelectedIds(new Set());
      setShowClearModal(false);
      toast.success('Translation history cleared');
    } catch {
      toast.error('Failed to clear history');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleFavorite = async (id: number) => {
    try {
      const result = await toggleFavorite(id);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_favorite: result.is_favorite } : i))
      );
      toast.success(result.is_favorite ? 'Added to favorites' : 'Removed from favorites');
    } catch {
      toast.error('Could not update favorite status');
    }
  };

  const handleCopy = async (id: number, text: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleOpenInTranslator = (item: HistoryItem) => {
    translationStore.setSourceLang(item.source_lang);
    translationStore.setTargetLang(item.target_lang);
    translationStore.setSourceText(item.source_text);
    translationStore.setTargetText(item.target_text);
    navigate('/translate');
    toast.info('Loaded into translation studio');
  };

  // Export handlers
  const handleExport = (format: 'json' | 'csv' | 'txt') => {
    if (items.length === 0) {
      toast.error('No history records to export');
      return;
    }

    let mimeType = 'text/plain';
    let dataStr = '';
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      mimeType = 'application/json';
      dataStr = JSON.stringify(items, null, 2);
    } else if (format === 'csv') {
      mimeType = 'text/csv';
      const header = 'id,source_lang,target_lang,source_text,target_text,created_at\n';
      const rows = items.map((i) =>
        `"${i.id}","${i.source_lang}","${i.target_lang}","${(i.source_text || '').replace(/"/g, '""')}","${(i.target_text || '').replace(/"/g, '""')}","${i.created_at || ''}"`
      ).join('\n');
      dataStr = header + rows;
    } else {
      dataStr = items.map((i, idx) =>
        `[${idx + 1}] (${i.source_lang} -> ${i.target_lang})\nSource: ${i.source_text}\nTranslation: ${i.target_text}\nDate: ${i.created_at}\n`
      ).join('\n---\n\n');
    }

    const blob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `linguabridge_history_${dateStr}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported history as .${format.toUpperCase()}`);
  };

  // Derived statistics
  const stats = useMemo(() => {
    const total = items.length;
    const favs = items.filter((i) => i.is_favorite).length;
    let totalChars = 0;
    const pairCounts: Record<string, number> = {};

    items.forEach((i) => {
      totalChars += (i.source_text || '').length + (i.target_text || '').length;
      const key = `${i.source_lang} → ${i.target_lang}`;
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    });

    let topPair = '—';
    let maxCount = 0;
    Object.entries(pairCounts).forEach(([pair, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topPair = pair.toUpperCase();
      }
    });

    return { total, favs, totalChars, topPair };
  }, [items]);

  // Unique language pairs for filter dropdown
  const uniquePairs = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(`${i.source_lang}-${i.target_lang}`));
    return Array.from(set);
  }, [items]);

  // Filtered items
  const filtered = items.filter((i) => {
    const matchSearch =
      !searchQuery ||
      i.source_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.target_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.source_lang.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.target_lang.toLowerCase().includes(searchQuery.toLowerCase());

    const matchPair =
      pairFilter === 'all' || `${i.source_lang}-${i.target_lang}` === pairFilter;

    return matchSearch && matchPair;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Space_Grotesk'] text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="gradient-text">Translation</span> History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse, search, export, and manage your recent offline translations and starred phrases.
          </p>
        </div>

        {/* Tab Filter */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            onClick={() => setTab('all')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer',
              tab === 'all'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>All History</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/10 dark:bg-white/10 font-mono">
              {tab === 'all' ? items.length : ''}
            </span>
          </button>
          <button
            onClick={() => setTab('favorites')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer',
              tab === 'favorites'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>Favorites</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="app-card p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center shrink-0">
            <History className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Recorded</div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">{stats.total}</div>
          </div>
        </div>

        <div className="app-card p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500/20" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Starred Phrases</div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">{stats.favs}</div>
          </div>
        </div>

        <div className="app-card p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Top Language Pair</div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 truncate">{stats.topPair}</div>
          </div>
        </div>

        <div className="app-card p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Characters</div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">{stats.totalChars.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search, Language Filter, Export, Batch Actions */}
      <div className="app-card p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[220px] flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords in source or translation..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white px-1.5 py-0.5"
            >
              ×
            </button>
          )}
        </div>

        {/* Language Pair Filter */}
        {uniquePairs.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={pairFilter}
              onChange={(e) => setPairFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="all">All Language Pairs</option>
              {uniquePairs.map((p) => {
                const [src, tgt] = p.split('-');
                return (
                  <option key={p} value={p}>
                    {src.toUpperCase()} → {tgt.toUpperCase()}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Export & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Multi-Format Export Dropdown */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
              <Download className="w-3 h-3" /> Export:
            </span>
            <button
              onClick={() => handleExport('csv')}
              className="px-2 py-1 text-xs rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
              title="Export as CSV"
            >
              CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-2 py-1 text-xs rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
              title="Export as JSON"
            >
              JSON
            </button>
            <button
              onClick={() => handleExport('txt')}
              className="px-2 py-1 text-xs rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
              title="Export as Text"
            >
              TXT
            </button>
          </div>

          {/* Clear History Button */}
          {items.length > 0 && (
            <button
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Selection Banner */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer font-medium"
          >
            {selectedIds.size === filtered.length && filtered.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>
              {selectedIds.size > 0
                ? `${selectedIds.size} of ${filtered.length} selected`
                : 'Select All'}
            </span>
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete {selectedIds.size} Selected</span>
            </button>
          )}
        </div>
      )}

      {/* Items List */}
      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title={tab === 'favorites' ? 'No favorite phrases saved' : 'No translation history'}
          description={
            tab === 'favorites'
              ? 'Click the star icon on any translation in your history or translator studio to save it here for fast offline reference.'
              : 'Your translated phrases and documents will appear here automatically with full offline recovery.'
          }
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={cn(
                    'app-card p-4 transition-all duration-200 hover:border-teal-400 dark:hover:border-teal-500/40 hover:shadow-md',
                    isSelected && 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelectItem(item.id)}
                      className="mt-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    {/* Content Column */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Metadata Row */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span>{FLAG_MAP[item.source_lang] || '🌐'}</span>
                            <span className="uppercase">{item.source_lang}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span>{FLAG_MAP[item.target_lang] || '🌐'}</span>
                            <span className="uppercase">{item.target_lang}</span>
                          </span>

                          {item.created_at && (
                            <span className="text-[11px] text-slate-400">
                              {formatDate(item.created_at)}
                            </span>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center gap-1">
                          {/* Open in Translator Button */}
                          <button
                            onClick={() => handleOpenInTranslator(item)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 transition-colors cursor-pointer"
                            title="Load into Translator Studio"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Open in Studio</span>
                          </button>

                          {/* Star/Favorite Button */}
                          <button
                            onClick={() => handleToggleFavorite(item.id)}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors cursor-pointer',
                              item.is_favorite
                                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
                                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            )}
                            title={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star className={cn('w-4 h-4', item.is_favorite && 'fill-amber-400 text-amber-400')} />
                          </button>

                          {/* Copy Translation */}
                          <button
                            onClick={() => handleCopy(item.id, item.target_text)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Copy translation"
                          >
                            {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete this record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Source & Target Texts */}
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                          <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">Source ({item.source_lang})</div>
                          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
                            {item.source_text}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40">
                          <div className="text-[10px] font-mono uppercase text-teal-600 dark:text-teal-400 mb-1 font-semibold">Translation ({item.target_lang})</div>
                          <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed select-text font-medium">
                            {item.target_text}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Confirmation Modal: Clear All History */}
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
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Clear Entire History?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                All {items.length} saved translations and favorites will be permanently erased from your local database cache.
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
                  onClick={handleClearAll}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  {isDeleting ? 'Clearing...' : 'Yes, Delete Everything'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
