import { create } from 'zustand';
import type { VideoJob, VideoMode, CaptionStyle } from '@/types';

interface VideoState {
  // Mode
  mode: VideoMode;
  setMode: (m: VideoMode) => void;

  // Job tracking
  currentJob: VideoJob | null;
  setCurrentJob: (job: VideoJob | null) => void;

  // Upload
  isUploading: boolean;
  uploadProgress: number;
  setUploading: (v: boolean, progress?: number) => void;

  // Video
  videoUrl: string | null;
  videoFile: File | null;
  videoDuration: number;
  videoName: string;
  videoSize: number;
  setVideoUrl: (url: string | null) => void;
  setVideoFile: (f: File | null) => void;
  setVideoDuration: (d: number) => void;
  setVideoMeta: (name: string, size: number) => void;

  // Playback
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  setCurrentTime: (t: number) => void;
  setPlaying: (v: boolean) => void;
  setPlaybackRate: (r: number) => void;
  setVolume: (v: number) => void;

  // Captioning
  captionStyle: CaptionStyle;
  setCaptionStyle: (s: Partial<CaptionStyle>) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Sign language
  signLanguage: string;
  setSignLanguage: (l: string) => void;
  avatarColor: string;
  setAvatarColor: (c: string) => void;
  showGloss: boolean;
  setShowGloss: (v: boolean) => void;
  avatarSpeed: number;
  setAvatarSpeed: (s: number) => void;
  avatarSize: 'small' | 'medium' | 'large' | 'fullscreen';
  setAvatarSize: (s: 'small' | 'medium' | 'large' | 'fullscreen') => void;
  avatarBg: string;
  setAvatarBg: (bg: string) => void;
  avatarZoom: number;
  setAvatarZoom: (z: number) => void;

  // Reset
  reset: () => void;
}

const defaultCaptionStyle: CaptionStyle = {
  fontSize: 16,
  position: 'bottom',
  bgColor: 'rgba(0,0,0,0.7)',
  textColor: '#ffffff',
  enabled: true,
};

export const useVideoStore = create<VideoState>((set) => ({
  mode: 'captioning',
  currentJob: null,
  isUploading: false,
  uploadProgress: 0,
  videoUrl: null,
  videoFile: null,
  videoDuration: 0,
  videoName: '',
  videoSize: 0,
  currentTime: 0,
  isPlaying: false,
  playbackRate: 1,
  volume: 1,
  captionStyle: { ...defaultCaptionStyle },
  searchQuery: '',
  signLanguage: 'asl',
  avatarColor: '#7c3aed',
  showGloss: true,
  avatarSpeed: 1,
  avatarSize: 'large',
  avatarBg: '#06060c',
  avatarZoom: 1,

  setMode: (m) => set({ mode: m }),
  setCurrentJob: (job) => set({ currentJob: job }),
  setUploading: (v, progress) => set({ isUploading: v, uploadProgress: progress ?? 0 }),
  setVideoUrl: (url) => set({ videoUrl: url }),
  setVideoFile: (f) => set({ videoFile: f }),
  setVideoDuration: (d) => set({ videoDuration: d }),
  setVideoMeta: (name, size) => set({ videoName: name, videoSize: size }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setPlaying: (v) => set({ isPlaying: v }),
  setPlaybackRate: (r) => set({ playbackRate: r }),
  setVolume: (v) => set({ volume: v }),
  setCaptionStyle: (s) => set((state) => ({ captionStyle: { ...state.captionStyle, ...s } })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSignLanguage: (l) => set({ signLanguage: l }),
  setAvatarColor: (c) => set({ avatarColor: c }),
  setShowGloss: (v) => set({ showGloss: v }),
  setAvatarSpeed: (s) => set({ avatarSpeed: s }),
  setAvatarSize: (s) => set({ avatarSize: s }),
  setAvatarBg: (bg) => set({ avatarBg: bg }),
  setAvatarZoom: (z) => set({ avatarZoom: z }),

  reset: () => set({
    currentJob: null,
    isUploading: false,
    uploadProgress: 0,
    videoUrl: null,
    videoFile: null,
    videoDuration: 0,
    videoName: '',
    videoSize: 0,
    currentTime: 0,
    isPlaying: false,
    captionStyle: { ...defaultCaptionStyle },
    searchQuery: '',
  }),
}));
