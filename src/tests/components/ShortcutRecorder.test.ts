/**
 * Tests for ShortcutRecorder component.
 * 
 * Focus: Shortcut recording, validation, and modal actions.
 * 
 * Note: The component listens to keydown/keyup on document, so we must
 * dispatch events to document directly rather than using wrapper.trigger().
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import ShortcutRecorder from '../../components/ShortcutRecorder.vue';

describe('ShortcutRecorder', () => {
    let wrapper: VueWrapper;

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        wrapper?.unmount();
        vi.useRealTimers();
    });

    const mountRecorder = () => {
        wrapper = mount(ShortcutRecorder, {
            props: {
                currentShortcut: 'Alt+Shift+Space',
            },
            attachTo: document.body,
        });
        return wrapper;
    };

    /**
     * Helper to simulate keyboard events on document.
     * The component listens on document, not the element itself.
     */
    const pressKey = (key: string, modifiers: Partial<KeyboardEventInit> = {}) => {
        const event = new KeyboardEvent('keydown', {
            key,
            bubbles: true,
            cancelable: true,
            ...modifiers,
        });
        document.dispatchEvent(event);
    };

    describe('Display', () => {
        it('shows "Set Shortcut" title', () => {
            const wrapper = mountRecorder();
            expect(wrapper.text()).toContain('Set Shortcut');
        });

        it('shows current shortcut', () => {
            const wrapper = mountRecorder();
            expect(wrapper.text()).toContain('Alt+Shift+Space');
        });

        it('shows "Waiting for input..." initially', () => {
            const wrapper = mountRecorder();
            expect(wrapper.text()).toContain('Waiting for input');
        });

        it('shows instruction text', () => {
            const wrapper = mountRecorder();
            expect(wrapper.text()).toContain('Press any key combination');
        });
    });

    describe('Recording', () => {
        it('displays recorded key combination', async () => {
            const wrapper = mountRecorder();

            // Simulate pressing Alt+Shift+K
            pressKey('k', { altKey: true, shiftKey: true });
            await wrapper.vm.$nextTick();

            expect(wrapper.text()).toContain('Alt');
            expect(wrapper.text()).toContain('Shift');
        });

        it('handles modifier + letter combinations', async () => {
            const wrapper = mountRecorder();

            pressKey('a', { ctrlKey: true });
            await wrapper.vm.$nextTick();

            expect(wrapper.text()).toContain('Ctrl');
        });
    });

    describe('Validation', () => {
        it('save button is disabled without a recorded shortcut', () => {
            const wrapper = mountRecorder();
            const saveBtn = wrapper.find('.btn-primary');
            expect(saveBtn.attributes('disabled')).toBeDefined();
        });

        it('shows warning for common shortcuts like Ctrl+C', async () => {
            const wrapper = mountRecorder();

            pressKey('c', { ctrlKey: true });
            await wrapper.vm.$nextTick();

            expect(wrapper.text()).toContain('commonly used');
        });

        it('shows error for dangerous shortcuts like Alt+F4', async () => {
            const wrapper = mountRecorder();

            pressKey('F4', { altKey: true });
            await wrapper.vm.$nextTick();

            expect(wrapper.text()).toContain('system shortcut');
            expect(wrapper.text()).toContain('cannot be used');
        });
    });

    describe('Actions', () => {
        it('emits cancel when Escape is pressed', async () => {
            const wrapper = mountRecorder();

            pressKey('Escape');
            await wrapper.vm.$nextTick();

            expect(wrapper.emitted('cancel')).toBeTruthy();
        });

        it('emits cancel when Cancel button clicked', async () => {
            const wrapper = mountRecorder();

            const cancelBtn = wrapper.findAll('.btn-ghost').find(b => b.text() === 'Cancel');
            await cancelBtn!.trigger('click');

            expect(wrapper.emitted('cancel')).toBeTruthy();
        });

        it('emits cancel when clicking overlay background', async () => {
            const wrapper = mountRecorder();

            await wrapper.find('.modal-overlay').trigger('click');

            expect(wrapper.emitted('cancel')).toBeTruthy();
        });

        it('clicking close button emits cancel', async () => {
            const wrapper = mountRecorder();

            await wrapper.find('.modal-close').trigger('click');

            expect(wrapper.emitted('cancel')).toBeTruthy();
        });

        it('Reset button clears recorded shortcut', async () => {
            const wrapper = mountRecorder();

            // Record a shortcut first
            pressKey('k', { altKey: true });
            await wrapper.vm.$nextTick();

            // Click reset
            const resetBtn = wrapper.findAll('.btn-ghost').find(b => b.text() === 'Reset');
            await resetBtn!.trigger('click');

            expect(wrapper.text()).toContain('Waiting for input');
        });

        it('emits save with shortcut when Save clicked', async () => {
            const wrapper = mountRecorder();

            // Record a valid shortcut
            pressKey('k', { altKey: true, shiftKey: true });
            await wrapper.vm.$nextTick();

            // Click save
            const saveBtn = wrapper.find('.btn-primary');
            await saveBtn.trigger('click');

            expect(wrapper.emitted('save')).toBeTruthy();
        });
    });
});
