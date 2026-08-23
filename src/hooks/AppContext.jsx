import { createContext, useCallback, useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AppContext } from '../contexts/AppContextCore';

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // ---- Theme state ----
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('expenshare-theme') || 'system';
  });

  const updateWindowTheme = useCallback(async (newTheme) => {
    try {
      const win = getCurrentWindow();
      if (newTheme === 'system') {
        // Follow OS: set to 'light' or 'dark' based on system preference
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        await win.setTheme(systemDark ? 'dark' : 'light');
      } else {
        await win.setTheme(newTheme); // 'light' or 'dark'
      }
    } catch (err) {
      // On some platforms this might not be supported – just log and ignore
      console.debug('Window theme update failed:', err);
    }
  }, []);

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (theme === 'system') {
      root.classList.toggle('dark', systemDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }

    localStorage.setItem('expenshare-theme', theme);
    updateWindowTheme(theme);
  }, [theme, updateWindowTheme]);

  // Listen to system changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      document.documentElement.classList.toggle('dark', e.matches);
      // Also update window theme to match the new system preference
      getCurrentWindow().setTheme(e.matches ? 'dark' : 'light')
        .catch(err => console.debug('Window theme update failed:', err));
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme]);

  // ---- End theme ----

  const refreshSettings = useCallback(async () => {
    const s = await window.tauriAPI.settings.getAll();
    setSettings(s);
    return s;
  }, []);

  // Simulate progress bar animation during loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        const increment = Math.random() * 6 + 2;
        return Math.min(p + increment, 95);
      });
    }, 200);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const start = Date.now();
    let loaded = false;

    const load = async () => {
      try {
        await refreshSettings();
        loaded = true;
      } catch (err) {
        console.error('Failed to load settings:', err);
        loaded = true;
      } finally {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, 3000 - elapsed);
        setTimeout(() => {
          setProgress(100);
          setLoading(false);
        }, remaining);
      }
    };
    load();
  }, [refreshSettings]);

  const notifyDataChanged = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  const showToast = useCallback((message, tone = 'default') => {
    setToast({ message, tone, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const currencySymbol = settings?.currency_symbol || '₱';
  const people = settings?.people || [];

  return (
    <AppContext.Provider
      value={{
        settings,
        refreshSettings,
        dataVersion,
        notifyDataChanged,
        currencySymbol,
        people,
        toast,
        showToast,
        loading,
        progress,
        theme,
        setTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}