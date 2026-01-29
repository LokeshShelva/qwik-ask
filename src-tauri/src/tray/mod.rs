//! System tray module.
//!
//! Sets up the system tray icon with a context menu and click handlers.
//! The tray provides quick access to settings, update checking, and quit functionality.
//!
//! # Behavior
//!
//! - **Left click**: Opens the settings window
//! - **Right click**: Shows context menu with "Open Settings", "Check for Updates", and "Quit"

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{App, Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;

/// Setup the system tray with menu and event handlers.
///
/// Creates a tray icon with:
/// - App icon
/// - Context menu (Settings, Check for Updates, Quit)
/// - Left-click handler to open settings
///
/// # Arguments
///
/// * `app` - The Tauri App instance (during setup phase)
///
/// # Returns
///
/// * `Ok(())` - Tray setup successful
/// * `Err(Box<dyn Error>)` - Failed to create tray or menu
///
/// # Example
///
/// ```rust,ignore
/// // In lib.rs setup
/// .setup(|app| {
///     tray::setup(app)?;
///     Ok(())
/// })
/// ```
pub fn setup(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let settings_item = MenuItem::with_id(app, "settings", "Open Settings", true, None::<&str>)?;
    let update_item =
        MenuItem::with_id(app, "check_updates", "Check for Updates", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&settings_item, &update_item, &quit_item])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Qwik Ask")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "settings" => {
                open_settings_window(app);
            }
            "check_updates" => {
                check_for_updates_from_tray(app.clone());
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Left click opens settings
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                open_settings_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

/// Open the settings window and hide the main launcher.
///
/// Helper function shared between menu click and tray icon click handlers.
///
/// # Arguments
///
/// * `app` - The Tauri AppHandle
fn open_settings_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        // Hide main window when opening settings
        if let Some(main_window) = app.get_webview_window("main") {
            let _ = main_window.hide();
        }
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Check for updates when triggered from the tray menu.
///
/// Spawns an async task to check for updates and emits events with the result.
/// Opens the settings window to show the update UI.
///
/// # Arguments
///
/// * `app` - The Tauri AppHandle
fn check_for_updates_from_tray(app: tauri::AppHandle) {
    // Open settings window to show update progress
    open_settings_window(&app);

    // Spawn async update check
    tauri::async_runtime::spawn(async move {
        match app.updater() {
            Ok(updater) => match updater.check().await {
                Ok(Some(update)) => {
                    let _ = app.emit(
                        "update-available",
                        serde_json::json!({
                            "version": update.version,
                            "body": update.body,
                        }),
                    );
                }
                Ok(None) => {
                    let _ = app.emit("update-not-available", ());
                }
                Err(e) => {
                    let _ = app.emit("update-error", e.to_string());
                }
            },
            Err(e) => {
                let _ = app.emit("update-error", e.to_string());
            }
        }
    });
}
