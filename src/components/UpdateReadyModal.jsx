import React, { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';

// Replicates the visual design of the original Electron auto-updater
// window (see src/main/main.js `createUpdateWindow`) as an in-app modal.
//
// Why this had to change shape (not just be ported 1:1): Electron's
// `update-electron-app` + Squirrel silently downloads updates in the
// background and only pops a *separate native window* once the update is
// ready to install. Tauri's updater plugin has no equivalent "silent
// background download + separate OS window" primitive - update checks and
// downloads happen from within the webview via `@tauri-apps/plugin-updater`.
// This modal reproduces the same copy, colors, and Later/Restart buttons as
// an overlay inside the main window instead of a second BrowserWindow.
//
// Everything else in the app's UI is unchanged.
export default function UpdateReadyModal() {
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState('');
  const [update, setUpdate] = useState(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const found = await check();
        if (cancelled || !found) return;

        // Download now; only reveal the modal once the update is fully
        // downloaded and ready to install, matching the original
        // "update-downloaded" -> show window behavior.
        await found.downloadAndInstall();
        if (cancelled) return;

        setUpdate(found);
        setVersion(found.version || (await getVersion()));
        setReady(true);
      } catch (err) {
        // Silent by design, same as the original (`notifyUser: false`).
        console.error('Update check failed:', err);
      }
    }

    poll();
    const interval = setInterval(poll, 5 * 60 * 1000); // 5 minutes, same cadence as before
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!ready) return null;

  async function handleRestart() {
    setInstalling(true);
    try {
      await relaunch();
    } catch (err) {
      console.error('Failed to relaunch after update:', err);
      setInstalling(false);
    }
  }

  function handleLater() {
    setReady(false);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.35)',
      }}
    >
      <div
        style={{
          width: 440,
          maxWidth: '90vw',
          padding: 32,
          borderRadius: 12,
          background: '#f7f7f5',
          color: '#222',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#222',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            marginBottom: 20,
          }}
        >
          ↑
        </div>

        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600 }}>
          Update Ready
        </h1>

        <p style={{ margin: 0, color: '#666', lineHeight: 1.5, fontSize: 14 }}>
          A new version of ExpenShare has been downloaded and is ready to
          install.
        </p>

        <div style={{ marginTop: 8, fontSize: 13, color: '#999' }}>
          Version {version}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 28 }}>
          <button
            type="button"
            onClick={handleLater}
            disabled={installing}
            style={{
              border: 0,
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 14,
              cursor: 'pointer',
              background: 'transparent',
              color: '#555',
            }}
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleRestart}
            disabled={installing}
            style={{
              border: 0,
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 14,
              cursor: 'pointer',
              background: '#222',
              color: 'white',
            }}
          >
            {installing ? 'Restarting…' : 'Restart & Update'}
          </button>
        </div>
      </div>
    </div>
  );
}
