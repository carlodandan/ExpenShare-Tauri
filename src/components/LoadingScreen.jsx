import React, { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import loadingGif from '../assets/expenshare@piggybank.gif';

export default function LoadingScreen({ progress }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        getCurrentWindow().show();
      } catch (e) {
        // Not in Tauri
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper">
      <div className="text-center max-w-sm px-6">
        <img
          src={loadingGif}
          alt="Loading…"
          className="w-74 h-74 mx-auto mb-2 object-contain"
        />
        <h1 className="text-2xl font-medium tracking-tight text-ink">
          ExpenShare
        </h1>
        <p className="text-sm text-ink-muted mt-1">Loading your data…</p>

        <div className="mt-6 w-full h-1 bg-line rounded-full overflow-hidden">
          <div
            className="h-full bg-denim rounded-full transition-all duration-200 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-xs text-ink-muted mt-2 tabular-nums">
          {Math.round(Math.min(progress, 100))}%
        </p>
      </div>
    </div>
  );
}