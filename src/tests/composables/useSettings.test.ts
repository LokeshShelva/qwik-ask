/**
 * Tests for useSettings composable.
 * 
 * Focus: State management and Tauri API interactions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettings } from '../../composables/useSettings';
import { DEFAULT_SETTINGS } from '../../types/settings';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
    invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe('useSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loadSettings', () => {
        it('fetches settings from backend and updates state', async () => {
            mockInvoke.mockResolvedValueOnce(DEFAULT_SETTINGS);

            const { settings, loadSettings, loading, error } = useSettings();

            expect(settings.value).toBeNull();

            await loadSettings();

            expect(mockInvoke).toHaveBeenCalledWith('get_settings');
            expect(settings.value).toEqual(DEFAULT_SETTINGS);
            expect(loading.value).toBe(false);
            expect(error.value).toBeNull();
        });

        it('sets loading state during fetch', async () => {
            let resolvePromise: (value: unknown) => void;
            const promise = new Promise((resolve) => {
                resolvePromise = resolve;
            });
            mockInvoke.mockReturnValueOnce(promise);

            const { loadSettings, loading } = useSettings();

            const loadPromise = loadSettings();
            expect(loading.value).toBe(true);

            resolvePromise!(DEFAULT_SETTINGS);
            await loadPromise;

            expect(loading.value).toBe(false);
        });

        it('sets error state on failure', async () => {
            mockInvoke.mockRejectedValueOnce(new Error('Network error'));

            const { loadSettings, error, settings } = useSettings();

            await loadSettings();

            expect(error.value).toBe('Network error');
            expect(settings.value).toBeNull();
        });
    });

    describe('updateSettings', () => {
        it('sends settings to backend and updates local state', async () => {
            mockInvoke.mockResolvedValueOnce(undefined);

            const { updateSettings, settings } = useSettings();

            const newSettings = {
                ...DEFAULT_SETTINGS,
                general: { ...DEFAULT_SETTINGS.general, theme: 'light' as const },
            };

            await updateSettings(newSettings);

            expect(mockInvoke).toHaveBeenCalledWith('update_settings', { settings: newSettings });
            expect(settings.value).toEqual(newSettings);
        });

        it('sets error state on failure', async () => {
            mockInvoke.mockRejectedValueOnce(new Error('Save failed'));

            const { updateSettings, error } = useSettings();

            await expect(updateSettings(DEFAULT_SETTINGS)).rejects.toThrow('Save failed');
            expect(error.value).toBe('Save failed');
        });
    });

    describe('resetSettings', () => {
        it('calls backend and updates state with defaults', async () => {
            mockInvoke.mockResolvedValueOnce(DEFAULT_SETTINGS);

            const { resetSettings, settings } = useSettings();

            await resetSettings();

            expect(mockInvoke).toHaveBeenCalledWith('reset_settings');
            expect(settings.value).toEqual(DEFAULT_SETTINGS);
        });

        it('sets error state on failure', async () => {
            mockInvoke.mockRejectedValueOnce(new Error('Reset failed'));

            const { resetSettings, error } = useSettings();

            await resetSettings();

            expect(error.value).toBe('Reset failed');
        });
    });

    describe('getAutoStartupStatus', () => {
        it('returns true when auto-startup is enabled', async () => {
            mockInvoke.mockResolvedValueOnce(true);

            const { getAutoStartupStatus } = useSettings();

            const result = await getAutoStartupStatus();

            expect(mockInvoke).toHaveBeenCalledWith('get_auto_startup_status');
            expect(result).toBe(true);
        });

        it('returns false on error', async () => {
            mockInvoke.mockRejectedValueOnce(new Error('OS error'));

            const { getAutoStartupStatus } = useSettings();

            const result = await getAutoStartupStatus();

            expect(result).toBe(false);
        });
    });
});
