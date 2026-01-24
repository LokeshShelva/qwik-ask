//! Window management module.
//!
//! Provides Tauri commands for window operations invoked from the frontend.

use tauri::{AppHandle, Manager};

/// Open the settings window and hide the main launcher.
///
/// Called from the frontend when user clicks the settings button
/// or presses the settings keyboard shortcut.
///
/// # Arguments
///
/// * `app` - Tauri AppHandle for window access
///
/// # Returns
///
/// * `Ok(())` - Settings window opened (and focused)
/// * `Err(String)` - Settings window not found in configuration
///
/// # Frontend Usage
///
/// ```typescript
/// import { invoke } from '@tauri-apps/api/core';
///
/// async function openSettings() {
///   await invoke('open_settings');
/// }
/// ```
#[tauri::command]
pub fn open_settings(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        // Hide main window when opening settings
        if let Some(main_window) = app.get_webview_window("main") {
            let _ = main_window.hide();
        }
        let _ = window.show();
        let _ = window.set_focus();
        Ok(())
    } else {
        Err("Settings window not found".to_string())
    }
}
