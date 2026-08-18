mod commands;
mod db;
mod money;

use db::DbState;
use std::sync::Mutex;
use tauri::Manager;

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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
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
