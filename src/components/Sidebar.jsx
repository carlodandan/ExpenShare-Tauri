import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Gauge,
  Wallet,
  Target,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { key: 'monthly', label: 'Monthly Dashboard', icon: LayoutDashboard },
  { key: 'total', label: 'Total Dashboard', icon: Gauge },
  { key: 'extra-budget', label: 'Extra Budget', icon: Wallet },
  { key: 'goals', label: 'Set Goals', icon: Target },
];

export default function Sidebar({ current, onNavigate }) {
  const [version, setVersion] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    async function loadInfo() {
      const info = await window.tauriAPI.settings.getVersion();
      setVersion(info.app);
    }
    loadInfo();
  }, []);

  return (
    <>
      <header className="flex h-12 w-full shrink-0 items-center justify-between border-b border-line bg-paper/80 px-4 pt-[env(safe-area-inset-top,0px)] box-content md:hidden">
        <p className="font-bodoni text-sm font-semibold uppercase tracking-[0.18em] text-ink-muted">
          ExpenShare
        </p>
        {version && (
          <span className="text-xs text-ink-muted/70">v{version}</span>
        )}
      </header>

      <aside
        className={`
          hidden shrink-0 flex-col justify-between border-r border-line bg-paper/80 transition-all duration-300 ease-in-out md:flex
          ${isMinimized ? 'w-14' : 'w-56'}
        `}
      >
        <div>
          <div className="flex items-center px-3 pb-4 pt-6">
            {!isMinimized && (
              <p className="flex-1 font-bodoni text-[15px] uppercase tracking-[0.18em] text-ink-muted">
                ExpenShare
              </p>
            )}
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className={`
                flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-paper
                ${isMinimized ? 'mx-auto' : 'ml-1'}
              `}
              aria-label={isMinimized ? 'Expand sidebar' : 'Minimize sidebar'}
            >
              {isMinimized ? (
                <ChevronsRight size={16} strokeWidth={2} />
              ) : (
                <ChevronsLeft size={16} strokeWidth={2} />
              )}
            </button>
          </div>

          <nav className="flex flex-col gap-0.5 px-3">
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
              const active = current === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onNavigate(key)}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'bg-moss-soft text-moss font-medium'
                      : 'text-ink-muted hover:bg-paper hover:text-ink',
                    isMinimized ? 'justify-center px-0' : '',
                  ].join(' ')}
                  title={isMinimized ? label : undefined}
                >
                  <Icon
                    size={isMinimized ? 20 : 18}
                    className="shrink-0"
                    strokeWidth={1.75}
                  />
                  {!isMinimized && label}
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
              isMinimized ? 'justify-center px-0' : '',
            ].join(' ')}
            title={isMinimized ? 'Settings' : undefined}
          >
            <Settings
              size={isMinimized ? 20 : 18}
              className="shrink-0"
              strokeWidth={1.75}
            />
            {!isMinimized && 'Settings'}
          </button>
          {!isMinimized && version && (
            <div className="mt-3 text-center text-[15px] text-ink-muted/60">
              v{version}
            </div>
          )}
        </div>
      </aside>

      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-line bg-paper/80 pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      >
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = current === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center justify-center py-1.5 text-xs transition-colors ${
                active ? 'text-moss font-semibold' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.75} />
              <span className="mt-1 text-[11px] leading-tight line-clamp-1">{label.replace(' Dashboard', '')}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          aria-current={current === 'settings' ? 'page' : undefined}
          className={`flex flex-1 flex-col items-center justify-center py-1.5 text-xs transition-colors ${
            current === 'settings' ? 'text-moss font-semibold' : 'text-ink-muted hover:text-ink'
          }`}
        >
          <Settings size={20} strokeWidth={current === 'settings' ? 2.2 : 1.75} />
          <span className="mt-1 text-[11px] leading-tight">Settings</span>
        </button>
      </nav>
    </>
  );
}