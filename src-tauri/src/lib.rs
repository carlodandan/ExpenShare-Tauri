mod commands;
mod db;
mod money;

use db::DbState;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_updater::UpdaterExt;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::time::{sleep, Duration}; // Add this import

static UPDATE_DECLINED: AtomicBool = AtomicBool::new(false);

async fn check_for_updates(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    log::info!("Checking for app updates via GitHub releases...");
    
    if UPDATE_DECLINED.load(Ordering::SeqCst) {
        log::info!("Update was previously declined in this session, skipping dialog");
        return Ok(());
    }
    
    if let Some(update) = app.updater()?.check().await? {
        log::info!("Found update to version {}", update.version);
        
        // Show dialog to user
        let app_clone = app.clone();
        let update_clone = update.clone();
        
        tauri::async_runtime::spawn(async move {
            // Wait 10 seconds before showing the dialog
            log::info!("Waiting 10 seconds before showing update dialog...");
            sleep(Duration::from_secs(10)).await;
            log::info!("Showing update dialog now");
            
            let dialog_result = app_clone.dialog()
                .message(format!("A new version ({}) is available! Do you want to update now?", update_clone.version))
                .title("Update Available")
                .kind(tauri_plugin_dialog::MessageDialogKind::Info)
                .buttons(tauri_plugin_dialog::MessageDialogButtons::OkCancelCustom(
                    "Update".to_string(), 
                    "Cancel".to_string()
                ))
                .blocking_show();
            
            // For OkCancelCustom, true = Ok (Update), false = Cancel
            if dialog_result {
                log::info!("User chose to update to version {}", update_clone.version);
                let mut downloaded = 0;
                if let Err(e) = update_clone
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
                {
                    log::error!("Failed to download and install update: {}", e);
                    let _ = app_clone.dialog()
                        .message(format!("Failed to update: {}", e))
                        .title("Update Error")
                        .kind(tauri_plugin_dialog::MessageDialogKind::Error)
                        .blocking_show();
                    return;
                }
                
                log::info!("Update installed, restarting application...");
                let _ = app_clone.dialog()
                    .message("Update installed successfully! The app will now restart.")
                    .title("Update Complete")
                    .kind(tauri_plugin_dialog::MessageDialogKind::Info)
                    .blocking_show();
                
                app_clone.restart();
            } else {
                log::info!("User declined the update");
                UPDATE_DECLINED.store(true, Ordering::SeqCst);
                
                let _ = app_clone.dialog()
                    .message("Update declined. You can check for updates manually later.")
                    .title("Update Declined")
                    .kind(tauri_plugin_dialog::MessageDialogKind::Info)
                    .blocking_show();
            }
        });
    } else {
        log::info!("No update found, app is on latest version.");
    }
    Ok(())
}

#[tauri::command]
async fn check_for_updates_now(app: tauri::AppHandle) -> Result<bool, String> {
    log::info!("Manual update check initiated from UI...");
    
    UPDATE_DECLINED.store(false, Ordering::SeqCst);
    
    let updater = app.updater().map_err(|e| e.to_string())?;
    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        log::info!("Found update to version {}", update.version);
        
        let app_clone = app.clone();
        let update_clone = update.clone();
        
        tauri::async_runtime::spawn(async move {
            // Wait 10 seconds before showing the dialog
            log::info!("Waiting 10 seconds before showing update dialog...");
            sleep(Duration::from_secs(10)).await;
            log::info!("Showing update dialog now");
            
            let dialog_result = app_clone.dialog()
                .message(format!("A new version ({}) is available! Do you want to update now?", update_clone.version))
                .title("Update Available")
                .kind(tauri_plugin_dialog::MessageDialogKind::Info)
                .buttons(tauri_plugin_dialog::MessageDialogButtons::OkCancelCustom(
                    "Update".to_string(), 
                    "Cancel".to_string()
                ))
                .blocking_show();
            
            if dialog_result {
                log::info!("User chose to update to version {}", update_clone.version);
                let mut downloaded = 0;
                if let Err(e) = update_clone
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
                {
                    log::error!("Failed to download and install update: {}", e);
                    let _ = app_clone.dialog()
                        .message(format!("Failed to update: {}", e))
                        .title("Update Error")
                        .kind(tauri_plugin_dialog::MessageDialogKind::Error)
                        .blocking_show();
                    return;
                }
                
                log::info!("Update installed, restarting application...");
                let _ = app_clone.dialog()
                    .message("Update installed successfully! The app will now restart.")
                    .title("Update Complete")
                    .kind(tauri_plugin_dialog::MessageDialogKind::Info)
                    .blocking_show();
                
                app_clone.restart();
            } else {
                log::info!("User declined the update");
                UPDATE_DECLINED.store(true, Ordering::SeqCst);
                
                let _ = app_clone.dialog()
                    .message("Update declined. You can check for updates manually later.")
                    .title("Update Declined")
                    .kind(tauri_plugin_dialog::MessageDialogKind::Info)
                    .blocking_show();
            }
        });
        
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