import { ref, Ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { AppSettings } from '../types/settings';

export function useSettings() {
    const settings: Ref<AppSettings | null> = ref(null);
    const loading = ref(false);
    const error: Ref<string | null> = ref(null);

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

    const updateSettings = async (newSettings: AppSettings) => {
        loading.value = true;
        error.value = null;

        try {
            await invoke('update_settings', { settings: newSettings });
            settings.value = newSettings;
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err);
            console.error('Failed to update settings:', err);
            throw err;
        } finally {
            loading.value = false;
        }
    };

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
