mod commands;
mod db;
mod money;

use db::DbState;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

async fn check_for_updates(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    log::info!("Checking for app updates via GitHub releases...");
    if let Some(update) = app.updater()?.check().await? {
        log::info!("Found update to version {}", update.version);
        let mut downloaded = 0;
        update
            .download_and_install(
                move |chunk_length, content_length| {
                    downloaded += chunk_length;
                    log::info!("downloaded {} of {:?}", downloaded, content_length);
                },
                || {
                    log::info!("download finished");
                },
            )
            .await?;

        log::info!("Update installed, restarting application...");
        app.restart();
    } else {
        log::info!("No update found, app is on latest version.");
    }
    Ok(())
}

#[tauri::command]
async fn check_for_updates_now(app: tauri::AppHandle) -> Result<bool, String> {
    log::info!("Manual update check initiated from UI...");
    let updater = app.updater().map_err(|e| e.to_string())?;
    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        log::info!("Found update to version {}", update.version);
        let mut downloaded = 0;
        update
            .download_and_install(
                move |chunk_length, content_length| {
                    downloaded += chunk_length;
                    log::info!("downloaded {} of {:?}", downloaded, content_length);
                },
                || {
                    log::info!("download finished");
                },
            )
            .await
            .map_err(|e| e.to_string())?;

        log::info!("Update installed, restarting application...");
        app.restart();
        Ok(true)
    } else {
        log::info!("No update found, app is on latest version.");
        Ok(false)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        // Mirrors electron-squirrel-startup's single-instance-on-Windows
        // behavior (relevant mainly for the Squirrel install/update flow;
        // kept here as a general "don't allow two copies open at once"
        // safeguard).
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            // Opens (or creates) the SQLite DB in the app's data directory,
            // runs migrations, and seeds defaults on first launch - same
            // "safe to call once at startup" contract as the original
            // getDatabase() in database.js.
            let conn = db::open_and_migrate(&app.handle());
            app.manage(DbState(Mutex::new(conn)));
            log::info!("ExpenShare v{} started successfully", app.package_info().version);

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = check_for_updates(handle).await {
                    log::error!("Failed to check for updates: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_for_updates_now,
            commands::income::income_list_for_month,
            commands::income::income_create,
            commands::income::income_update,
            commands::income::income_delete,
            commands::expenses::expenses_list_categories,
            commands::expenses::expenses_list_for_month,
            commands::expenses::expenses_create,
            commands::expenses::expenses_set_fixed_for_month,
            commands::expenses::expenses_update,
            commands::expenses::expenses_delete,
            commands::dashboard::dashboard_get_monthly,
            commands::dashboard::dashboard_get_total,
            commands::extra_budget::extra_budget_get_history,
            commands::extra_budget::extra_budget_list_withdrawals,
            commands::extra_budget::extra_budget_withdraw,
            commands::extra_budget::extra_budget_delete_withdrawal,
            commands::extra_budget::extra_budget_withdraw_and_expense,
            commands::settings::settings_get_all,
            commands::settings::settings_set,
            commands::settings::settings_rename_person,
            commands::settings::settings_get_version,
            commands::settings::get_app_info,
            commands::reports::reports_export,
            commands::backup::backup_export,
            commands::backup::backup_restore,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ExpenShare");
}
