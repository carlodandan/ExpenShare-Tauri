mod commands;
mod db;
mod file_utils;
mod money;

use db::DbState;
use std::sync::Mutex;
use tauri::Manager;
#[cfg(not(target_os = "android"))]
use tauri_plugin_dialog::DialogExt;




#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // Desktop-only plugins — not available on Android/iOS
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let conn = db::open_and_migrate(&app.handle());
            app.manage(DbState(Mutex::new(conn)));
            log::info!("ExpenShare v{} started successfully", app.package_info().version);



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
            commands::goals::goals_list,
            commands::goals::goals_create,
            commands::goals::goals_update,
            commands::goals::goals_delete,
            commands::goals::goals_add_funds,
            commands::goals::goals_list_contributions,
            commands::goals::goals_delete_contribution,
            commands::settings::settings_get_all,
            commands::settings::settings_set,
            commands::settings::settings_rename_person,
            commands::settings::settings_add_person,
            commands::settings::settings_delete_person,
            commands::settings::settings_get_version,
            commands::settings::get_app_info,
            commands::reports::reports_export,
            commands::backup::backup_export,
            commands::backup::backup_restore,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ExpenShare");
}