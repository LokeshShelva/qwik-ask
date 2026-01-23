use super::types::AppSettings;
use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_store::StoreExt;

pub struct SettingsManager {
    app: AppHandle,
}

impl SettingsManager {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }

    /// Load settings from store or return defaults
    pub fn load(&self) -> Result<AppSettings, String> {
        let store = self
            .app
            .store("settings.json")
            .map_err(|e| format!("Failed to access store: {}", e))?;

        // Try to get settings from store
        if let Some(settings_value) = store.get("settings") {
            serde_json::from_value(settings_value.clone())
                .map_err(|e| format!("Failed to deserialize settings: {}", e))
        } else {
            // Return defaults if not found
            Ok(AppSettings::default())
        }
    }

    /// Save settings to store
    pub fn save(&self, settings: &AppSettings) -> Result<(), String> {
        let store = self
            .app
            .store("settings.json")
            .map_err(|e| format!("Failed to access store: {}", e))?;

        let settings_value = serde_json::to_value(settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;

        store.set("settings", settings_value);

        store
            .save()
            .map_err(|e| format!("Failed to persist settings: {}", e))?;

        Ok(())
    }

    /// Apply settings to the running application
    pub fn apply(&self, settings: &AppSettings) -> Result<(), String> {
        // Apply auto startup
        self.apply_auto_startup(settings.general.auto_startup)?;

        // Apply shortcut changes
        self.apply_shortcut(&settings.shortcuts.toggle_launcher)?;

        Ok(())
    }

    /// Enable or disable auto startup
    fn apply_auto_startup(&self, enabled: bool) -> Result<(), String> {
        let autostart = self.app.autolaunch();

        // Check current status to avoid unnecessary operations
        let is_enabled = autostart.is_enabled().unwrap_or(false);

        if enabled && !is_enabled {
            autostart
                .enable()
                .map_err(|e| format!("Failed to enable autostart: {}", e))?;
        } else if !enabled && is_enabled {
            // Only disable if currently enabled (avoids error when entry doesn't exist)
            autostart
                .disable()
                .map_err(|e| format!("Failed to disable autostart: {}", e))?;
        }

        Ok(())
    }

    /// Apply shortcut changes (placeholder - will implement in shortcuts module)
    fn apply_shortcut(&self, _shortcut_str: &str) -> Result<(), String> {
        // TODO: Implement shortcut re-registration
        // For now, this will be handled in the shortcuts module
        Ok(())
    }

    /// Get current auto startup status
    pub fn get_auto_startup_status(&self) -> Result<bool, String> {
        let autostart = self.app.autolaunch();
        autostart
            .is_enabled()
            .map_err(|e| format!("Failed to check autostart status: {}", e))
    }
}
