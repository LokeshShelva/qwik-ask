/**
 * @fileoverview Settings composable for managing application settings via Tauri.
 * 
 * This composable provides CRUD operations for app settings stored in
 * a JSON file via the Rust backend. Settings are persisted across sessions.
 * 
 * @example Basic usage
 * ```typescript
 * const { settings, loadSettings, updateSettings } = useSettings();
 * 
 * // Load settings on mount
 * await loadSettings();
 * 
 * // Access current settings
 * console.log(settings.value?.general.theme);
 * 
 * // Update a setting
 * const updated = { ...settings.value, general: { ...settings.value.general, theme: 'light' } };
 * await updateSettings(updated);
 * ```
 * 
 * @module composables/useSettings
 */

import { ref, Ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { AppSettings } from '../types/settings';

/**
 * Composable for managing application settings.
 * 
 * **Architecture:** Settings are stored in a JSON file on disk, managed by
 * the Rust backend. This composable communicates via Tauri's invoke API.
 * 
 * **State is NOT shared** - each component gets its own instance.
 * Call `loadSettings()` in each component that needs settings.
 * 
 * @returns Settings state and methods
 */
export function useSettings() {
    /** Current settings object, null until loaded */
    const settings: Ref<AppSettings | null> = ref(null);

    /** Whether a settings operation is in progress */
    const loading = ref(false);

    /** Error message from last failed operation */
    const error: Ref<string | null> = ref(null);

    /**
     * Load settings from the backend.
     * Overwrites local `settings` state with fresh data.
     * 
     * **Quirk:** Always call this in `onMounted` before accessing settings,
     * as settings.value is null until loaded.
     * 
     * @example
     * ```typescript
     * onMounted(async () => {
     *   await loadSettings();
     *   if (settings.value) {
     *     applyTheme(settings.value.general.theme);
     *   }
     * });
     * ```
     */
    const loadSettings = async () => {
        loading.value = true;
        error.value = null;

        try {
            const result = await invoke<AppSettings>('get_settings');
            settings.value = result;
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err);
            console.error('Failed to load settings:', err);
        } finally {
            loading.value = false;
        }
    };

    /**
     * Update settings in the backend.
     * 
     * **Quirk:** You must pass the complete settings object, not just
     * the changed fields. Use spread operator to merge changes:
     * 
     * @param newSettings - Complete settings object to save
     * @throws Re-throws errors after logging (caller should handle)
     * 
     * @example
     * ```typescript
     * // Correct: spread existing settings
     * const updated = {
     *   ...settings.value,
     *   general: { ...settings.value.general, theme: 'dark' }
     * };
     * await updateSettings(updated);
     * 
     * // Wrong: missing fields will cause issues
     * await updateSettings({ theme: 'dark' }); // Don't do this!
     * ```
     */
    const updateSettings = async (newSettings: AppSettings) => {
        loading.value = true;
        error.value = null;

        try {
            await invoke('update_settings', { settings: newSettings });
            settings.value = newSettings;
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err);
            console.error('Failed to update settings:', err);
            throw err; // Re-throw for caller to handle
        } finally {
            loading.value = false;
        }
    };

    /**
     * Reset settings to defaults.
     * Calls backend which returns the default settings object.
     */
    const resetSettings = async () => {
        loading.value = true;
        error.value = null;

        try {
            const result = await invoke<AppSettings>('reset_settings');
            settings.value = result;
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err);
            console.error('Failed to reset settings:', err);
        } finally {
            loading.value = false;
        }
    };

    /**
     * Check if the app is configured to start at system login.
     * 
     * **Note:** This queries the OS directly, not the settings file.
     * There can be a mismatch if the user manually changed startup settings.
     * 
     * @returns true if auto-startup is enabled, false otherwise
     */
    const getAutoStartupStatus = async () => {
        try {
            return await invoke<boolean>('get_auto_startup_status');
        } catch (err) {
            console.error('Failed to get auto startup status:', err);
            return false;
        }
    };

    return {
        settings,
        loading,
        error,
        loadSettings,
        updateSettings,
        resetSettings,
        getAutoStartupStatus,
    };
}
