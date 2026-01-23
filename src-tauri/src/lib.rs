use tauri::Manager;

mod commands;
mod settings;
mod shortcuts;

use commands::{settings as settings_commands, window as window_commands};
use settings::SettingsManager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, _shortcut, event| {
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
        .setup(move |app| {
            // Initialize settings manager
            let settings_manager = SettingsManager::new(app.handle().clone());

            // Load settings and register the shortcut from settings.json
            match settings_manager.load() {
                Ok(settings) => {
                    // Register the shortcut from settings
                    if let Err(e) = settings_manager.register_initial_shortcut(&settings.shortcuts.toggle_launcher) {
                        eprintln!("Failed to register shortcut from settings: {}. Using default.", e);
                        // Fallback to default shortcut
                        let default_shortcut = "Alt+Shift+Space";
                        if let Err(e2) = settings_manager.register_initial_shortcut(default_shortcut) {
                            eprintln!("Failed to register default shortcut: {}", e2);
                        }
                    }
                    
                    // Apply other settings (auto startup, etc.)
                    let _ = settings_manager.apply_auto_startup_only(&settings);
                }
                Err(e) => {
                    eprintln!("Failed to load settings: {}. Using defaults.", e);
                    // Register default shortcut
                    let default_shortcut = "Alt+Shift+Space";
                    if let Err(e2) = settings_manager.register_initial_shortcut(default_shortcut) {
                        eprintln!("Failed to register default shortcut: {}", e2);
                    }
                }
            }

            // Store settings manager in app state
            app.manage(settings_manager);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            window_commands::open_settings,
            settings_commands::get_settings,
            settings_commands::update_settings,
            settings_commands::reset_settings,
            settings_commands::get_auto_startup_status,
            settings_commands::open_settings_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
