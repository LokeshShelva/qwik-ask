/**
 * Tests for SettingsView component.
 * 
 * Focus: UI display and user interactions with settings.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import SettingsView from '../../views/SettingsView.vue';
import { DEFAULT_SETTINGS } from '../../types/settings';

// Mock Tauri APIs
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
    invoke: (...args: unknown[]) => mockInvoke(...args),
}));

const mockGetCurrentWindow = vi.fn(() => ({
    minimize: vi.fn(),
    hide: vi.fn(),
    onCloseRequested: vi.fn(() => Promise.resolve(() => { })),
    onFocusChanged: vi.fn(() => Promise.resolve(() => { })),
}));
vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => mockGetCurrentWindow(),
}));

// Mock Tauri event API
vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(() => Promise.resolve(() => { })),
}));

// Mock useTheme composable
vi.mock('../../composables/useTheme', () => ({
    useTheme: () => ({
        theme: 'dark',
        setTheme: vi.fn(),
    }),
    applyThemeFromSettings: vi.fn(),
    setupSystemThemeListener: vi.fn(() => () => { }),
}));


describe('SettingsView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: return settings successfully
        mockInvoke.mockImplementation((cmd: string) => {
            if (cmd === 'get_settings') return Promise.resolve({ ...DEFAULT_SETTINGS });
            if (cmd === 'get_auto_startup_status') return Promise.resolve(false);
            if (cmd === 'get_current_version') return Promise.resolve('0.1.0');
            if (cmd === 'check_for_updates') return Promise.resolve({ status: 'UpToDate' });
            return Promise.resolve();
        });
    });

    const mountSettings = async () => {
        const wrapper = mount(SettingsView, {
            global: {
                stubs: {
                    ShortcutRecorder: true,
                },
            },
        });
        await flushPromises();
        return wrapper;
    };

    describe('Display', () => {
        it('does not show settings content before load completes', () => {
            // Don't await - check immediate state before async load
            const wrapper = mount(SettingsView, {
                global: { stubs: { ShortcutRecorder: true } },
            });
            // Settings content should not be visible yet
            expect(wrapper.find('.settings-content').exists()).toBe(false);
        });

        it('shows settings page after load', async () => {
            const wrapper = await mountSettings();
            expect(wrapper.text()).toContain('Settings');
            expect(wrapper.text()).toContain('Configure your Quick Assist preferences');
        });

        it('shows error state on load failure', async () => {
            mockInvoke.mockImplementation((cmd: string) => {
                if (cmd === 'get_settings') return Promise.reject(new Error('Load failed'));
                if (cmd === 'get_current_version') return Promise.resolve('0.1.0');
                if (cmd === 'check_for_updates') return Promise.resolve({ status: 'UpToDate' });
                return Promise.resolve();
            });

            const wrapper = mount(SettingsView, {
                global: { stubs: { ShortcutRecorder: true } },
            });
            await flushPromises();

            expect(wrapper.text()).toContain('Error loading settings');
        });

        it('displays all settings groups', async () => {
            const wrapper = await mountSettings();

            expect(wrapper.text()).toContain('General');
            expect(wrapper.text()).toContain('Shortcuts');
            expect(wrapper.text()).toContain('AI Provider');
        });
    });

    describe('General Settings', () => {
        it('theme dropdown reflects current setting', async () => {
            const wrapper = await mountSettings();

            const themeSelect = wrapper.find('select');
            expect(themeSelect.element.value).toBe('dark');
        });

        it('auto-startup checkbox reflects current setting', async () => {
            const wrapper = await mountSettings();

            const checkbox = wrapper.find('input[type="checkbox"]');
            expect((checkbox.element as HTMLInputElement).checked).toBe(false);
        });

        it('changing theme calls updateSettings', async () => {
            const wrapper = await mountSettings();

            const themeSelect = wrapper.find('select');
            await themeSelect.setValue('light');

            expect(mockInvoke).toHaveBeenCalledWith('update_settings', expect.objectContaining({
                settings: expect.objectContaining({
                    general: expect.objectContaining({ theme: 'light' }),
                }),
            }));
        });

        it('toggling auto-startup calls updateSettings', async () => {
            const wrapper = await mountSettings();

            const checkbox = wrapper.find('input[type="checkbox"]');
            await checkbox.setValue(true);

            expect(mockInvoke).toHaveBeenCalledWith('update_settings', expect.objectContaining({
                settings: expect.objectContaining({
                    general: expect.objectContaining({ auto_startup: true }),
                }),
            }));
        });
    });

    describe('Shortcuts', () => {
        it('displays current shortcut', async () => {
            const wrapper = await mountSettings();

            expect(wrapper.text()).toContain('Alt+Shift+Space');
        });

        it('edit button exists for shortcut', async () => {
            const wrapper = await mountSettings();

            // Find the shortcut edit button (has edit icon)
            const editBtns = wrapper.findAll('button');
            const shortcutEditBtn = editBtns.find(btn =>
                btn.element.closest('.setting-item')?.textContent?.includes('Toggle launcher')
            );
            expect(shortcutEditBtn).toBeDefined();
        });
    });

    describe('LLM Settings', () => {
        it('provider dropdown reflects current setting', async () => {
            const wrapper = await mountSettings();

            const selects = wrapper.findAll('select');
            const providerSelect = selects.find(s =>
                s.element.closest('.setting-item')?.textContent?.includes('provider')
            );
            expect(providerSelect?.element.value).toBe('gemini');
        });

        it('API key input exists', async () => {
            const wrapper = await mountSettings();

            const apiKeyInput = wrapper.find('input[type="password"]');
            expect(apiKeyInput.exists()).toBe(true);
        });

        it('system prompt textarea exists', async () => {
            const wrapper = await mountSettings();

            const textarea = wrapper.find('textarea');
            expect(textarea.exists()).toBe(true);
            expect(textarea.element.value).toContain('Quick Assist');
        });

        it('changing provider calls updateSettings', async () => {
            const wrapper = await mountSettings();

            const selects = wrapper.findAll('select');
            const providerSelect = selects.find(s =>
                s.element.closest('.setting-item')?.textContent?.includes('provider')
            );
            await providerSelect?.setValue('openai');

            expect(mockInvoke).toHaveBeenCalledWith('update_settings', expect.objectContaining({
                settings: expect.objectContaining({
                    llm: expect.objectContaining({ provider: 'openai' }),
                }),
            }));
        });

        it('reset prompt button exists', async () => {
            const wrapper = await mountSettings();

            const buttons = wrapper.findAll('button');
            const resetBtn = buttons.find(btn => btn.text().includes('Reset'));
            expect(resetBtn).toBeDefined();
        });
    });

    describe('Window Controls', () => {
        it('minimize button exists', async () => {
            const wrapper = await mountSettings();

            const minimizeBtn = wrapper.find('.titlebar-btn');
            expect(minimizeBtn.exists()).toBe(true);
        });

        it('close button exists', async () => {
            const wrapper = await mountSettings();

            const btns = wrapper.findAll('.titlebar-btn');
            expect(btns.length).toBeGreaterThanOrEqual(2);
        });
    });
});
