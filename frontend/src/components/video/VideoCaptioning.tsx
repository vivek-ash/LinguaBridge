import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  Settings2,
  Type,
  Palette,
  Film,
  Clock,
  HardDrive,
  RefreshCw,
  Sparkles,
  Subtitles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useVideoStore } from '@/store/useVideoStore';
import { uploadVideoForCaptioning, getVideoStatus, getVideoResult, editCaption } from '@/lib/api';
import LanguagePicker from '@/components/translation/LanguagePicker';
import VideoUploader from './VideoUploader';
import ProcessingPipeline from './ProcessingPipeline';
import TranscriptPanel from './TranscriptPanel';
import ExportPanel from './ExportPanel';
import { cn } from '@/lib/utils';

const CAPTION_STAGES = [
  { id: 'extracting_audio', label: 'Extracting High-Fidelity Audio' },
  { id: 'transcribing', label: 'Transcribing Speech (Whisper Model)' },
  { id: 'translating', label: 'Translating Captions (Two-Pass High Accuracy)' },
  { id: 'complete', label: 'Complete & Synchronized' },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VideoCaptioning() {
  const store = useVideoStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');
  const [subtitleMode, setSubtitleMode] = useState<'translated' | 'dual' | 'original'>('translated');
  const [showCaptionSettings, setShowCaptionSettings] = useState(false);

  const handleFileSelected = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    store.setVideoUrl(url);
    store.setVideoFile(file);
    store.setVideoMeta(file.name, file.size);

    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.onloadedmetadata = () => {
      store.setVideoDuration(tempVideo.duration);
      URL.revokeObjectURL(tempVideo.src);
    };
    tempVideo.src = URL.createObjectURL(file);
  }, [store]);

  const handleRemove = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    store.reset();
  }, [store]);

  const handleGenerate = async () => {
    if (!store.videoFile) return;

    store.setUploading(true, 0);
    try {
      const job = await uploadVideoForCaptioning(store.videoFile, sourceLang, targetLang);
      store.setCurrentJob({ ...job, status: 'processing', progress: 5, stage: 'extracting_audio' });
      store.setUploading(false);

      // Poll for status
      pollRef.current = setInterval(async () => {
        try {
          const status = await getVideoStatus(job.job_id);
          store.setCurrentJob({ ...status, job_id: job.job_id });

          if (status.status === 'complete') {
            clearInterval(pollRef.current!);
            const result = await getVideoResult(job.job_id);
            store.setCurrentJob({ ...status, job_id: job.job_id, result });
            toast.success('AI Captions generated with full synchronization!');
          } else if (status.status === 'error') {
            clearInterval(pollRef.current!);
            toast.error(status.error || 'Caption generation failed');
          }
        } catch {
          // Continue polling
        }
      }, 2000);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Video upload failed');
      store.setUploading(false);
    }
  };

  const handleEditSegment = async (index: number, text: string) => {
    if (!store.currentJob?.job_id) return;
    try {
      await editCaption(store.currentJob.job_id, index, text);
      if (store.currentJob.result) {
        const segments = [...store.currentJob.result.segments];
        segments[index] = { ...segments[index], translated_text: text };
        store.setCurrentJob({
          ...store.currentJob,
          result: { ...store.currentJob.result, segments },
        });
      }
    } catch {
      toast.error('Failed to update caption segment');
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const isComplete = store.currentJob?.status === 'complete';
  const isProcessing =
    store.currentJob &&
    store.currentJob.status !== 'complete' &&
    store.currentJob.status !== 'error';
  const segments = store.currentJob?.result?.segments || [];
  const detectedLang = store.currentJob?.result?.detected_lang;
  const langProb = store.currentJob?.result?.language_probability;

  // Find active segment for video overlay
  const currentSegment = segments.find(
    (s) => store.currentTime >= s.start && store.currentTime <= s.end
  );

  return (
    <div className="space-y-5">
      {/* Top Configuration & Metadata Bar */}
      <div className="app-card p-4 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Language Selection Route */}
          <div className="flex items-center gap-3 flex-wrap flex-1">
            <div className="min-w-[160px] flex-1">
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400" />
                Spoken Language
              </label>
              <LanguagePicker
                value={sourceLang}
                onChange={setSourceLang}
                showAutoDetect
              />
            </div>

            <div className="pt-5 text-slate-400 font-bold text-lg hidden sm:block">
              →
            </div>

            <div className="min-w-[160px] flex-1">
              <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400" />
                Target Caption Language
              </label>
              <LanguagePicker
                value={targetLang}
                onChange={setTargetLang}
              />
            </div>
          </div>

          {/* Video Metadata / Status Indicators */}
          {store.videoUrl && (
            <div className="flex items-center gap-3 flex-wrap justify-end border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-3 md:pt-0 md:pl-4">
              <div className="text-right">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <Film className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="truncate max-w-[180px]" title={store.videoName}>
                    {store.videoName || 'Uploaded Video'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 justify-end">
                  {store.videoDuration > 0 && (
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-teal-600" />
                      {formatDuration(store.videoDuration)}
                    </span>
                  )}
                  {store.videoSize > 0 && (
                    <span className="flex items-center gap-1 font-mono">
                      <HardDrive className="w-3 h-3 text-teal-600" />
                      {formatFileSize(store.videoSize)}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleRemove}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
                title="Replace with another video"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Replace
              </button>
            </div>
          )}
        </div>

        {/* AI Detection Pill when completed */}
        {isComplete && detectedLang && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-slate-700 dark:text-slate-300">
                Spoken Language Auto-Detected:{' '}
                <strong className="text-teal-600 dark:text-teal-400 uppercase">{detectedLang}</strong>
              </span>
              {langProb && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold">
                  {Math.round(langProb * 100)}% Confidence
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              <span>Two-Pass Whisper Medium + NLLB Alignment</span>
            </div>
          </div>
        )}
      </div>

      {/* Upload Box (Only visible when no video is loaded or user hasn't generated yet) */}
      {!isComplete && !isProcessing && (
        <VideoUploader
          onFileSelected={handleFileSelected}
          videoUrl={store.videoUrl}
          videoName={store.videoName}
          videoSize={store.videoSize}
          videoDuration={store.videoDuration}
          onRemove={handleRemove}
          compact={false}
        />
      )}

      {/* Generate Captions Action Button */}
      {store.videoUrl && !store.currentJob && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
          onClick={handleGenerate}
          disabled={store.isUploading}
          className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-base flex items-center justify-center gap-3 transition-all shadow-xs cursor-pointer font-['Space_Grotesk']"
        >
          <Wand2 className="w-5 h-5 text-white" />
          <span>Generate Accurate AI Captions & Translations</span>
        </motion.button>
      )}

      {/* Processing Pipeline Animation */}
      {isProcessing && (
        <ProcessingPipeline
          stages={CAPTION_STAGES}
          currentStage={store.currentJob?.stage || store.currentJob?.status || 'processing'}
          progress={store.currentJob?.progress || 0}
          error={store.currentJob?.error}
        />
      )}

      {/* Studio Workstation: Cinema Player + Interactive Transcript */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Cinema Player Section */}
          <div className="app-card rounded-2xl overflow-hidden shadow-xl bg-black">
            {/* Video Container with Overlaid Subtitles */}
            <div className="relative bg-black flex items-center justify-center min-h-[320px] max-h-[520px]">
              <video
                ref={videoRef}
                src={store.videoUrl!}
                className="w-full max-h-[520px] object-contain"
                onTimeUpdate={(e) =>
                  store.setCurrentTime((e.target as HTMLVideoElement).currentTime)
                }
                onPlay={() => store.setPlaying(true)}
                onPause={() => store.setPlaying(false)}
                controls
                playsInline
              />

              {/* High-Visibility Cinema Caption Overlay */}
              {store.captionStyle.enabled && currentSegment && (
                <div
                  className={cn(
                    'absolute left-0 right-0 flex justify-center px-6 pointer-events-none z-20 transition-all duration-150',
                    store.captionStyle.position === 'top' && 'top-8',
                    store.captionStyle.position === 'middle' && 'top-1/2 -translate-y-1/2',
                    store.captionStyle.position === 'bottom' && 'bottom-16'
                  )}
                >
                  <div
                    className="px-6 py-3 rounded-2xl max-w-[88%] text-center backdrop-blur-md shadow-2xl border border-white/15"
                    style={{
                      backgroundColor: store.captionStyle.bgColor || 'rgba(0,0,0,0.82)',
                      color: store.captionStyle.textColor || '#ffffff',
                      fontSize: `${store.captionStyle.fontSize}px`,
                    }}
                  >
                    {subtitleMode === 'dual' ? (
                      <div className="space-y-1.5">
                        <p className="font-semibold leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-wide">
                          {currentSegment.translated_text ||
                            currentSegment.english_text ||
                            currentSegment.text}
                        </p>
                        {currentSegment.text && (
                          <p className="text-amber-300 font-medium leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-[0.88em]">
                            {currentSegment.text}
                          </p>
                        )}
                      </div>
                    ) : subtitleMode === 'original' ? (
                      <p className="font-semibold leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-wide">
                        {currentSegment.text}
                      </p>
                    ) : (
                      <p className="font-semibold leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-wide">
                        {currentSegment.translated_text ||
                          currentSegment.english_text ||
                          currentSegment.text}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cinema Subtitle Control Bar */}
            <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap bg-slate-900 text-slate-200">
              {/* Left Controls: CC Switch & Subtitle Modes */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() =>
                    store.setCaptionStyle({ enabled: !store.captionStyle.enabled })
                  }
                  className={cn(
                    'text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 border cursor-pointer',
                    store.captionStyle.enabled
                      ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  )}
                >
                  <Subtitles className="w-3.5 h-3.5" />
                  <span>{store.captionStyle.enabled ? 'CC Active' : 'CC Off'}</span>
                </button>

                {store.captionStyle.enabled && (
                  <div className="flex items-center rounded-xl bg-slate-800 p-1 border border-slate-700 gap-1">
                    <button
                      onClick={() => setSubtitleMode('translated')}
                      className={cn(
                        'text-xs px-3 py-1 rounded-lg transition-all font-medium cursor-pointer',
                        subtitleMode === 'translated'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      )}
                    >
                      Translated
                    </button>
                    <button
                      onClick={() => setSubtitleMode('dual')}
                      className={cn(
                        'text-xs px-3 py-1 rounded-lg transition-all font-medium flex items-center gap-1 cursor-pointer',
                        subtitleMode === 'dual'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      )}
                    >
                      <Layers className="w-3 h-3" />
                      Dual Subtitles
                    </button>
                    <button
                      onClick={() => setSubtitleMode('original')}
                      className={cn(
                        'text-xs px-3 py-1 rounded-lg transition-all font-medium cursor-pointer',
                        subtitleMode === 'original'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      )}
                    >
                      Original
                    </button>
                  </div>
                )}
              </div>

              {/* Right Controls: Quick Font Resize & Style Modal */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-0.5">
                  <button
                    onClick={() =>
                      store.setCaptionStyle({
                        fontSize: Math.max(12, store.captionStyle.fontSize - 2),
                      })
                    }
                    className="px-2.5 py-1 text-xs text-slate-300 hover:text-white font-bold cursor-pointer"
                    title="Decrease font size"
                  >
                    A-
                  </button>
                  <span className="text-xs text-teal-400 font-mono px-1">
                    {store.captionStyle.fontSize}px
                  </span>
                  <button
                    onClick={() =>
                      store.setCaptionStyle({
                        fontSize: Math.min(36, store.captionStyle.fontSize + 2),
                      })
                    }
                    className="px-2.5 py-1 text-xs text-slate-300 hover:text-white font-bold cursor-pointer"
                    title="Increase font size"
                  >
                    A+
                  </button>
                </div>

                <button
                  onClick={() => setShowCaptionSettings(!showCaptionSettings)}
                  className={cn(
                    'p-2 rounded-xl transition-all border cursor-pointer',
                    showCaptionSettings
                      ? 'bg-teal-600 text-white border-teal-500'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  )}
                  title="Customize Caption Appearance"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expandable Caption Appearance Customizer */}
            <AnimatePresence>
              {showCaptionSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 py-4 border-t border-slate-800 bg-slate-900/90 space-y-3"
                >
                  <div className="flex items-center gap-6 flex-wrap">
                    {/* Font Size Slider */}
                    <div className="flex items-center gap-2.5">
                      <Type className="w-4 h-4 text-teal-400" />
                      <span className="text-xs text-slate-400 font-medium">Size</span>
                      <input
                        type="range"
                        min="12"
                        max="36"
                        step="1"
                        value={store.captionStyle.fontSize}
                        onChange={(e) =>
                          store.setCaptionStyle({ fontSize: parseInt(e.target.value) })
                        }
                        className="w-24 accent-teal-600 cursor-pointer"
                      />
                      <span className="text-xs text-teal-400 font-mono w-8">
                        {store.captionStyle.fontSize}px
                      </span>
                    </div>

                    {/* Position Picker */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">Position</span>
                      {(['bottom', 'middle', 'top'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => store.setCaptionStyle({ position: pos })}
                          className={cn(
                            'text-xs px-3 py-1 rounded-lg capitalize font-medium transition-all cursor-pointer',
                            store.captionStyle.position === pos
                              ? 'bg-teal-600 text-white shadow-xs'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          )}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>

                    {/* Text Color Picker */}
                    <div className="flex items-center gap-2 ml-auto">
                      <Palette className="w-4 h-4 text-teal-400" />
                      <span className="text-xs text-slate-400 font-medium">Text Color</span>
                      <input
                        type="color"
                        value={store.captionStyle.textColor}
                        onChange={(e) =>
                          store.setCaptionStyle({ textColor: e.target.value })
                        }
                        className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                        title="Caption Text Color"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Transcript & Export Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <TranscriptPanel
                segments={segments}
                currentTime={store.currentTime}
                onSeek={handleSeek}
                searchQuery={store.searchQuery}
                onSearchChange={store.setSearchQuery}
                mode="captioning"
                onEditSegment={handleEditSegment}
              />
            </div>
            <div>
              <ExportPanel
                jobId={store.currentJob!.job_id}
                segments={segments}
                mode="captioning"
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
