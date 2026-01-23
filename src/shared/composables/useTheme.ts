import { ref } from 'vue';
import type { Theme } from '../../features/settings/types/settings';

const currentTheme = ref<'dark' | 'light'>('dark');

/**
 * Detect the system's preferred color scheme
 */
export function getSystemTheme(): 'dark' | 'light' {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
}

/**
 * Apply theme to the document
 */
export function applyTheme(theme: 'dark' | 'light') {
    currentTheme.value = theme;
    document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Resolve the effective theme from settings
 */
export function resolveTheme(themeSetting: Theme): 'dark' | 'light' {
    if (themeSetting === 'system') {
        return getSystemTheme();
    }
    return themeSetting;
}

/**
 * Apply theme from settings value
 */
export function applyThemeFromSettings(themeSetting: Theme) {
    const effectiveTheme = resolveTheme(themeSetting);
    applyTheme(effectiveTheme);
}

/**
 * Setup system theme change listener
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
