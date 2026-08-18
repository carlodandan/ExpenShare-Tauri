# ExpenShare: Electron → Tauri 2.0 migration

This is a from-scratch Tauri 2.0 port of the electron-forge app. The UI
(`src/`) is byte-for-byte the same React app you had, plus one small glue
file (`src/lib/api.js`) that makes `window.electronAPI.*` work
against Tauri commands instead of Electron IPC - so every component, page,
and hook needed **zero changes**. The only other UI-level addition is
`UpdateReadyModal.jsx` (see "Auto-update" below) - everything else looks
and behaves exactly as before.

## ⚠️ Read this first

This was written in a sandbox with **no Rust toolchain and no network
access to crates.io**, so none of the Rust code has been compiled. I ported
every SQL query, validation rule, and business-logic function 1:1 from your
JS (`src/main/database/*.js`, `src/main/ipc/*.js`, `src/main/reports.js`)
into `src-tauri/src/`, and reasoned through the Rust carefully, but treat
your **first `cargo build` / `npm run tauri dev` as a real verification
pass**, not a formality. Most likely spots for a compile error on first try:

- **`src-tauri/src/commands/reports.rs`** (PDF export) - this uses the
  `printpdf` crate's drawing API from memory. The line-layout math
  (`PdfCursor`) is hand-rolled to approximate pdfkit's auto-flow text
  layout, since printpdf is a lower-level drawing API, not a text-flow
  engine. Expect to spend the most tuning time here to get vertical
  spacing pixel-close to the original PDF.
- **`src-tauri/src/commands/backup.rs`** - uses
  `tauri_plugin_dialog::FilePath::into_path()`; if that method name has
  drifted in the plugin version cargo resolves, swap in whatever the
  current dialog plugin exposes for turning a picked path into a
  `PathBuf`.
- Exact plugin crate versions in `Cargo.toml` are pinned to `"2"` (latest
  2.x) - cargo will resolve current versions, so some plugin method
  signatures may have moved since my training data.

Everything else (schema, migrations, all money/date math, the Extra Budget
balance algorithm, CSV export) is a direct, careful line-by-line port and
should behave identically to the original.

## What changed, file by file

| Electron | Tauri | Notes |
|---|---|---|
| `src/main/main.js` | `src-tauri/src/lib.rs` | Window creation, plugin registration, single-instance |
| `src/main/database/database.js` | `src-tauri/src/db.rs` | `node:sqlite` → `rusqlite` (bundled, no system SQLite needed) |
| `src/main/database/migrations.js` | `src-tauri/src/db.rs` | Same versioned migration runner, same SQL |
| `src/main/database/{income,expenses,extraBudget,dashboard,settings,people,money}.js` | `src-tauri/src/commands/*.rs` | Same queries, same validation, same rounding rules |
| `src/main/ipc/*.ipc.js` | `#[tauri::command]` fns in `src-tauri/src/commands/*.rs` | 1:1 command-per-handler |
| `src/main/reports.js` (pdfkit) | `src-tauri/src/commands/reports.rs` (printpdf) | CSV is a direct port; PDF is re-implemented (see caveat above) |
| `src/preload/preload.js` | `src/lib/api.js` | Same `window.tauriAPI` shape, backed by `invoke()` |
| `update-electron-app` + Squirrel | `tauri-plugin-updater` + `tauri-plugin-process` | See "Auto-update" below |
| `electron-log` | `tauri-plugin-log` | |
| `forge.config.js` (Squirrel maker) | `src-tauri/tauri.conf.json` (`nsis`/`msi` bundle targets) | |
| `.github/workflows/release.yml` | Same file, now uses `tauri-apps/tauri-action` | |

## Auto-update: what's different and why

Electron's `update-electron-app` silently downloads updates in the
background via Squirrel and pops a **separate native window** once ready.
Tauri's updater has no equivalent "silent background download + second OS
window" primitive - checking and downloading happen from inside the
webview via `@tauri-apps/plugin-updater`. `UpdateReadyModal.jsx` reproduces
the exact same copy, colors, and Later/Restart buttons as an **in-app
overlay** instead of a second window - visually and behaviorally as close
as Tauri allows.

To make this work you must:

1. Generate a signing keypair (one time):
   ```bash
   npm run tauri signer generate -- -w ~/.tauri/expenshare.key
   ```
   This prints a public key - paste it into
   `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`, replacing
   `REPLACE_WITH_YOUR_GENERATED_PUBLIC_KEY`.
2. Add two GitHub Actions secrets: `TAURI_SIGNING_PRIVATE_KEY` (the
   contents of the generated private key file) and
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
3. Keep publishing releases the same way (`.github/workflows/release.yml`,
   triggered on `package.json` changes on `main`) - `tauri-action` builds
   the installers **and** uploads the `latest.json` manifest that
   `tauri.conf.json`'s `updater.endpoints` points at.

If you'd rather not deal with signing/hosting a manifest right now, set
`plugins.updater.active` to `false` in `tauri.conf.json` and drop
`<UpdateReadyModal />` from `src/App.jsx` - the rest of the app is
unaffected either way.

## Building locally

```bash
# 1. Install the Rust toolchain (if you don't have it): https://rustup.rs
# 2. Install frontend deps
pnpm install   # or npm install

# 3. Dev mode (hot-reloads the React UI, rebuilds Rust on change)
npm run tauri dev

# 4. Production build (NSIS + MSI installers under src-tauri/target/release/bundle/)
npm run tauri build
```

Regenerate a full-resolution icon set from your source PNG (the ones I
seeded in `src-tauri/icons/` are just copies of your existing 78KB PNG/ICO,
not properly downsized):

```bash
npm run tauri icon icons/expenshare.png
```

## Size/efficiency, for context

This is the whole point of the migration: no bundled Chromium/Node runtime
- the installer uses the OS's native WebView2 (already on modern Windows),
so the shipped app is typically 5-15MB instead of Electron's 80-120MB+,
with a smaller memory footprint at runtime too.
