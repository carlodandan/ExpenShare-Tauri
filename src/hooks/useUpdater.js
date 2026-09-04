import { useCallback, useEffect, useRef, useState } from "react";
import { checkForUpdate, installUpdate } from "../lib/updater.js";

const CHECKING = {
  stage: "checking",
  version: null,
  notes: null,
  percent: null,
  error: null,
};

export function useUpdater() {
  const [state, setState] = useState(CHECKING);
  const found = useRef(null);
  // Prevents setState after unmount
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; };
  }, []);

  const settle = useCallback((next) => {
    if (live.current) setState(next);
    return next;
  }, []);

  const check = useCallback(async (force = false) => {
    settle(CHECKING);
    try {
      const update = await checkForUpdate(force);
      found.current = update;
      return settle(
        update
          ? {
              stage: "available",
              version: update.version,
              notes: update.body?.trim() || null,
              percent: null,
              error: null,
            }
          : { ...CHECKING, stage: "current" },
      );
    } catch (error) {
      found.current = null;
      return settle({
        ...CHECKING,
        stage: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [settle]);

  // Run the check automatically on mount (free if startup check already ran)
  useEffect(() => { void check(); }, [check]);

  const install = useCallback(async () => {
    const update = found.current;
    // No update found or it expired — re-check rather than install stale data
    if (!update) return check(true);

    const version = update.version;
    const notes = update.body?.trim() || null;
    settle({ stage: "downloading", version, notes, percent: null, error: null });

    // Throttle renders: only re-render when the whole-percent value changes
    let announced = 0;
    try {
      await installUpdate(update, ({ received, total }) => {
        if (!total) return;
        const percent = Math.min(received / total, 1);
        const whole = Math.round(percent * 100);
        if (whole === announced) return;
        announced = whole;
        settle({ stage: "downloading", version, notes, percent, error: null });
      });
      return settle({ stage: "downloading", version, notes, percent: 1, error: null });
    } catch (error) {
      return settle({
        stage: "failed",
        version,
        notes,
        percent: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [check, settle]);

  return { state, check, install };
}
