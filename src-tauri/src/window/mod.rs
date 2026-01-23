use tauri::{AppHandle, Manager};

/// Open the settings window and hide the main window
#[tauri::command]
pub fn open_settings(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
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
