import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContextCore.jsx';

const CURRENCIES = [
  { code: 'PHP', symbol: '₱' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
];

export default function Settings() {
  const { settings, people, refreshSettings, showToast, notifyDataChanged, theme, setTheme } = useAppContext();
  const [names, setNames] = useState(() =>
    Object.fromEntries((people || []).map((p) => [p.id, p.name]))
  );
  const [appVersion, setAppVersion] = useState('');
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    window.tauriAPI?.appInfo?.getVersion().then((v) => setAppVersion(v.app)).catch(() => {});
  }, []);

  if (!settings) {
    return <div className="p-8 text-sm text-ink-muted">Loading…</div>;
  }

  async function saveName(id) {
    const name = (names[id] || '').trim();
    if (!name) return;
    await window.tauriAPI.settings.renamePerson(id, name);
    await refreshSettings();
    notifyDataChanged();
    showToast('Name updated.');
  }

  async function handleCurrencyChange(code) {
    const currency = CURRENCIES.find((c) => c.code === code);
    if (!currency) return;
    await window.tauriAPI.settings.set('currency', currency.code);
    await window.tauriAPI.settings.set('currency_symbol', currency.symbol);
    await refreshSettings();
    notifyDataChanged();
    showToast('Currency updated.');
  }

  async function handleBackup() {
    const result = await window.tauriAPI.backup.export();
    if (!result.canceled) showToast('Backup saved.');
  }

  async function handleRestore() {
    const result = await window.tauriAPI.backup.restore();
    if (!result.canceled) {
      showToast('Data restored. Reloading…');
      setTimeout(() => window.location.reload(), 800);
    }
  }

  async function handleCheckForUpdates() {
    setCheckingUpdate(true);
    try {
      const updated = await window.tauriAPI.updater.check();
      if (updated) {
        showToast('Update installed! Restarting app...');
      } else {
        showToast('You are using the latest version.');
      }
    } catch (err) {
      console.error('Update check failed:', err);
      showToast('Could not check for updates.');
    } finally {
      setCheckingUpdate(false);
    }
  }

  const handleThemeChange = (value) => {
    setTheme(value);
    showToast(`Theme set to ${value === 'system' ? 'auto' : value}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      <h1 className="text-lg font-semibold">Settings</h1>

      {/* People section */}
      <section className="mt-4 rounded-lg border border-line bg-paper/80 px-4 py-3.5 sm:mt-6 sm:px-5 sm:py-4">
        <h2 className="mb-3 font-bodoni text-[11px] uppercase tracking-[0.14em] text-ink-muted">People</h2>
        <div className="space-y-3">
          {(people || []).map((person) => (
            <div key={person.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <label className="text-xs sm:text-sm text-ink-muted sm:w-24 shrink-0" htmlFor={`name-${person.id}`}>
                {person.sort_order === 1 ? 'Person 1' : 'Person 2'}
              </label>
              <input
                id={`name-${person.id}`}
                type="text"
                value={names[person.id] ?? person.name}
                onChange={(e) => setNames((n) => ({ ...n, [person.id]: e.target.value }))}
                onBlur={() => saveName(person.id)}
                className="flex-1 rounded-md border border-line bg-paper px-3 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Currency section */}
      <section className="mt-4 rounded-lg border border-line bg-paper/80 px-4 py-3.5 sm:mt-6 sm:px-5 sm:py-4">
        <h2 className="mb-3 font-bodoni text-[11px] uppercase tracking-[0.14em] text-ink-muted">Currency</h2>
        <select
          value={settings.currency || 'PHP'}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          className="w-full sm:w-auto rounded-md border border-line bg-paper px-3 py-1.5 text-sm"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.code}
            </option>
          ))}
        </select>
      </section>

      {/* Theme section */}
      <section className="mt-4 rounded-lg border border-line bg-paper/80 px-4 py-3.5 sm:mt-6 sm:px-5 sm:py-4">
        <h2 className="mb-3 font-bodoni text-[11px] uppercase tracking-[0.14em] text-ink-muted">Theme</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="theme"
              value="light"
              checked={theme === 'light'}
              onChange={() => handleThemeChange('light')}
            />
            Light
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={theme === 'dark'}
              onChange={() => handleThemeChange('dark')}
            />
            Dark
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="theme"
              value="system"
              checked={theme === 'system'}
              onChange={() => handleThemeChange('system')}
            />
            Auto (system)
          </label>
        </div>
      </section>

      {/* Backup section */}
      <section className="mt-4 rounded-lg border border-line bg-paper/80 px-4 py-3.5 sm:mt-6 sm:px-5 sm:py-4">
        <h2 className="mb-3 font-bodoni text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          Database Backup
        </h2>
        <p className="mb-3 text-sm text-ink-muted">
          All data is stored locally. Back it up to a file, or restore from a previous backup.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleBackup}
            className="flex-1 sm:flex-none rounded-md border border-line px-3.5 py-2 sm:py-1.5 text-sm hover:bg-paper active:opacity-70 text-center"
          >
            Backup Database
          </button>
          <button
            type="button"
            onClick={handleRestore}
            className="flex-1 sm:flex-none rounded-md border border-line px-3.5 py-2 sm:py-1.5 text-sm hover:bg-paper active:opacity-70 text-center"
          >
            Restore Database
          </button>
        </div>
      </section>

      {/* About & Updates section */}
      <section className="mt-4 rounded-lg border border-line bg-paper/80 px-4 py-3.5 sm:mt-6 sm:px-5 sm:py-4">
        <h2 className="mb-3 font-bodoni text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          About & Updates
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">ExpenShare {appVersion ? `v${appVersion}` : ''}</p>
            <p className="text-xs text-ink-muted">Offline household budget tracker for two people.</p>
          </div>
          <button
            type="button"
            onClick={handleCheckForUpdates}
            disabled={checkingUpdate}
            className="self-start sm:self-auto rounded-md border border-line px-3.5 py-2 sm:py-1.5 text-sm hover:bg-paper active:opacity-70 disabled:opacity-50"
          >
            {checkingUpdate ? 'Checking…' : 'Check for Updates'}
          </button>
        </div>
      </section>
    </div>
  );
}