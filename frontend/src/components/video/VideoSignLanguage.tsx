import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Hand, Wand2, AlertTriangle, Eye, EyeOff, Maximize2, Minimize2, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { useVideoStore } from '@/store/useVideoStore';
import { uploadVideoForSignLanguage, getVideoStatus, getVideoResult } from '@/lib/api';
import LanguagePicker from '@/components/translation/LanguagePicker';
import VideoUploader from './VideoUploader';
import ProcessingPipeline from './ProcessingPipeline';
import TranscriptPanel from './TranscriptPanel';
import ExportPanel from './ExportPanel';
import SignLanguageAvatar from './SignLanguageAvatar';
import { cn } from '@/lib/utils';
import type { GlossToken } from '@/types';

const SIGN_STAGES = [
  { id: 'extracting_audio', label: 'Extracting Audio' },
  { id: 'transcribing', label: 'Recognizing Speech' },
  { id: 'understanding_context', label: 'Understanding Context' },
  { id: 'generating_signs', label: 'Translating to Sign Language' },
  { id: 'synchronizing', label: 'Synchronizing Animation' },
  { id: 'complete', label: 'Ready to Play' },
];

const SIGN_LANGUAGES = [
  { code: 'asl', name: 'American Sign Language (ASL)', desc: 'Used in the US & Canada' },
  { code: 'isl', name: 'Indian Sign Language (ISL)', desc: 'Used across India & South Asia' },
  { code: 'bsl', name: 'British Sign Language (BSL)', desc: 'Used in the United Kingdom' },
];

const AVATAR_SIZES = [
  { value: 'small' as const, label: 'S' },
  { value: 'medium' as const, label: 'M' },
  { value: 'large' as const, label: 'L' },
  { value: 'fullscreen' as const, label: 'XL' },
];

const AVATAR_BGS = [
  { value: '#06060c', label: 'Dark' },
  { value: '#1a1a2e', label: 'Navy' },
  { value: '#0f2027', label: 'Teal' },
  { value: '#2d1b4e', label: 'Purple' },
];

