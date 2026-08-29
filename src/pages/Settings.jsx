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
  const [newPersonName, setNewPersonName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    if (people) {
      setNames(Object.fromEntries(people.map((p) => [p.id, p.name])));
    }
  }, [people]);

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

  async function handleAddPerson(e) {
    e?.preventDefault();
    const name = newPersonName.trim();
    if (!name) return;
    try {
      await window.tauriAPI.settings.addPerson(name);
      setNewPersonName('');
      setIsAdding(false);
      await refreshSettings();
      notifyDataChanged();
      showToast(`Added ${name}.`);
    } catch (err) {
      showToast(typeof err === 'string' ? err : 'Failed to add person.');
    }
  }

  async function handleDeletePerson(person) {
    if ((people || []).length <= 1) {
      showToast('Cannot remove the only person.');
      return;
    }
    try {
      await window.tauriAPI.settings.deletePerson(person.id);
      await refreshSettings();
      notifyDataChanged();
      showToast(`Removed ${person.name}.`);
    } catch (err) {
      showToast(typeof err === 'string' ? err : 'Cannot remove person with existing income records.');
    }
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bodoni text-xs uppercase tracking-[0.12em] text-ink-muted">Household Members</h2>
          {!isAdding && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-moss hover:underline"
            >
              + Add Person
            </button>
          )}
        </div>
        <div className="space-y-3">
          {(people || []).map((person, idx) => (
            <div key={person.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <label className="text-xs sm:text-sm text-ink-muted sm:w-24 shrink-0" htmlFor={`name-${person.id}`}>
                Person {idx + 1}
              </label>
              <input
                id={`name-${person.id}`}
                type="text"
                value={names[person.id] ?? person.name}
                onChange={(e) => setNames((n) => ({ ...n, [person.id]: e.target.value }))}
                onBlur={() => saveName(person.id)}
                className="flex-1 rounded-md border border-line bg-paper px-3 py-1.5 text-sm"
              />
              {(people || []).length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeletePerson(person)}
                  className="self-end sm:self-center px-2 py-1 text-xs text-rust hover:underline active:opacity-70 shrink-0"
                  title="Remove person"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          {isAdding && (
            <form onSubmit={handleAddPerson} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 pt-2 border-t border-line/60">
              <label className="text-xs sm:text-sm text-ink-muted sm:w-24 shrink-0">
                New Person
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Spouse, Roommate, Partner"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                className="flex-1 rounded-md border border-line bg-paper px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-moss"
              />
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="submit"
                  disabled={!newPersonName.trim()}
                  className="rounded-md bg-moss px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setNewPersonName('');
                  }}
                  className="rounded-md border border-line bg-paper px-3 py-1.5 text-xs text-ink-muted hover:bg-paper"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Currency section */}
      <section className="mt-4 rounded-lg border border-line bg-paper/80 px-4 py-3.5 sm:mt-6 sm:px-5 sm:py-4">
        <h2 className="mb-3 font-bodoni text-xs uppercase tracking-[0.12em] text-ink-muted">Currency</h2>
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
        <h2 className="mb-3 font-bodoni text-xs uppercase tracking-[0.12em] text-ink-muted">Theme</h2>
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
        <h2 className="mb-3 font-bodoni text-xs uppercase tracking-[0.12em] text-ink-muted">
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
        <h2 className="mb-3 font-bodoni text-xs uppercase tracking-[0.12em] text-ink-muted">
          About &amp; Updates
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">ExpenShare {appVersion ? `v${appVersion}` : ''}</p>
            <p className="text-xs text-ink-muted">Offline shared household budget tracker.</p>
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