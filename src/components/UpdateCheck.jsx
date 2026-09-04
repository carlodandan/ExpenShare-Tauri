import React, { useState } from "react";
import { useUpdater } from "../hooks/useUpdater.js";

export function UpdateCheck({ appVersion }) {
  const { state, check, install } = useUpdater();
  const [confirming, setConfirming] = useState(false);

  const busy = state.stage === "checking" || state.stage === "downloading";
  const percentLabel =
    state.percent === null ? null : `${Math.round(state.percent * 100)}%`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">ExpenShare {appVersion ? `v${appVersion}` : ''}</p>
        <p className="text-xs text-ink-muted">Offline shared household budget tracker.</p>
        <p className="text-xs font-medium text-moss mt-2">
          {state.stage === "checking"    && "Checking for updates..."}
          {state.stage === "current"     && "Up to date."}
          {state.stage === "failed"      && `Could not check. ${state.error}`}
          {state.stage === "available"   && `v${state.version} is available.`}
          {state.stage === "downloading" && `Downloading v${state.version}${percentLabel ? ` - ${percentLabel}` : "..."}`}
        </p>
        
        {state.stage === "downloading" && (
          <progress
            className="mt-2 w-full max-w-[200px]"
            value={state.percent ?? undefined}
            max={1}
            aria-label={`Downloading v${state.version}`}
          />
        )}
      </div>

      <div className="flex flex-col gap-2 self-start sm:self-auto">
        {state.stage === "available" && !confirming && (
          <button 
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-md bg-moss px-3.5 py-2 sm:py-1.5 text-sm text-white hover:opacity-90 active:opacity-70"
          >
            Install and restart
          </button>
        )}
        {!confirming && (
          <button 
            type="button"
            onClick={() => void check(true)} 
            disabled={busy}
            className="rounded-md border border-line px-3.5 py-2 sm:py-1.5 text-sm hover:bg-paper active:opacity-70 disabled:opacity-50"
          >
            {state.stage === "available" ? "Check again" : "Check for Updates"}
          </button>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-line bg-paper p-5 shadow-xl">
            <h3 className="mb-2 font-semibold">Install v{state.version}?</h3>
            <p className="mb-4 text-sm text-ink-muted">
              The app will close and reopen automatically.
              Finish any unsaved work first.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => { setConfirming(false); void install(); }}
                className="flex-1 rounded-md bg-moss py-2 text-sm text-white hover:opacity-90 active:opacity-70"
              >
                Install
              </button>
              <button 
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-md border border-line bg-paper py-2 text-sm hover:bg-paper/70 active:opacity-70"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
