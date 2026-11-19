export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
  nllbCode: string;
}

export interface TranslationRequest {
  text: string;
  source_lang: string;
  target_lang: string;
  tone?: 'formal' | 'casual' | 'neutral';
}

export interface TranslationResponse {
  translated_text: string;
  detected_lang?: string;
  confidence?: number;
  source_lang: string;
  target_lang: string;
  alternatives: string[];
  latency_ms: number;
  detected_tone?: string;
}

export interface DetectionResult {
  language: string;
  confidence: number;
  top_predictions: Array<{ language: string; confidence: number }>;
}

export interface HistoryItem {
  id: number;
  source_text: string;
  target_text: string;
  source_lang: string;
  target_lang: string;
  detected_lang?: string;
  confidence?: number;
  is_favorite: boolean;
  created_at: string;
}

export type VideoMode = 'captioning' | 'sign-language';

export interface VideoJob {
  job_id: string;
  status: 'uploading' | 'processing' | 'extracting_audio' | 'transcribing' | 'translating' | 'understanding_context' | 'generating_signs' | 'synchronizing' | 'complete' | 'error';
  progress: number;
  stage?: string;
  mode?: string;
  result?: VideoResult;
  error?: string;
}

export interface VideoResult {
  segments: VideoSegment[];
  gloss_sequence?: GlossToken[];
  gloss_transcript?: GlossTranscriptEntry[];
  duration: number;
  source_lang?: string;
  target_lang?: string;
  sign_language?: string;
  detected_lang?: string;
  language_probability?: number;
  total_signs?: number;
  total_segments?: number;
}

export interface VideoSegment {
  id?: string;
  index?: number;
  start: number;
  end: number;
  text: string;
  translated_text?: string;
  english_text?: string;
  words?: Array<{ word: string; start: number; end: number }>;
  speaker?: string;
}

export interface GlossToken {
  gloss: string;
  type: 'sign' | 'fingerspell';
  start_time: number;
  end_time: number;
  duration_ms: number;
  animation_data?: SignAnimationData;
}

export interface GlossTranscriptEntry {
  segment_index: number;
  start: number;
  end: number;
  original_text: string;
  gloss_text: string;
  sign_count: number;
}

export interface SignAnimationData {
  hand_shape: string;
  location: string;
  movement: string;
  two_handed: boolean;
  bone_rotations?: {
    left_upper_arm?: [number, number, number];
    left_lower_arm?: [number, number, number];
    left_hand?: [number, number, number];
    right_upper_arm?: [number, number, number];
    right_lower_arm?: [number, number, number];
    right_hand?: [number, number, number];
  };
  facial_expression?: string;
  head_tilt?: string;
  body_lean?: string;
}

export interface CaptionStyle {
  fontSize: number;
  position: 'top' | 'bottom' | 'middle';
  bgColor: string;
  textColor: string;
  enabled: boolean;
}

export interface SignLanguageOption {
  code: string;
  name: string;
  description: string;
  wordCount: number;
}

export interface VoiceMessage {
  type: 'partial' | 'final' | 'error' | 'status' | 'pong';
  text?: string;
  translated_text?: string;
  language?: string;
  confidence?: number;
  latency_ms?: number;
  error?: string;
  message?: string;
}

export interface AnalyticsSummary {
  total_translations: number;
  total_characters: number;
  avg_latency_ms: number;
  languages_used: number;
  favorites: number;
}

export interface GlossaryEntry {
  id: number;
  source_term: string;
  target_term: string;
  source_lang: string;
  target_lang: string;
  created_at: string;
}
