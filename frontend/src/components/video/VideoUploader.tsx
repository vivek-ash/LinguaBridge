import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Film, Clock, HardDrive, Play, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VideoUploaderProps {
  onFileSelected: (file: File) => void;
  videoUrl: string | null;
  videoName: string;
  videoSize: number;
  videoDuration: number;
  onRemove: () => void;
  maxDuration?: number;
  maxDurationLabel?: string;
  compact?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoUploader({
  onFileSelected,
  videoUrl,
  videoName,
  videoSize,
  videoDuration,
  onRemove,
  maxDuration,
  maxDurationLabel,
  compact = false,
}: VideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/avi'];
    if (!allowed.some(t => file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|webm|mkv|avi)$/i))) {
      toast.error('Unsupported format. Please upload MP4, MOV, WebM, MKV, or AVI.');
      return;
    }

    // Check duration if max set
    if (maxDuration) {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.onloadedmetadata = () => {
        URL.revokeObjectURL(tempVideo.src);
        if (tempVideo.duration > maxDuration) {
          toast.error(`Video is ${formatDuration(tempVideo.duration)} long. Maximum allowed: ${formatDuration(maxDuration)}.`, {
            duration: 5000,
            icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          });
          return;
        }
        onFileSelected(file);
      };
      tempVideo.src = URL.createObjectURL(file);
    } else {
      onFileSelected(file);
    }
  }, [maxDuration, onFileSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Generate thumbnail when video loads
  const handleVideoLoad = useCallback(() => {
    const video = videoPreviewRef.current;
    if (!video) return;
    video.currentTime = 1;
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setThumbnail(canvas.toDataURL('image/jpeg'));
      }
    };
  }, []);

  if (videoUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card overflow-hidden"
      >
        {/* Video Preview – only shown before processing starts */}
        {!compact && (
          <div className="relative bg-black">
            <video
              ref={videoPreviewRef}
              src={videoUrl}
              className="w-full max-h-[300px] object-contain"
              onLoadedMetadata={handleVideoLoad}
              controls
              muted
            />
          </div>
        )}

        {/* File Info Bar */}
        <div className="px-5 py-3.5 border-t border-white/[0.08] bg-[#0c1020]/90 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-200 font-medium">
              <Film className="w-4 h-4 text-indigo-400" />
              <span className="truncate max-w-[200px]">{videoName}</span>
            </div>
            {videoSize > 0 && (
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <HardDrive className="w-3.5 h-3.5" />
                <span>{formatFileSize(videoSize)}</span>
              </div>
            )}
            {videoDuration > 0 && (
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{formatDuration(videoDuration)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.08] transition-colors cursor-pointer"
            >
              Replace Video
            </button>
            <button
              onClick={onRemove}
              className="p-1.5 rounded-xl hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'glass-card p-12 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[320px] relative overflow-hidden group',
          isDragging
            ? 'border-indigo-500/50 bg-indigo-950/25 ring-2 ring-indigo-500/30'
            : 'hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-950/20'
        )}
      >
        {/* Animated gradient border effect */}
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-cyan-500/10 pointer-events-none"
          />
        )}

        <motion.div
          animate={{ scale: isDragging ? 1.08 : 1 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600/15 to-cyan-500/10 border border-indigo-500/25 flex items-center justify-center mb-5 relative group-hover:border-indigo-500/40 transition-colors shadow-lg"
        >
          <Upload className="w-9 h-9 text-indigo-400 group-hover:scale-105 transition-transform" />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-2xl border border-indigo-500/20"
          />
        </motion.div>

        <p className="text-xl font-bold text-slate-100 mb-1.5 font-['Space_Grotesk']">
          Upload Video File
        </p>
        <p className="text-slate-400 text-sm">
          Drag & drop your video here, or click to browse files
        </p>
        <p className="text-xs text-slate-400 mt-2 font-mono">
          Supported: MP4, WebM, MOV, MKV, AVI
        </p>

        {maxDuration && maxDurationLabel && (
          <div className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-amber-300">{maxDurationLabel}</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
    </motion.div>
  );
}
