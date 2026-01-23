//! Qwik Ask - A quick launcher for AI conversations
//!
//! This is the main entry point for the Tauri application.

use tauri::Manager;

mod migrations;
mod settings;
mod shortcuts;
mod tray;
mod window;

use settings::SettingsManager;

/// Main application entry point
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            if is_visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:history.db", migrations::get_migrations())
                .build(),
        )
        .setup(|app| {
            // Initialize and configure settings
            let settings_manager = SettingsManager::new(app.handle().clone());
            initialize_settings(&settings_manager);
            app.manage(settings_manager);

            // Setup system tray
            tray::setup(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            window::open_settings,
            settings::get_settings,
            settings::update_settings,
            settings::reset_settings,
            settings::get_auto_startup_status,
            settings::open_settings_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Initialize settings: load from disk and apply shortcuts/autostart
fn initialize_settings(settings_manager: &SettingsManager) {
    match settings_manager.load() {
        Ok(settings) => {
            if let Err(e) = settings_manager.register_initial_shortcut(&settings.shortcuts.toggle_launcher) {
                eprintln!("Failed to register shortcut: {}. Using default.", e);
                let _ = settings_manager.register_initial_shortcut("Alt+Shift+Space");
            }
            let _ = settings_manager.apply_auto_startup_only(&settings);
        }
        Err(e) => {
            eprintln!("Failed to load settings: {}. Using defaults.", e);
            let _ = settings_manager.register_initial_shortcut("Alt+Shift+Space");
        }
    }
}
