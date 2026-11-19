import axios from 'axios';
import type { TranslationResponse, DetectionResult, HistoryItem, Language, AnalyticsSummary, GlossaryEntry, VideoJob } from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Translation
export async function translateText(text: string, sourceLang: string, targetLang: string, tone?: string): Promise<TranslationResponse> {
  const { data } = await api.post('/api/translate', { text, source_lang: sourceLang, target_lang: targetLang, tone });
  return data;
}

export async function detectLanguage(text: string): Promise<DetectionResult> {
  const { data } = await api.post('/api/detect', { text });
  return data;
}

// Languages
export async function getLanguages(): Promise<Language[]> {
  const { data } = await api.get('/api/languages');
  return data.map((l: any) => ({
    code: l.code, name: l.name, nativeName: l.native_name,
    flag: l.flag, rtl: l.rtl, nllbCode: l.nllb_code,
  }));
}

export async function searchLanguages(query: string): Promise<Language[]> {
  const { data } = await api.get(`/api/languages/search?q=${encodeURIComponent(query)}`);
  return data.map((l: any) => ({
    code: l.code, name: l.name, nativeName: l.native_name,
    flag: l.flag, rtl: l.rtl, nllbCode: l.nllb_code,
  }));
}

// History
export async function getHistory(page = 1, limit = 20): Promise<{ items: HistoryItem[]; total: number }> {
  const { data } = await api.get(`/api/history?page=${page}&limit=${limit}`);
  return data;
}

export async function saveHistory(entry: Partial<HistoryItem>): Promise<void> {
  await api.post('/api/history', entry);
}

export async function deleteHistoryItem(id: number): Promise<void> {
  await api.delete(`/api/history/${id}`);
}

export async function clearAllHistory(): Promise<void> {
  await api.delete('/api/history/clear');
}

export async function toggleFavorite(id: number): Promise<{ is_favorite: boolean }> {
  const { data } = await api.post(`/api/history/${id}/favorite`);
  return data;
}

export async function getFavorites(page = 1): Promise<{ items: HistoryItem[]; total: number }> {
  const { data } = await api.get(`/api/history/favorites?page=${page}`);
  return data;
}

// Glossary
export async function getGlossary(): Promise<{ items: GlossaryEntry[]; total: number }> {
  const { data } = await api.get('/api/glossary');
  return data;
}

export async function addGlossaryEntry(entry: Omit<GlossaryEntry, 'id' | 'created_at'>): Promise<void> {
  await api.post('/api/glossary', entry);
}

export async function deleteGlossaryEntry(id: number): Promise<void> {
  await api.delete(`/api/glossary/${id}`);
}

// Video - Legacy
export async function uploadVideo(file: File, sourceLang: string, targetLang: string, signLang = 'asl'): Promise<VideoJob> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source_lang', sourceLang);
  formData.append('target_lang', targetLang);
  formData.append('sign_language', signLang);
  const { data } = await api.post('/api/video/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  });
  return data;
}

// Video Captioning
export async function uploadVideoForCaptioning(file: File, sourceLang: string, targetLang: string): Promise<VideoJob> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source_lang', sourceLang);
  formData.append('target_lang', targetLang);
  const { data } = await api.post('/api/video/caption', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  });
  return data;
}

// Video Sign Language Translation
export async function uploadVideoForSignLanguage(file: File, sourceLang: string, signLanguage: string): Promise<VideoJob> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source_lang', sourceLang);
  formData.append('sign_language', signLanguage);
  const { data } = await api.post('/api/video/sign-translate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  });
  return data;
}

export async function getVideoStatus(jobId: string): Promise<VideoJob> {
  const { data } = await api.get(`/api/video/status/${jobId}`);
  return data;
}

export async function getVideoResult(jobId: string): Promise<any> {
  const { data } = await api.get(`/api/video/result/${jobId}`);
  return data;
}

// Edit caption segment
export async function editCaption(jobId: string, segmentIndex: number, text: string): Promise<void> {
  await api.put(`/api/video/caption/${jobId}/edit`, { segment_index: segmentIndex, text });
}

// Regenerate caption segment
export async function regenerateCaption(jobId: string, segmentIndex: number): Promise<any> {
  const { data } = await api.post(`/api/video/caption/${jobId}/regenerate`, { segment_index: segmentIndex });
  return data;
}

// Export video file
export async function exportVideoFile(jobId: string, format: string): Promise<Blob> {
  const { data } = await api.get(`/api/video/export/${jobId}/${format}`, { responseType: 'blob' });
  return data;
}

// Get supported sign languages
export async function getSignLanguages(): Promise<any[]> {
  const { data } = await api.get('/api/video/sign-languages');
  return data;
}

// Documents
export async function parseDocument(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/api/documents/parse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // 2 minutes
  });
  return data;
}

export async function translateDocument(file: File, sourceLang: string, targetLang: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source_lang', sourceLang);
  formData.append('target_lang', targetLang);
  const { data } = await api.post('/api/documents/translate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000, // 5 minutes - prevents timeout of 60000ms on large documents
  });
  return data;
}

export async function exportDocument(payload: {
  filename: string;
  format: 'docx' | 'pdf' | 'txt';
  target_lang: string;
  source_lang?: string;
  pages?: any[];
  paragraphs?: any[];
}): Promise<Blob> {
  const response = await api.post('/api/documents/export', payload, {
    responseType: 'blob',
  });
  return response.data;
}

// Analytics
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const { data } = await api.get('/api/analytics/summary');
  return data;
}

export async function getDailyUsage(): Promise<{ daily_usage: Array<{ date: string; count: number }> }> {
  const { data } = await api.get('/api/analytics/daily');
  return data;
}

export async function getTopLanguages(): Promise<any> {
  const { data } = await api.get('/api/analytics/languages');
  return data;
}

// Health
export async function getHealth(): Promise<any> {
  const { data } = await api.get('/health');
  return data;
}

export default api;
