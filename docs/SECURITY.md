# Security Documentation

## Overview
ExpenShare is designed with a privacy-first, offline-centric approach. Because it deals with personal financial data, minimizing the attack surface and ensuring data stays strictly on the user's device are the top priorities.

## Data Privacy & Offline Design
- **No External Servers:** The application does not communicate with any external backend, telemetry service, or analytics provider.
- **Local Storage:** All financial records are stored in a local SQLite database (`budget-tracker.db`) located securely within the operating system's designated AppData directory.
- **Updates via GitHub:** The only external network request made by the application is to `api.github.com` (or `githubusercontent.com`) to check for and download application updates via the Tauri updater plugin.

## Tauri Security Configurations

### 1. Capabilities System (Tauri v2)
ExpenShare utilizes Tauri's fine-grained capabilities system to restrict what the frontend webview can access:
- **`default.json`**: Grants access only to specific file system scopes (for database/backup operations) and dialogs (for file selection).
- **`desktop.json` & `mobile.json`**: Platform-specific capability gates prevent the frontend from calling desktop APIs (like process relaunch or auto-updating) when running on mobile.

### 2. Content Security Policy (CSP)
The `tauri.conf.json` enforces a strict CSP:
```text
default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: data:; connect-src 'self' ipc: http://ipc.localhost
```
- Disallows loading external scripts or iframes.
- Only allows local assets and Tauri's IPC protocol.

### 3. IPC Strict Typing
All communication between the React frontend and the Rust backend occurs over Tauri's Inter-Process Communication (IPC). The Rust command handlers act as an API gateway, strongly typing inputs and guarding against malformed payloads or SQL injection (by using parameterized queries via `rusqlite`).

## Auto-Updater Security
The application uses Tauri's secure updater mechanism:
- **Minisign Signatures:** Every release bundle (`.msi.zip` or AppImage) is signed using a private minisign key during the CI build process.
- **Signature Verification:** The running application contains the public key (`pubkey` in `tauri.conf.json`). The updater plugin verifies the cryptographic signature of the downloaded update artifact *before* attempting to execute or install it.

## File System Restrictions
The `fs` plugin is heavily scoped. ExpenShare only requests read/write access to the application data directory and specific files explicitly selected by the user via the OS-native file dialog (for exporting reports or backups).
