import { useEffect } from 'react';

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const key = [
        e.ctrlKey || e.metaKey ? 'Ctrl' : '',
        e.shiftKey ? 'Shift' : '',
        e.altKey ? 'Alt' : '',
        e.key.length === 1 ? e.key.toUpperCase() : e.key,
      ].filter(Boolean).join('+');

      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
