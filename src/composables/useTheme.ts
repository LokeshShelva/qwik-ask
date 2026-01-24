/**
 * @fileoverview Theme composable for managing dark/light mode.
 * 
 * Handles theme detection, application, and system preference changes.
 * Themes are applied by setting `data-theme` attribute on `<html>`.
 * 
 * @example Basic usage
 * ```typescript
 * import { applyThemeFromSettings, setupSystemThemeListener } from './useTheme';
 * 
 * // Apply theme from user settings
 * applyThemeFromSettings(settings.general.theme); // 'dark' | 'light' | 'system'
 * 
 * // Listen for system theme changes (for 'system' setting)
 * const cleanup = setupSystemThemeListener(settings.general.theme);
 * onUnmounted(() => cleanup?.());
 * ```
 * 
 * @module composables/useTheme
 */

import { ref } from 'vue';
import type { Theme } from '../types/settings';

/** 
 * Current effective theme ('dark' or 'light').
 * Shared across all composable instances.
 */
const currentTheme = ref<'dark' | 'light'>('dark');

/**
 * Detect the operating system's preferred color scheme.
 * 
 * @returns 'dark' if system prefers dark mode, 'light' otherwise
 * 
 * @example
 * ```typescript
 * const systemPreference = getSystemTheme();
 * console.log(`System prefers: ${systemPreference}`);
 * ```
 */
export function getSystemTheme(): 'dark' | 'light' {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Default fallback
}

/**
 * Apply a theme to the document.
 * Sets `data-theme` attribute on `<html>` element for CSS selectors.
 * 
 * @param theme - 'dark' or 'light'
 * 
 * @example CSS usage
 * ```css
 * [data-theme="dark"] {
 *   --bg-primary: #18181b;
 *   --text-primary: #fafafa;
 * }
 * [data-theme="light"] {
 *   --bg-primary: #ffffff;
 *   --text-primary: #18181b;
 * }
 * ```
 */
export function applyTheme(theme: 'dark' | 'light') {
    currentTheme.value = theme;
    document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Resolve the effective theme from a settings value.
 * Converts 'system' to the actual system preference.
 * 
 * @param themeSetting - Theme from settings ('dark' | 'light' | 'system')
 * @returns Effective theme ('dark' | 'light')
 * 
 * @example
 * ```typescript
 * resolveTheme('system'); // Returns 'dark' or 'light' based on OS
 * resolveTheme('dark');   // Returns 'dark'
 * ```
 */
export function resolveTheme(themeSetting: Theme): 'dark' | 'light' {
    if (themeSetting === 'system') {
        return getSystemTheme();
    }
    return themeSetting;
}

/**
 * Apply theme from a settings value.
 * Convenience function that resolves and applies in one call.
 * 
 * @param themeSetting - Theme from settings ('dark' | 'light' | 'system')
 * 
 * @example
 * ```typescript
 * // In your component
 * applyThemeFromSettings(settings.value.general.theme);
 * ```
 */
export function applyThemeFromSettings(themeSetting: Theme) {
    const effectiveTheme = resolveTheme(themeSetting);
    applyTheme(effectiveTheme);
}

/**
 * Setup a listener for system theme changes.
 * 
 * **When to use:** Call this when theme is set to 'system' so the app
 * reacts when the user changes their OS dark/light mode setting.
 * 
 * **Quirk:** The listener only applies changes if `themeSetting` is 'system'.
 * This is checked at the time the listener fires, using the value passed
 * at setup time. If the user changes theme setting to 'dark', the listener
 * still exists but won't apply changes.
 * 
 * @param themeSetting - Current theme setting from user preferences
 * @returns Cleanup function to remove the listener, or undefined
 * 
 * @example
 * ```typescript
 * let cleanup: (() => void) | undefined;
 * 
 * onMounted(() => {
 *   cleanup = setupSystemThemeListener(settings.value.general.theme);
 * });
 * 
 * onUnmounted(() => {
 *   cleanup?.();
 * });
 * ```
 */
export function setupSystemThemeListener(themeSetting: Theme) {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
        // Only apply if theme is set to 'system'
        if (themeSetting === 'system') {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
        mediaQuery.removeEventListener('change', handleChange);
    };
}

/**
 * Composable wrapper for theme utilities.
 * 
 * **Note:** For most use cases, import the individual functions directly.
 * This composable is provided for consistency with Vue patterns.
 * 
 * @returns Theme state and utility functions
 */
export function useTheme() {
    return {
        currentTheme,
        getSystemTheme,
        applyTheme,
        resolveTheme,
        applyThemeFromSettings,
        setupSystemThemeListener,
    };
}
