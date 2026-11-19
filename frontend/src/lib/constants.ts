export const ROUTES = {
  HOME: '/',
  TRANSLATOR: '/translate',
  VIDEO_STUDIO: '/video',
  HISTORY: '/history',
  MODEL_LAB: '/model-lab',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',
} as const;

export const SUPPORTED_UI_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
] as const;

export const DEFAULT_SOURCE_LANG = 'auto';
export const DEFAULT_TARGET_LANG = 'hi';
