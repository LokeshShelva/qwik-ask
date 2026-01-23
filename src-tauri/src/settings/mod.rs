//! Settings feature module
//! 
//! Contains settings types, manager, and Tauri commands - all in one place.

mod manager;
mod types;

pub use manager::SettingsManager;
pub use types::{AppSettings};

use tauri::{AppHandle, Manager, State};
use tauri_plugin_opener::OpenerExt;

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
pub fn get_settings(settings_manager: State<SettingsManager>) -> Result<AppSettings, String> {
    settings_manager.load()
}

#[tauri::command]
pub fn update_settings(
    settings_manager: State<SettingsManager>,
    settings: AppSettings,
) -> Result<(), String> {
    settings_manager.save(&settings)?;
    settings_manager.apply(&settings)?;
    Ok(())
}

#[tauri::command]
pub fn reset_settings(settings_manager: State<SettingsManager>) -> Result<AppSettings, String> {
    let default_settings = AppSettings::default();
    settings_manager.save(&default_settings)?;
    settings_manager.apply(&default_settings)?;
    Ok(default_settings)
}

#[tauri::command]
pub fn get_auto_startup_status(
    settings_manager: State<SettingsManager>,
) -> Result<bool, String> {
    settings_manager.get_auto_startup_status()
}

#[tauri::command]
pub async fn open_settings_file(app: AppHandle) -> Result<(), String> {
    let app_data_dir = app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let settings_path = app_data_dir.join("settings.json");
    let path_str = settings_path.to_string_lossy().to_string();
    
    app.opener()
        .open_path(path_str, None::<&str>)
        .map_err(|e| format!("Failed to open settings file: {}", e))?;
    
    Ok(())
}
