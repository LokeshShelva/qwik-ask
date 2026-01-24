/**
 * Tests for ChatMessage component.
 * 
 * Focus: User-facing behavior of message rendering and copy functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ChatMessage from '../../components/ChatMessage.vue';

// Mock clipboard with proper vitest pattern
const mockWriteText = vi.fn(() => Promise.resolve());
vi.stubGlobal('navigator', {
    clipboard: {
        writeText: mockWriteText,
    },
});

describe('ChatMessage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('User Message', () => {
        it('renders user content as plain text', () => {
            const wrapper = mount(ChatMessage, {
                props: {
                    content: 'Hello, how are you?',
                    role: 'user',
                },
            });

            expect(wrapper.text()).toContain('Hello, how are you?');
        });

        it('shows "You:" label prefix', () => {
            const wrapper = mount(ChatMessage, {
                props: {
                    content: 'Test message',
                    role: 'user',
                },
            });

            expect(wrapper.text()).toContain('You:');
        });

        it('does not render markdown for user messages', () => {
            const wrapper = mount(ChatMessage, {
                props: {
                    content: '**bold text**',
                    role: 'user',
                },
            });

            // Should show raw markdown, not rendered
            expect(wrapper.text()).toContain('**bold text**');
        });
    });

    describe('Assistant Message', () => {
        it('renders assistant message with markdown-body class', () => {
            const wrapper = mount(ChatMessage, {
                props: {
                    content: 'Hello world',
                    role: 'assistant',
                },
            });

            expect(wrapper.find('.markdown-body').exists()).toBe(true);
        });

        it('renders text content for assistant', () => {
            const wrapper = mount(ChatMessage, {
                props: {
                    content: 'Here is some text content',
                    role: 'assistant',
                },
            });

            expect(wrapper.text()).toContain('Here is some text content');
        });

        it('shows copy button for assistant messages with content', () => {
            const wrapper = mount(ChatMessage, {
                props: {
                    content: 'Some response',
                    role: 'assistant',
                },
            });

            const copyBtn = wrapper.find('.response-copy-btn');
            expect(copyBtn.exists()).toBe(true);
        });

        it('does not show copy button for empty assistant messages', () => {
            const wrapper = mount(ChatMessage, {
                props: {
                    content: '',
                    role: 'assistant',
                },
            });

            const copyBtn = wrapper.find('.response-copy-btn');
            expect(copyBtn.exists()).toBe(false);
        });

        it('clicking copy button copies content to clipboard', async () => {
            const content = 'Response to copy';
            const wrapper = mount(ChatMessage, {
                props: {
                    content,
                    role: 'assistant',
                },
            });

            const copyBtn = wrapper.find('.response-copy-btn');
            await copyBtn.trigger('click');

            expect(mockWriteText).toHaveBeenCalledWith(content);
        });

        it('shows "Copied" feedback after copying', async () => {
            const wrapper = mount(ChatMessage, {
                props: {
                    content: 'Response',
                    role: 'assistant',
                },
            });

            const copyBtn = wrapper.find('.response-copy-btn');
            await copyBtn.trigger('click');

            expect(wrapper.text()).toContain('Copied');
        });
    });
});
