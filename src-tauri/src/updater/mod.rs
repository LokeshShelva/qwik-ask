//! Auto-updater module.
//!
//! Provides functionality for checking and installing application updates.
//! Uses the Tauri updater plugin to check for updates from a remote endpoint.
//!
//! # Features
//!
//! - Check for available updates
//! - Download and install updates
//! - Emit events for update progress
//!
//! # Update Flow
//!
//! 1. Check for updates via the configured endpoint
//! 2. If update available, optionally download and install
//! 3. Restart the application to apply the update

use serde::Serialize;
use tauri::Emitter;
use tauri_plugin_updater::UpdaterExt;

/// Information about an available update.
#[derive(Debug, Clone, Serialize)]
pub struct UpdateInfo {
    /// The new version available
    pub version: String,
    /// Release notes/changelog (if available)
    pub body: Option<String>,
    /// Release date (if available)
    pub date: Option<String>,
}

/// Result of checking for updates.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "status", content = "data")]
pub enum UpdateCheckResult {
    /// An update is available
    Available(UpdateInfo),
    /// Already on the latest version
    UpToDate,
    /// Error occurred while checking
    Error(String),
}

/// Check for available updates.
///
/// Queries the configured update endpoint to check if a newer version is available.
///
/// # Arguments
///
/// * `app` - The Tauri AppHandle
///
/// # Returns
///
/// * `UpdateCheckResult` - The result of the update check
#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> UpdateCheckResult {
    let updater = match app.updater() {
        Ok(updater) => updater,
        Err(e) => {
            return UpdateCheckResult::Error(format!("Failed to initialize updater: {}", e));
        }
    };

    match updater.check().await {
        Ok(Some(update)) => UpdateCheckResult::Available(UpdateInfo {
            version: update.version.clone(),
            body: update.body.clone(),
            date: update.date.map(|d| d.to_string()),
        }),
        Ok(None) => UpdateCheckResult::UpToDate,
        Err(e) => UpdateCheckResult::Error(format!("Failed to check for updates: {}", e)),
    }
}

/// Download and install an available update.
///
/// Downloads the update package and installs it. The application will need to
/// be restarted to apply the update.
///
/// # Arguments
///
/// * `app` - The Tauri AppHandle
///
/// # Returns
///
/// * `Ok(())` - Update installed successfully
/// * `Err(String)` - Error message if the update failed
///
/// # Events
///
/// Emits progress events during download:
/// - `update-download-progress` - Progress percentage (0-100)
/// - `update-download-finished` - Download completed
/// - `update-install-started` - Installation started
#[tauri::command]
pub async fn download_and_install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app
        .updater()
        .map_err(|e| format!("Failed to initialize updater: {}", e))?;

    let update = updater
        .check()
        .await
        .map_err(|e| format!("Failed to check for updates: {}", e))?
        .ok_or_else(|| "No update available".to_string())?;

    let app_handle = app.clone();

    // Download with progress tracking
    let mut downloaded: u64 = 0;
    let mut last_percentage: u8 = 0;

    update
        .download_and_install(
            |chunk_length, content_length| {
                downloaded += chunk_length as u64;
                if let Some(total) = content_length {
                    let percentage = ((downloaded as f64 / total as f64) * 100.0) as u8;
                    // Only emit when percentage changes to avoid flooding
                    if percentage != last_percentage {
                        last_percentage = percentage;
                        let _ = app_handle.emit("update-download-progress", percentage);
                    }
                }
            },
            || {
                let _ = app_handle.emit("update-download-finished", ());
            },
        )
        .await
        .map_err(|e| format!("Failed to download and install update: {}", e))?;

    let _ = app.emit("update-install-started", ());

    Ok(())
}

/// Restart the application to apply the installed update.
///
/// This will close the current application and start the new version.
///
/// # Arguments
///
/// * `app` - The Tauri AppHandle
#[tauri::command]
pub fn restart_app(app: tauri::AppHandle) {
    app.restart();
}

/// Get the current application version.
///
/// # Returns
///
/// The current version string from Cargo.toml
#[tauri::command]
pub fn get_current_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
