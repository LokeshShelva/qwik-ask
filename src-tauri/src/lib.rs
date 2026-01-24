//! Qwik Ask - A quick launcher for AI conversations
//!
//! This is the main Tauri application library that sets up:
//! - Plugin initialization (autostart, store, global shortcuts, SQL)
//! - Window management for main launcher and settings
//! - System tray integration
//! - Settings persistence and application
//!
//! # Architecture
//!
//! The application consists of two windows:
//! - **Main window**: A spotlight-style launcher that appears on global shortcut
//! - **Settings window**: A configuration panel for API keys, shortcuts, and preferences
//!
//! # Modules
//!
//! - [`settings`] - Settings management (types, persistence, Tauri commands)
//! - [`shortcuts`] - Global shortcut parsing utilities
//! - [`tray`] - System tray setup and event handling
//! - [`window`] - Window management commands
//! - [`migrations`] - SQLite database migrations for chat history

use tauri::Manager;

mod migrations;
mod settings;
mod shortcuts;
mod tray;
mod window;

use settings::SettingsManager;

/// Main application entry point.
///
/// Initializes all Tauri plugins and sets up the application:
///
/// 1. **Plugins**: autostart, store, global shortcuts, opener, SQL
/// 2. **Setup**: Settings loading, shortcut registration, tray creation
/// 3. **Commands**: Registers all Tauri commands for frontend communication
///
/// # Panics
///
/// Panics if the Tauri application fails to start (e.g., missing configuration).
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
            let settings_manager = SettingsManager::new(app.handle().clone());
            initialize_settings(&settings_manager);
            app.manage(settings_manager);

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

/// Initialize settings on application startup.
///
/// Loads settings from disk and applies them:
/// - Registers the global shortcut for toggling the launcher
/// - Applies auto-startup configuration
///
/// Falls back to default shortcut (`Alt+Shift+Space`) if:
/// - Settings file doesn't exist
/// - Settings file is corrupted
/// - Configured shortcut is invalid or already in use
///
/// # Arguments
///
/// * `settings_manager` - The settings manager instance to use
fn initialize_settings(settings_manager: &SettingsManager) {
    match settings_manager.load() {
        Ok(settings) => {
            if let Err(e) =
                settings_manager.register_initial_shortcut(&settings.shortcuts.toggle_launcher)
            {
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
