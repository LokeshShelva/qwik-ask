//! Settings feature module.
//!
//! Provides persistent storage for application settings using `tauri-plugin-store`.
//! Settings are stored in `settings.json` in the app data directory.
//!
//! # Architecture
//!
//! - [`types`] - Data structures (`AppSettings`, `Theme`, `LlmProvider`) and defaults
//! - [`manager`] - `SettingsManager` for load/save/apply operations
//! - This file - Tauri commands exposed to the frontend
//!
//! # Frontend Integration
//!
//! The frontend uses these commands via Tauri's invoke API:
//!
//! ```typescript
//! // Load settings
//! const settings = await invoke<AppSettings>('get_settings');
//!
//! // Update settings
//! await invoke('update_settings', { settings: newSettings });
//! ```

mod manager;
mod types;

use std::env;

pub use manager::SettingsManager;
pub use types::AppSettings;

use tauri::{AppHandle, Manager, State};
use tauri_plugin_opener::OpenerExt;

// ============================================================================
// Tauri Commands
// ============================================================================

/// Get the current application settings.
///
/// Loads settings from disk. Returns defaults if no settings file exists.
///
/// # Returns
///
/// * `Ok(AppSettings)` - The current settings
/// * `Err(String)` - Error message if loading fails
///
/// # Example (Frontend)
///
/// ```typescript
/// const settings = await invoke<AppSettings>('get_settings');
/// console.log(settings.general.theme); // 'dark' | 'light' | 'system'
/// ```
#[tauri::command]
pub fn get_settings(settings_manager: State<SettingsManager>) -> Result<AppSettings, String> {
    settings_manager.load()
}

/// Update application settings.
///
/// Saves settings to disk and applies them immediately:
/// - Updates auto-startup registry entry
/// - Re-registers global shortcut if changed
///
/// # Arguments
///
/// * `settings` - Complete settings object (not a partial update)
///
/// # Returns
///
/// * `Ok(())` - Settings saved and applied
/// * `Err(String)` - Error message if save or apply fails
///
/// # Example (Frontend)
///
/// ```typescript
/// const updated = { ...currentSettings, general: { ...general, theme: 'dark' } };
/// await invoke('update_settings', { settings: updated });
/// ```
#[tauri::command]
pub fn update_settings(
    settings_manager: State<SettingsManager>,
    settings: AppSettings,
) -> Result<(), String> {
    settings_manager.save(&settings)?;
    settings_manager.apply(&settings)?;
    Ok(())
}

/// Reset all settings to defaults.
///
/// Overwrites existing settings with default values and applies them.
///
/// # Returns
///
/// * `Ok(AppSettings)` - The default settings (for UI update)
/// * `Err(String)` - Error message if reset fails
#[tauri::command]
pub fn reset_settings(settings_manager: State<SettingsManager>) -> Result<AppSettings, String> {
    let default_settings = AppSettings::default();
    settings_manager.save(&default_settings)?;
    settings_manager.apply(&default_settings)?;
    Ok(default_settings)
}

/// Check if the application is configured to start at system login.
///
/// Queries the OS directly (not the settings file), so it reflects
/// the actual system state even if manually changed.
///
/// # Returns
///
/// * `Ok(bool)` - `true` if auto-startup is enabled
/// * `Err(String)` - Error message if status check fails
#[tauri::command]
pub fn get_auto_startup_status(settings_manager: State<SettingsManager>) -> Result<bool, String> {
    settings_manager.get_auto_startup_status()
}

/// Open the settings JSON file in the default system editor.
///
/// Useful for advanced users who want to manually edit settings.
/// The file is located at `{app_data_dir}/settings.json`.
///
/// # Returns
///
/// * `Ok(())` - File opened successfully
/// * `Err(String)` - Error if file path resolution or opening fails
#[tauri::command]
pub async fn open_settings_file(app: AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let settings_path = app_data_dir.join("settings.json");
    let path_str = settings_path.to_string_lossy().to_string();

    app.opener()
        .open_path(path_str, None::<&str>)
        .map_err(|e| format!("Failed to open settings file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_environment_variable(env_name: String) -> Result<Option<String>, String> {
    match env::var(env_name) {
        Ok(value) => Ok(Some(value)),
        Err(env::VarError::NotPresent) => Ok(None),
        Err(e) =>Err(format!("Unable to read env: {}", e))
    }
}