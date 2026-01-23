use super::types::AppSettings;
use crate::shortcuts::parse_shortcut;
use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_store::StoreExt;
use std::sync::Mutex;

pub struct SettingsManager {
    app: AppHandle,
    current_shortcut: Mutex<Option<Shortcut>>,
}

impl SettingsManager {
    pub fn new(app: AppHandle) -> Self {
        Self { 
            app,
            current_shortcut: Mutex::new(None),
        }
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

    /// Apply shortcut changes - unregister old and register new
    fn apply_shortcut(&self, shortcut_str: &str) -> Result<(), String> {
        let global_shortcut = self.app.global_shortcut();
        
        // Parse the new shortcut
        let new_shortcut = parse_shortcut(shortcut_str)?;
        
        // Get current shortcut and check if it's different
        let mut current = self.current_shortcut.lock().map_err(|e| format!("Lock error: {}", e))?;
        
        // If we have a current shortcut, unregister it first
        if let Some(old_shortcut) = current.take() {
            // Only unregister if it's different from the new one
            if old_shortcut != new_shortcut {
                let _ = global_shortcut.unregister(old_shortcut);
            }
        }
        
        // Register the new shortcut
        global_shortcut
            .register(new_shortcut.clone())
            .map_err(|e| format!("Failed to register shortcut '{}': {}", shortcut_str, e))?;
        
        // Store the new shortcut as current
        *current = Some(new_shortcut);
        
        Ok(())
    }

    /// Register the initial shortcut from settings
    pub fn register_initial_shortcut(&self, shortcut_str: &str) -> Result<(), String> {
        let new_shortcut = parse_shortcut(shortcut_str)?;
        
        let global_shortcut = self.app.global_shortcut();
        global_shortcut
            .register(new_shortcut.clone())
            .map_err(|e| format!("Failed to register shortcut '{}': {}", shortcut_str, e))?;
        
        // Store as current
        let mut current = self.current_shortcut.lock().map_err(|e| format!("Lock error: {}", e))?;
        *current = Some(new_shortcut);
        
        Ok(())
    }

    /// Get current auto startup status
    pub fn get_auto_startup_status(&self) -> Result<bool, String> {
        let autostart = self.app.autolaunch();
        autostart
            .is_enabled()
            .map_err(|e| format!("Failed to check autostart status: {}", e))
    }

    /// Apply only auto startup setting (used during initial setup to avoid double shortcut registration)
    pub fn apply_auto_startup_only(&self, settings: &AppSettings) -> Result<(), String> {
        self.apply_auto_startup(settings.general.auto_startup)
    }
}
