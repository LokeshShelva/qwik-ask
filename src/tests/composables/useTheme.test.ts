/**
 * Tests for useTheme composable.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getSystemTheme,
    applyTheme,
    resolveTheme,
    applyThemeFromSettings,
} from '../../composables/useTheme';

describe('useTheme', () => {
    beforeEach(() => {
        // Reset DOM state
        document.documentElement.removeAttribute('data-theme');
    });

    describe('getSystemTheme', () => {
        it('should return dark when system prefers dark mode', () => {
            // Mock matchMedia
            vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
                matches: query === '(prefers-color-scheme: dark)',
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })));

            expect(getSystemTheme()).toBe('dark');
        });

        it('should return light when system prefers light mode', () => {
            vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })));

            expect(getSystemTheme()).toBe('light');
        });
    });

    describe('applyTheme', () => {
        it('should set data-theme attribute on document', () => {
            applyTheme('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

            applyTheme('light');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        });
    });

    describe('resolveTheme', () => {
        it('should return theme directly for non-system values', () => {
            expect(resolveTheme('dark')).toBe('dark');
            expect(resolveTheme('light')).toBe('light');
        });

        it('should resolve system to actual theme', () => {
            vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })));

            expect(resolveTheme('system')).toBe('dark');
        });
    });

    describe('applyThemeFromSettings', () => {
        it('should apply dark theme', () => {
            applyThemeFromSettings('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        });

        it('should apply light theme', () => {
            applyThemeFromSettings('light');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        });

        it('should resolve and apply system theme', () => {
            vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })));

            applyThemeFromSettings('system');
            expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        });
    });
});
