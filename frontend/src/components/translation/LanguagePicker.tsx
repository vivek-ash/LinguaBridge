import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Sparkles, Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';

// Full language list (built-in 64 languages catalogue)
const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', rtl: false, nllbCode: 'eng_Latn' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', rtl: false, nllbCode: 'hin_Deva' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', rtl: false, nllbCode: 'pan_Guru' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', rtl: false, nllbCode: 'spa_Latn' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', rtl: false, nllbCode: 'fra_Latn' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', rtl: false, nllbCode: 'deu_Latn' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', rtl: false, nllbCode: 'tam_Taml' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', rtl: false, nllbCode: 'tel_Telu' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', rtl: false, nllbCode: 'ben_Beng' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', rtl: false, nllbCode: 'mar_Deva' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', rtl: false, nllbCode: 'guj_Gujr' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', rtl: false, nllbCode: 'kan_Knda' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', rtl: false, nllbCode: 'mal_Mlym' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', rtl: true, nllbCode: 'urd_Arab' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true, nllbCode: 'arb_Arab' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳', rtl: false, nllbCode: 'zho_Hans' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', rtl: false, nllbCode: 'jpn_Jpan' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', rtl: false, nllbCode: 'kor_Hang' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', rtl: false, nllbCode: 'rus_Cyrl' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', rtl: false, nllbCode: 'por_Latn' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', rtl: false, nllbCode: 'ita_Latn' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', rtl: false, nllbCode: 'tur_Latn' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵', rtl: false, nllbCode: 'npi_Deva' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳', rtl: false, nllbCode: 'ory_Orya' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰', rtl: false, nllbCode: 'sin_Sinh' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', rtl: false, nllbCode: 'tha_Thai' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', rtl: false, nllbCode: 'vie_Latn' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', rtl: false, nllbCode: 'ind_Latn' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', rtl: false, nllbCode: 'zsm_Latn' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', rtl: false, nllbCode: 'pol_Latn' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', rtl: false, nllbCode: 'nld_Latn' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', rtl: false, nllbCode: 'swe_Latn' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', rtl: false, nllbCode: 'nob_Latn' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', rtl: false, nllbCode: 'dan_Latn' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', rtl: false, nllbCode: 'fin_Latn' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', rtl: false, nllbCode: 'ces_Latn' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', rtl: false, nllbCode: 'ron_Latn' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', rtl: false, nllbCode: 'hun_Latn' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', rtl: false, nllbCode: 'ell_Grek' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true, nllbCode: 'heb_Hebr' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', rtl: true, nllbCode: 'pes_Arab' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', rtl: false, nllbCode: 'ukr_Cyrl' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', rtl: false, nllbCode: 'swh_Latn' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹', rtl: false, nllbCode: 'amh_Ethi' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', flag: '🇳🇬', rtl: false, nllbCode: 'yor_Latn' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', flag: '🇳🇬', rtl: false, nllbCode: 'ibo_Latn' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', flag: '🇳🇬', rtl: false, nllbCode: 'hau_Latn' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', flag: '🇿🇦', rtl: false, nllbCode: 'zul_Latn' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦', rtl: false, nllbCode: 'afr_Latn' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬', rtl: false, nllbCode: 'bul_Cyrl' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', flag: '🇪🇸', rtl: false, nllbCode: 'cat_Latn' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', rtl: false, nllbCode: 'hrv_Latn' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰', rtl: false, nllbCode: 'slk_Latn' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮', rtl: false, nllbCode: 'slv_Latn' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸', rtl: false, nllbCode: 'srp_Cyrl' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹', rtl: false, nllbCode: 'lit_Latn' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻', rtl: false, nllbCode: 'lvs_Latn' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪', rtl: false, nllbCode: 'est_Latn' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪', rtl: false, nllbCode: 'kat_Geor' },
  { code: 'my', name: 'Myanmar', nativeName: 'မြန်မာ', flag: '🇲🇲', rtl: false, nllbCode: 'mya_Mymr' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', flag: '🇰🇭', rtl: false, nllbCode: 'khm_Khmr' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', flag: '🇱🇦', rtl: false, nllbCode: 'lao_Laoo' },
];

const INDIAN_CODES = new Set(['hi', 'pa', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'ur', 'or', 'ne']);
const POPULAR_CODES = new Set(['en', 'hi', 'pa', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'ru', 'pt']);

interface Props {
  value: string;
  onChange: (code: string) => void;
  showAutoDetect?: boolean;
  detectedLang?: string | null;
  confidence?: number | null;
  align?: 'left' | 'right';
}

