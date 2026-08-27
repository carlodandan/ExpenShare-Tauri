use crate::db::{db_path, open_and_migrate, DbState};
use crate::file_utils;
use serde_json::{json, Value};
use std::fs;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn backup_export(
    app: AppHandle,
    state: State<'_, DbState>,
) -> Result<Value, String> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let default_name = format!("budget-tracker-backup-{}.db", today);

    let picked = app
        .dialog()
        .file()
        .set_title("Backup ExpenShare Data")
        .set_file_name(&default_name)
        .add_filter("ExpenShare Backup", &["db"])
        .blocking_save_file();

    let Some(picked) = picked else {
        return Ok(json!({ "canceled": true }));
    };

    let source = db_path(&app);

    // Ensure the source DB exists; if not, create an empty one.
    if !source.exists() {
        // Open and immediately close to create the file.
        let _ = open_and_migrate(&app);
        // The connection is now held by state; we'll replace it later.
    }

    // Safely export: checkpoint, close, read bytes, reopen.
    let db_bytes = {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;

        // 1. Flush the WAL to the main database file.
        guard
            .execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(|e| e.to_string())?;

        // 2. Replace the current connection with an in‑memory one,
        //    dropping the old connection and releasing its file handle.
        let placeholder = rusqlite::Connection::open_in_memory().map_err(|e| e.to_string())?;
        let old = std::mem::replace(&mut *guard, placeholder);
        drop(old);

        // 3. Read the database file contents while it's not held open.
        let bytes = fs::read(&source).map_err(|e| e.to_string())?;

        // 4. Reopen the original database (migrations will run automatically).
        let reopened = open_and_migrate(&app);
        *guard = reopened;

        bytes
    };

    // 5. Write to the picked target (supports desktop paths and Android content:// URIs).
    let file_path = file_utils::write_file_path(&app, &picked, &db_bytes)?;

    Ok(json!({ "canceled": false, "filePath": file_path }))
}

#[tauri::command]
pub async fn backup_restore(
    app: AppHandle,
    state: State<'_, DbState>,
) -> Result<Value, String> {
    let picked = app
        .dialog()
        .file()
        .set_title("Restore ExpenShare Data")
        .add_filter("ExpenShare Backup", &["db"])
        .blocking_pick_file();

    let Some(picked) = picked else {
        return Ok(json!({ "canceled": true }));
    };

    // Read the backup bytes (supports desktop paths and Android content:// URIs).
    let backup_bytes = file_utils::read_file_path(&app, &picked)?;
    if backup_bytes.is_empty() {
        return Err("Selected backup file is empty or corrupted.".to_string());
    }

    let target = db_path(&app);

    // Release the connection, overwrite DB file, then reopen.
    {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        let placeholder = rusqlite::Connection::open_in_memory().map_err(|e| e.to_string())?;
        let old = std::mem::replace(&mut *guard, placeholder);
        drop(old);

        fs::write(&target, &backup_bytes).map_err(|e| e.to_string())?;

        let reopened = open_and_migrate(&app);
        *guard = reopened;
    }

    Ok(json!({ "canceled": false, "restarted": true }))
}