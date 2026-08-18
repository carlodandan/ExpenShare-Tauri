import React, { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { key: 'monthly', label: 'Monthly Dashboard', glyph: '▣' },
  { key: 'total', label: 'Total Dashboard', glyph: '◉' },
  { key: 'extra-budget', label: 'Extra Budget', glyph: '◎' },
];

export default function Sidebar({ current, onNavigate }) {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    async function loadInfo() {
       const info = await window.tauriAPI.settings.getVersion();
        setVersion(info.app);
    }
    loadInfo();
  }, []);

  return (
    <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-line bg-surface">
      <div>
        <div className="px-5 pb-4 pt-6">
          <p className="font-mono text-[15px] uppercase tracking-[0.18em] text-ink-muted">
            ExpenShare
          </p>
        </div>
        <nav className="flex flex-col gap-0.5 px-3">
          {NAV_ITEMS.map((item) => {
            const active = current === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  active
                    ? 'bg-moss-soft text-moss font-medium'
                    : 'text-ink-muted hover:bg-paper hover:text-ink',
                ].join(' ')}
              >
                <span className="w-4 text-center font-mono" aria-hidden="true">
                  {item.glyph}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-line px-3 py-3">
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          aria-current={current === 'settings' ? 'page' : undefined}
          className={[
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
            current === 'settings'
              ? 'bg-moss-soft text-moss font-medium'
              : 'text-ink-muted hover:bg-paper hover:text-ink',
          ].join(' ')}
        >
          <span className="w-4 text-center" aria-hidden="true">
            ⚙
          </span>
          Settings
        </button>
        {version && (
          <div className="mt-3 text-center text-[15px] text-ink-muted/60">
            v{version}
          </div>
        )}
      </div>
    </aside>
  );
}