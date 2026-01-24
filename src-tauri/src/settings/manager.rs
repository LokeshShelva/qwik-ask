//! Settings manager for load, save, and apply operations.
//!
//! This module provides the `SettingsManager` struct which handles:
//! - Loading/saving settings from `tauri-plugin-store`
//! - Applying settings (auto-startup, global shortcuts)
//! - Thread-safe shortcut state management

use super::types::AppSettings;
use crate::shortcuts::parse_shortcut;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_store::StoreExt;

/// Manages application settings persistence and application.
///
/// Holds a reference to the Tauri app handle and tracks the currently
/// registered global shortcut to enable proper cleanup when changing shortcuts.
///
/// # Thread Safety
///
/// The `current_shortcut` field is wrapped in a `Mutex` to allow safe
/// access from multiple threads (e.g., Tauri command handlers).
///
/// # Example
///
/// ```rust,ignore
/// let manager = SettingsManager::new(app.handle().clone());
///
/// // Load settings
/// let settings = manager.load()?;
///
/// // Update and apply
/// manager.save(&new_settings)?;
/// manager.apply(&new_settings)?;
/// ```
pub struct SettingsManager {
    app: AppHandle,
    /// Currently registered shortcut, used to unregister before registering a new one
    current_shortcut: Mutex<Option<Shortcut>>,
}

impl SettingsManager {
    /// Create a new settings manager.
    ///
    /// # Arguments
    ///
    /// * `app` - Tauri app handle for accessing plugins and state
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            current_shortcut: Mutex::new(None),
        }
    }

    /// Load settings from the store.
    ///
    /// Returns default settings if no settings file exists or if the
    /// stored settings are corrupted/incompatible.
    ///
    /// # Returns
    ///
    /// * `Ok(AppSettings)` - Loaded or default settings
    /// * `Err(String)` - Error accessing the store
    pub fn load(&self) -> Result<AppSettings, String> {
        let store = self
            .app
            .store("settings.json")
            .map_err(|e| format!("Failed to access store: {}", e))?;

        if let Some(settings_value) = store.get("settings") {
            serde_json::from_value(settings_value.clone())
                .map_err(|e| format!("Failed to deserialize settings: {}", e))
        } else {
            Ok(AppSettings::default())
        }
    }

    /// Save settings to the store.
    ///
    /// Persists settings immediately to disk.
    ///
    /// # Arguments
    ///
    /// * `settings` - Complete settings object to save
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

    /// Apply settings to the running application.
    ///
    /// Updates system state to match settings:
    /// - Enables/disables auto-startup in the OS
    /// - Re-registers global shortcut if changed
    ///
    /// # Arguments
    ///
    /// * `settings` - Settings to apply
    pub fn apply(&self, settings: &AppSettings) -> Result<(), String> {
        self.apply_auto_startup(settings.general.auto_startup)?;
        self.apply_shortcut(&settings.shortcuts.toggle_launcher)?;
        Ok(())
    }

    /// Enable or disable auto-startup.
    ///
    /// Only performs an action if the current state differs from the
    /// desired state to avoid unnecessary system calls.
    fn apply_auto_startup(&self, enabled: bool) -> Result<(), String> {
        let autostart = self.app.autolaunch();
        let is_enabled = autostart.is_enabled().unwrap_or(false);

        if enabled && !is_enabled {
            autostart
                .enable()
                .map_err(|e| format!("Failed to enable autostart: {}", e))?;
        } else if !enabled && is_enabled {
            autostart
                .disable()
                .map_err(|e| format!("Failed to disable autostart: {}", e))?;
        }

        Ok(())
    }

    /// Apply a new global shortcut.
    ///
    /// Handles the full lifecycle:
    /// 1. Parse the shortcut string
    /// 2. Compare with current shortcut (no-op if unchanged)
    /// 3. Unregister old shortcut if different
    /// 4. Register new shortcut
    /// 5. Store as current for future comparisons
    ///
    /// # Arguments
    ///
    /// * `shortcut_str` - Shortcut string like "Alt+Shift+Space"
    ///
    /// # Errors
    ///
    /// Returns an error if:
    /// - The shortcut string is invalid
    /// - The shortcut is already in use by another application
    fn apply_shortcut(&self, shortcut_str: &str) -> Result<(), String> {
        let global_shortcut = self.app.global_shortcut();
        let new_shortcut = parse_shortcut(shortcut_str)?;

        let mut current = self
            .current_shortcut
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;

        // No-op if shortcut hasn't changed
        if let Some(ref old_shortcut) = *current {
            if *old_shortcut == new_shortcut {
                return Ok(());
            }
            let _ = global_shortcut.unregister(old_shortcut.clone());
        }

        global_shortcut
            .register(new_shortcut.clone())
            .map_err(|e| format!("Failed to register shortcut '{}': {}", shortcut_str, e))?;

        *current = Some(new_shortcut);

        Ok(())
    }

    /// Register the initial shortcut on application startup.
    ///
    /// Unlike `apply_shortcut`, this doesn't try to unregister an old shortcut
    /// since there isn't one on fresh startup.
    ///
    /// # Arguments
    ///
    /// * `shortcut_str` - Shortcut string like "Alt+Shift+Space"
    pub fn register_initial_shortcut(&self, shortcut_str: &str) -> Result<(), String> {
        let new_shortcut = parse_shortcut(shortcut_str)?;

        let global_shortcut = self.app.global_shortcut();
        global_shortcut
            .register(new_shortcut.clone())
            .map_err(|e| format!("Failed to register shortcut '{}': {}", shortcut_str, e))?;

        let mut current = self
            .current_shortcut
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        *current = Some(new_shortcut);

        Ok(())
    }

    /// Get current auto-startup status from the OS.
    ///
    /// Queries the system directly rather than reading from settings,
    /// so it reflects the actual state even if manually changed.
    pub fn get_auto_startup_status(&self) -> Result<bool, String> {
        let autostart = self.app.autolaunch();
        autostart
            .is_enabled()
            .map_err(|e| format!("Failed to check autostart status: {}", e))
    }

    /// Apply only auto-startup setting.
    ///
    /// Used during initial setup to avoid double shortcut registration.
    /// The shortcut is registered separately via `register_initial_shortcut`.
    pub fn apply_auto_startup_only(&self, settings: &AppSettings) -> Result<(), String> {
        self.apply_auto_startup(settings.general.auto_startup)
    }
}
