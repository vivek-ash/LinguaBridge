import { Download, Copy, FileText, Subtitles, Languages } from 'lucide-react';
import { toast } from 'sonner';
import { exportVideoFile } from '@/lib/api';
import type { VideoSegment } from '@/types';

interface ExportPanelProps {
  jobId: string;
  segments: VideoSegment[];
  mode: 'captioning' | 'sign-language';
}

export default function ExportPanel({ jobId, segments, mode }: ExportPanelProps) {
  const downloadFile = async (format: string, filename: string) => {
    try {
      const blob = await exportVideoFile(jobId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${filename}`);
    } catch {
      toast.error('Download failed');
    }
  };

  const copyTranscript = () => {
    const text = segments.map(s => {
      const translated = s.translated_text || '';
      return `${s.text}${translated ? `\n→ ${translated}` : ''}`;
    }).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Transcript copied');
  };

  const buttons = [
    { label: 'SRT Subtitles', icon: <Subtitles className="w-4 h-4 text-teal-600 dark:text-teal-400" />, format: 'srt', file: `subtitles_${jobId.slice(0, 8)}.srt` },
    { label: 'VTT Web', icon: <Subtitles className="w-4 h-4 text-teal-600 dark:text-teal-400" />, format: 'vtt', file: `subtitles_${jobId.slice(0, 8)}.vtt` },
    { label: 'Original Text', icon: <FileText className="w-4 h-4 text-slate-500" />, format: 'transcript', file: `transcript_${jobId.slice(0, 8)}.txt` },
    ...(mode === 'captioning' ? [
      { label: 'Translated TXT', icon: <Languages className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />, format: 'translated_transcript', file: `translated_${jobId.slice(0, 8)}.txt` },
    ] : [
      { label: 'Gloss Signs', icon: <FileText className="w-4 h-4 text-amber-500" />, format: 'gloss', file: `gloss_${jobId.slice(0, 8)}.txt` },
    ]),
  ];

  return (
    <div className="app-card p-4 space-y-3">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        Export & Localization Subtitles
      </h3>
      <div className="flex flex-wrap gap-2">
        {buttons.map(btn => (
          <button
            key={btn.format}
            onClick={() => downloadFile(btn.format, btn.file)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-400 text-slate-800 dark:text-slate-200 transition-all text-xs font-semibold cursor-pointer shadow-xs"
          >
            {btn.icon}
            {btn.label}
          </button>
        ))}
        <button
          onClick={copyTranscript}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-400 text-slate-800 dark:text-slate-200 transition-all text-xs font-semibold cursor-pointer shadow-xs"
        >
          <Copy className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          Copy All
        </button>
      </div>
    </div>
  );
}
