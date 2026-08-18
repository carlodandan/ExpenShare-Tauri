import React, { useState } from 'react';
import { useAppContext } from '../hooks/AppContext.jsx';

const CURRENCIES = [
  { code: 'PHP', symbol: '₱' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
];

export default function Settings() {
  const { settings, people, refreshSettings, showToast, notifyDataChanged } = useAppContext();
  const [names, setNames] = useState(() =>
    Object.fromEntries((people || []).map((p) => [p.id, p.name]))
  );

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

  return (
    <div className="mx-auto max-w-5xl px-2 py-6">
      <h1 className="text-lg font-semibold">Settings</h1>

      <section className="mt-6 rounded-lg border border-line bg-surface px-5 py-4">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">People</h2>
        <div className="space-y-3">
          {(people || []).map((person) => (
            <div key={person.id} className="flex items-center gap-3">
              <label className="w-24 text-sm text-ink-muted" htmlFor={`name-${person.id}`}>
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

      <section className="mt-6 rounded-lg border border-line bg-surface px-5 py-4">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">Currency</h2>
        <select
          value={settings.currency || 'PHP'}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          className="rounded-md border border-line bg-paper px-3 py-1.5 text-sm"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.code}
            </option>
          ))}
        </select>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-surface px-5 py-4">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          Database Backup
        </h2>
        <p className="mb-3 text-sm text-ink-muted">
          All data is stored locally. Back it up to a file, or restore from a previous backup.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleBackup}
            className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-paper"
          >
            Backup Database
          </button>
          <button
            type="button"
            onClick={handleRestore}
            className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-paper"
          >
            Restore Database
          </button>
        </div>
      </section>
    </div>
  );
}