export default function LanguagePicker({
  value,
  onChange,
  showAutoDetect,
  detectedLang,
  confidence,
  align = 'left',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'indian' | 'popular'>('all');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 340;
    const dropdownHeight = 400;

    let left = align === 'right' ? rect.right - dropdownWidth : rect.left;

    // Viewport edge collision prevention
    if (left + dropdownWidth > window.innerWidth - 12) {
      left = window.innerWidth - dropdownWidth - 12;
    }
    if (left < 12) left = 12;

    const fitsBelow = rect.bottom + dropdownHeight + 8 < window.innerHeight;
    const top = fitsBelow ? rect.bottom + 6 : Math.max(12, rect.top - dropdownHeight - 6);

    setCoords({ top, left, width: dropdownWidth });
  }, [align]);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleScrollOrResize = () => updatePosition();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, updatePosition]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = LANGUAGES;

    if (filterCategory === 'indian') {
      list = list.filter((l) => INDIAN_CODES.has(l.code));
    } else if (filterCategory === 'popular') {
      list = list.filter((l) => POPULAR_CODES.has(l.code));
    }

    if (!q) return list;
    return list.filter(
      (l) => l.name.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q) || l.code.includes(q)
    );
  }, [search, filterCategory]);

  const selected = value === 'auto'
    ? null
    : LANGUAGES.find((l) => l.code === value);

  const detectedObj = detectedLang ? LANGUAGES.find((l) => l.code === detectedLang) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          updatePosition();
          setOpen((prev) => !prev);
        }}
        className={cn(
          'group flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer select-none border shadow-xs',
          'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/90 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-teal-400 dark:hover:border-teal-500/50',
          open && 'ring-2 ring-teal-500/30 border-teal-500 bg-white dark:bg-slate-900 shadow-md'
        )}
        aria-label="Select language"
      >
        <div className="flex items-center gap-2 truncate">
          {value === 'auto' ? (
            <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              {detectedObj ? (
                <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="text-base">{detectedObj.flag}</span>
                  <span>{detectedObj.name}</span>
                </span>
              ) : (
                <span className="font-medium text-slate-700 dark:text-slate-200">Auto Detect</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{selected?.flag || '🌐'}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{selected?.name || value}</span>
              {selected?.nativeName && selected.nativeName !== selected.name && (
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline font-normal">
                  ({selected.nativeName})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {confidence !== null && confidence !== undefined && value === 'auto' && detectedLang && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold border border-emerald-200 dark:border-emerald-800/60">
              {Math.round(confidence * 100)}%
            </span>
          )}
          <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform duration-200', open && 'rotate-180 text-teal-600 dark:text-teal-400')} />
        </div>
      </button>

      {/* PORTAL POPUP */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && coords && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                zIndex: 9999999,
              }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden ring-1 ring-teal-500/20 flex flex-col backdrop-blur-2xl"
            >
              {/* Search Header */}
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 space-y-2.5">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500/30 transition-all">
                  <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search languages..."
                    className="flex-1 bg-transparent text-sm outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
                    autoFocus
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filter Category Pills */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setFilterCategory('all')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                      filterCategory === 'all'
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    All ({LANGUAGES.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterCategory('indian')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer',
                      filterCategory === 'indian'
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <span>🇮🇳</span> Indian (12)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterCategory('popular')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                      filterCategory === 'popular'
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    Popular
                  </button>
                </div>
              </div>

              {/* Language List */}
              <div className="overflow-y-auto max-h-[310px] p-1.5 space-y-0.5">
                {showAutoDetect && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('auto');
                      setOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all text-left cursor-pointer mb-1',
                      value === 'auto'
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-950/60 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">Auto Detect</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">FastText AI identification</div>
                      </div>
                    </div>
                    {value === 'auto' && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                  </button>
                )}

                {filtered.map((lang) => {
                  const isSelected = value === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        onChange(lang.code);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all text-left cursor-pointer group',
                        isSelected
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-medium border border-teal-200 dark:border-teal-800 shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-base leading-none flex-shrink-0">{lang.flag}</span>
                        <div className="truncate">
                          <span className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-white mr-2">
                            {lang.name}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-xs font-normal">
                            {lang.nativeName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {lang.rtl && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-mono font-medium border border-amber-200 dark:border-amber-800">
                            RTL
                          </span>
                        )}
                        {isSelected && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                      </div>
                    </button>
                  );
                })}

                {filtered.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">No languages matched</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try another search keyword</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
