import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/layout/Layout';
import LandingPage from './pages/LandingPage';
import TranslatorPage from './pages/TranslatorPage';
import VideoStudioPage from './pages/VideoStudioPage';
import HistoryPage from './pages/HistoryPage';
import ModelLabPage from './pages/ModelLabPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import { CommandPalette } from './components/common/CommandPalette';
import { useSettingsStore } from './store/useSettingsStore';
import { useEffect } from 'react';

export default function App() {
  const theme = useSettingsStore((s) => s.theme);
  const accentTheme = useSettingsStore((s) => s.accentTheme || 'teal');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-accent', accentTheme);
  }, [theme, accentTheme]);

  return (
    <BrowserRouter>
      <div className={theme}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(30,30,46,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fafafa',
              backdropFilter: 'blur(12px)',
            },
          }}
        />
        <CommandPalette />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route element={<Layout />}>
              <Route path="/translate" element={<TranslatorPage />} />
              <Route path="/video" element={<VideoStudioPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/model-lab" element={<ModelLabPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </AnimatePresence>
      </div>
    </BrowserRouter>
  );
}
