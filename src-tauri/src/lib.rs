use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

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
    // Define the shortcut: Alt+Space (common for launchers)
    let shortcut = Shortcut::new(Some(Modifiers::ALT | Modifiers::SHIFT), Code::Space);

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
            // Register global shortcut
            let _ = app.global_shortcut().register(shortcut);

            // Initialize settings manager
            let settings_manager = SettingsManager::new(app.handle().clone());

            // Load and apply settings
            if let Ok(settings) = settings_manager.load() {
                let _ = settings_manager.apply(&settings);
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
