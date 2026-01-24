//! System tray module.
//!
//! Sets up the system tray icon with a context menu and click handlers.
//! The tray provides quick access to settings and quit functionality.
//!
//! # Behavior
//!
//! - **Left click**: Opens the settings window
//! - **Right click**: Shows context menu with "Open Settings" and "Quit"

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{App, Manager};

/// Setup the system tray with menu and event handlers.
///
/// Creates a tray icon with:
/// - App icon
/// - Context menu (Settings, Quit)
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
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&settings_item, &quit_item])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Qwik Ask")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "settings" => {
                open_settings_window(app);
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
