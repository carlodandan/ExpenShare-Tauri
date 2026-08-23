import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

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
        return Math.min(p + increment, 95); // never reach 100 until done
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
        loaded = true; // still proceed
      } finally {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, 3000 - elapsed);
        setTimeout(() => {
          setProgress(100); // complete the bar
          setLoading(false);
        }, remaining);
      }
    };
    load();
  }, [refreshSettings]);

  // Call after any create/update/delete so every page listening on
  // dataVersion refetches
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}