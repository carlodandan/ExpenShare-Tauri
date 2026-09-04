import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/**
 * One shared promise. The startup check and Settings panel both call this.
 * A second call within the same session reuses the first result for free.
 * Failures are NOT cached — a retry always goes back to the network.
 */
let pending = null;

export function checkForUpdate(force = false) {
  if (force) pending = null;
  pending ??= check().catch((error) => {
    pending = null; // do not cache failures
    throw error;
  });
  return pending;
}

/**
 * Downloads and installs. Reports progress via callback.
 *
 * On Windows the MSI installer replaces the running process, so the app is
 * killed before downloadAndInstall() resolves — treat everything after it as
 * unreachable on Windows. relaunch() is still called for macOS / Linux.
 */
export async function installUpdate(update, onProgress) {
  let received = 0;
  let total = null;

  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      total = event.data.contentLength ?? null;
    } else if (event.event === "Progress") {
      received += event.data.chunkLength;
    }
    onProgress({ received, total });
  });

  // Reached on macOS / Linux. On Windows the process is already gone.
  await relaunch();
}