export default function VideoSignLanguage() {
  const store = useVideoStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sourceLang, setSourceLang] = useState('auto');
  const [layoutMode, setLayoutMode] = useState<'split' | 'stacked'>('split');

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

  const handleTranslate = async () => {
    if (!store.videoFile) return;

    store.setUploading(true, 0);
    try {
      const job = await uploadVideoForSignLanguage(store.videoFile, sourceLang, store.signLanguage);
      store.setCurrentJob({ ...job, status: 'processing', progress: 0 });
      store.setUploading(false);

      pollRef.current = setInterval(async () => {
        try {
          const status = await getVideoStatus(job.job_id);
          store.setCurrentJob({ ...status, job_id: job.job_id });

          if (status.status === 'complete') {
            clearInterval(pollRef.current!);
            const result = await getVideoResult(job.job_id);
            store.setCurrentJob({ ...status, job_id: job.job_id, result });
            toast.success('Sign language translation complete!');
          } else if (status.status === 'error') {
            clearInterval(pollRef.current!);
            toast.error(status.error || 'Processing failed');
          }
        } catch {
          // Continue polling
        }
      }, 2000);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'object' ? detail.message : detail || 'Upload failed';
      toast.error(msg, { duration: 5000 });
      store.setUploading(false);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const isComplete = store.currentJob?.status === 'complete';
  const isProcessing = store.currentJob && store.currentJob.status !== 'complete' && store.currentJob.status !== 'error';
  const segments = store.currentJob?.result?.segments || [];
  const glossSequence: GlossToken[] = store.currentJob?.result?.gloss_sequence || [];
  const glossTranscript = store.currentJob?.result?.gloss_transcript || [];

  // Find current gloss token
  const currentGloss = glossSequence.find(
    (g) => store.currentTime >= g.start_time && store.currentTime <= g.end_time
  ) || null;

  // Find current segment for captions
  const currentSegment = segments.find(
    (s) => store.currentTime >= s.start && store.currentTime <= s.end
  );

  return (
    <div className="space-y-4">
      {/* Controls Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <label className="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 block">Source Language</label>
          <LanguagePicker value={sourceLang} onChange={setSourceLang} showAutoDetect />
        </div>
        <span className="text-gray-600 mt-5">→</span>
        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] text-gray-500 uppercase tracking-wider mb-1.5 block">Sign Language</label>
          <select
            value={store.signLanguage}
            onChange={(e) => store.setSignLanguage(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm font-medium bg-[#121220] border border-white/[0.14] hover:border-white/[0.25] text-gray-100 outline-none focus:ring-2 focus:ring-purple-500/60 appearance-none cursor-pointer"
          >
            {SIGN_LANGUAGES.map(sl => (
              <option key={sl.code} value={sl.code}>{sl.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload */}
      <VideoUploader
        onFileSelected={handleFileSelected}
        videoUrl={store.videoUrl}
        videoName={store.videoName}
        videoSize={store.videoSize}
        videoDuration={store.videoDuration}
        onRemove={handleRemove}
        maxDuration={120}
        maxDurationLabel="Maximum video duration: 2 minutes"
        compact={Boolean(isProcessing || isComplete)}
      />

      {/* Translate Button */}
      {store.videoUrl && !store.currentJob && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleTranslate}
          disabled={store.isUploading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
        >
          <Hand className="w-5 h-5" />
          Translate to Sign Language
        </motion.button>
      )}

      {/* Processing */}
      {isProcessing && (
        <ProcessingPipeline
          stages={SIGN_STAGES}
          currentStage={store.currentJob?.stage || store.currentJob?.status || 'processing'}
          progress={store.currentJob?.progress || 0}
          error={store.currentJob?.error}
        />
      )}

      {/* Results */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Layout Controls Bar */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-400 font-medium">Synchronized Players</span>
            <div className="flex items-center rounded-lg bg-white/[0.04] p-0.5 border border-white/[0.06]">
              <button
                onClick={() => setLayoutMode('split')}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5',
                  layoutMode === 'split'
                    ? 'bg-purple-500/25 text-purple-200 border border-purple-500/30'
                    : 'text-gray-400 hover:text-gray-200'
                )}
              >
                <Monitor className="w-3.5 h-3.5" />
                Side-by-Side
              </button>
              <button
                onClick={() => setLayoutMode('stacked')}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5',
                  layoutMode === 'stacked'
                    ? 'bg-purple-500/25 text-purple-200 border border-purple-500/30'
                    : 'text-gray-400 hover:text-gray-200'
                )}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Stacked
              </button>
            </div>
          </div>

          <div className={cn(layoutMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-4')}>
            {/* Original Video Player */}
            <div className="glass-card overflow-hidden flex flex-col">
              <div className="px-4 py-2 border-b border-white/[0.06] flex items-center gap-2">
                <Monitor className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-gray-200">Original Video</span>
                {store.currentJob?.result?.detected_lang && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 ml-auto">
                    Detected: {store.currentJob.result.detected_lang}
                  </span>
                )}
              </div>
              <div className="relative bg-black flex-1 flex items-center justify-center min-h-[320px]">
                <video
                  ref={videoRef}
                  src={store.videoUrl!}
                  className="w-full max-h-[380px] object-contain"
                  onTimeUpdate={(e) => store.setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                  onPlay={() => store.setPlaying(true)}
                  onPause={() => store.setPlaying(false)}
                  controls
                />
                {/* Caption overlay */}
                {currentSegment && (
                  <div className="absolute bottom-14 left-0 right-0 flex justify-center px-4 pointer-events-none">
                    <div className="px-4 py-1.5 rounded-lg bg-black/75 backdrop-blur-sm max-w-[85%] text-center border border-white/10 shadow-lg">
                      <p className="text-sm font-semibold text-gray-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                        {currentSegment.english_text || currentSegment.text}
                      </p>
                      {currentSegment.text && currentSegment.text !== currentSegment.english_text && (
                        <p className="text-xs text-amber-300/90 font-medium">
                          {currentSegment.text}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sign Language Avatar Panel */}
            <div className="glass-card overflow-hidden flex flex-col">
              <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hand className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-gray-200">Indian Sign Language Avatar</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-600/20 text-amber-400 uppercase font-medium">
                    {store.signLanguage}
                  </span>
                  {store.currentJob?.result?.total_signs && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400">
                      {store.currentJob.result.total_signs} signs
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => store.setShowGloss(!store.showGloss)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-400"
                    title={store.showGloss ? 'Hide gloss' : 'Show gloss'}
                  >
                    {store.showGloss ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Avatar */}
              <div className="flex-1 min-h-[320px]">
                <SignLanguageAvatar
                  currentGloss={currentGloss}
                  showGloss={store.showGloss}
                  isPlaying={store.isPlaying}
                  speed={store.avatarSpeed}
                  bgColor={store.avatarBg}
                  size={layoutMode === 'split' ? 'medium' : store.avatarSize}
                />
              </div>

              {/* Disclaimer */}
              <div className="px-4 py-1.5 border-t border-white/[0.04] flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-400/60 flex-shrink-0" />
                <span className="text-[10px] text-amber-400/50">
                  Human-like 3D sign interpreter performing synchronized ISL/ASL articulation.
                </span>
              </div>

              {/* Avatar Controls */}
              <div className="px-4 py-3 border-t border-white/[0.06] flex items-center gap-4 flex-wrap">
                {/* Speed */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Speed</span>
                  <input
                    type="range" min="0.5" max="2" step="0.1"
                    value={store.avatarSpeed}
                    onChange={(e) => store.setAvatarSpeed(parseFloat(e.target.value))}
                    className="w-20 accent-purple-500"
                  />
                  <span className="text-xs text-gray-400 w-8">{store.avatarSpeed}x</span>
                </div>

                {/* Size */}
                {layoutMode === 'stacked' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Size</span>
                    {AVATAR_SIZES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => store.setAvatarSize(s.value)}
                        className={cn(
                          'text-[11px] px-2 py-1 rounded',
                          store.avatarSize === s.value
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-white/[0.05] text-gray-500 hover:text-gray-300'
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Background */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-xs text-gray-500">BG</span>
                  {AVATAR_BGS.map(bg => (
                    <button
                      key={bg.value}
                      onClick={() => store.setAvatarBg(bg.value)}
                      className={cn(
                        'w-5 h-5 rounded-full border-2 transition-all',
                        store.avatarBg === bg.value ? 'border-purple-400 scale-110' : 'border-white/10'
                      )}
                      style={{ backgroundColor: bg.value }}
                      title={bg.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Transcript + Export */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <TranscriptPanel
                segments={segments}
                glossTranscript={glossTranscript}
                currentTime={store.currentTime}
                onSeek={handleSeek}
                searchQuery={store.searchQuery}
                onSearchChange={store.setSearchQuery}
                mode="sign-language"
              />
            </div>
            <div>
              <ExportPanel
                jobId={store.currentJob!.job_id}
                segments={segments}
                mode="sign-language"
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
