import { useEffect } from "react";
import { checkForUpdate } from "../lib/updater.js";

/** One announcement per process even when StrictMode mounts twice in dev. */
let announced = false;

/** Delay (ms) before the first background check. */
const DELAY = 4000;

export function UpdateWatcher({ onAvailable }) {
  useEffect(() => {
    if (announced) return;

    const timer = window.setTimeout(() => {
      void checkForUpdate()
        .then((update) => {
          if (!update || announced) return;
          announced = true;
          onAvailable(update.version);
        })
        .catch(() => {}); // silent on error — user did not ask
    }, DELAY);

    return () => window.clearTimeout(timer);
  }, [onAvailable]);

  return null;
}
