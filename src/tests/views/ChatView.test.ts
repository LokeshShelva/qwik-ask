/**
 * Tests for ChatView component.
 * 
 * Focus: Core chat functionality - input, messages, shortcuts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref, computed, nextTick } from 'vue';
import ChatView from '../../views/ChatView.vue';

// Mock composables
const mockMessages = ref<any[]>([]);
const mockIsStreaming = ref(false);
const mockStreamError = ref<string | null>(null);
const mockSendMessage = vi.fn();
const mockResetChat = vi.fn();
const mockHistoryOpen = ref(false);
const mockSettings = ref({
    llm: { api_key: 'test-key', system_prompt: 'test prompt' },
    general: { theme: 'dark' },
});

vi.mock('../../composables/useChat', () => ({
    useChat: () => ({
        messages: mockMessages,
        isStreaming: mockIsStreaming,
        streamError: mockStreamError,
        hasMessages: computed(() => mockMessages.value.length > 0),
        sendMessage: mockSendMessage,
        resetChat: mockResetChat,
        loadConversation: vi.fn(),
    }),
}));

vi.mock('../../composables/useHistory', () => ({
    useHistory: () => ({
        historyOpen: mockHistoryOpen,
        openHistory: vi.fn(() => { mockHistoryOpen.value = true; }),
        closeHistory: vi.fn(() => { mockHistoryOpen.value = false; }),
    }),
}));

vi.mock('../../composables/useSettings', () => ({
    useSettings: () => ({
        settings: mockSettings,
        loadSettings: vi.fn(),
    }),
}));

vi.mock('../../composables/useWindowResize', () => ({
    useWindowResize: () => ({
        appWindow: {
            onFocusChanged: vi.fn(() => Promise.resolve(() => { })),
        },
        updateSize: vi.fn(),
        hide: vi.fn(),
    }),
}));

vi.mock('../../composables/useTheme', () => ({
    applyThemeFromSettings: vi.fn(),
    setupSystemThemeListener: vi.fn(),
}));

vi.mock('../../services/historyDb', () => ({
    getMessages: vi.fn(() => Promise.resolve([])),
}));

describe('ChatView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockMessages.value = [];
        mockIsStreaming.value = false;
        mockStreamError.value = null;
        mockHistoryOpen.value = false;
        mockSettings.value = {
            llm: { api_key: 'test-key', system_prompt: 'test prompt' },
            general: { theme: 'dark' },
        };
    });

    describe('Input', () => {
        it('renders input field', () => {
            const wrapper = mount(ChatView);
            expect(wrapper.find('.chat-input').exists()).toBe(true);
        });

        it('allows typing in input field', async () => {
            const wrapper = mount(ChatView);
            const input = wrapper.find('.chat-input');

            await input.setValue('Hello');

            expect((input.element as HTMLTextAreaElement).value).toBe('Hello');
        });

        it('clears input after sending message', async () => {
            const wrapper = mount(ChatView);
            const input = wrapper.find('.chat-input');

            await input.setValue('Test message');
            await input.trigger('keydown', { key: 'Enter' });
            await flushPromises();

            expect((input.element as HTMLTextAreaElement).value).toBe('');
        });

        it('does not send empty messages', async () => {
            const wrapper = mount(ChatView);
            const input = wrapper.find('.chat-input');

            await input.setValue('   ');
            await input.trigger('keydown', { key: 'Enter' });

            expect(mockSendMessage).not.toHaveBeenCalled();
        });

        it('Shift+Enter does not submit', async () => {
            const wrapper = mount(ChatView);
            const input = wrapper.find('.chat-input');

            await input.setValue('Test');
            await input.trigger('keydown', { key: 'Enter', shiftKey: true });

            expect(mockSendMessage).not.toHaveBeenCalled();
        });
    });

    describe('API Key Warning', () => {
        it('shows warning when API key is missing', async () => {
            mockSettings.value = {
                llm: { api_key: '', system_prompt: '' },
                general: { theme: 'dark' },
            };

            const wrapper = mount(ChatView);

            expect(wrapper.text()).toContain('API key not configured');
        });

        it('hides warning when API key is set', () => {
            mockSettings.value = {
                llm: { api_key: 'valid-key', system_prompt: '' },
                general: { theme: 'dark' },
            };

            const wrapper = mount(ChatView);

            expect(wrapper.text()).not.toContain('API key not configured');
        });
    });

    describe('Messages', () => {
        it('shows messages when present', async () => {
            mockMessages.value = [
                { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
            ];

            const wrapper = mount(ChatView);
            await nextTick();

            expect(wrapper.find('.messages-area').exists()).toBe(true);
        });

        it('hides messages area when empty', () => {
            mockMessages.value = [];

            const wrapper = mount(ChatView);

            expect(wrapper.find('.messages-area').exists()).toBe(false);
        });
    });

    describe('Error Display', () => {
        it('shows error message when stream fails', async () => {
            mockStreamError.value = 'API Error: Invalid key';

            const wrapper = mount(ChatView);

            expect(wrapper.text()).toContain('API Error: Invalid key');
        });
    });

    describe('UI Elements', () => {
        it('shows history button', () => {
            const wrapper = mount(ChatView);
            expect(wrapper.find('[title*="History"]').exists()).toBe(true);
        });

        it('shows settings button', () => {
            const wrapper = mount(ChatView);
            expect(wrapper.find('[title*="Settings"]').exists()).toBe(true);
        });

        it('shows keyboard hints in footer', () => {
            const wrapper = mount(ChatView);
            expect(wrapper.text()).toContain('ESC');
            expect(wrapper.text()).toContain('History');
            expect(wrapper.text()).toContain('Settings');
        });
    });
});
