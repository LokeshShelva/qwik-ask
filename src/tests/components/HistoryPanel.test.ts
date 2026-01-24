/**
 * Tests for HistoryPanel component.
 * 
 * Focus: Panel display, search functionality, and conversation actions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref, computed } from 'vue';
import HistoryPanel from '../../components/HistoryPanel.vue';

// Mock useHistory composable
const mockConversations = ref([
    { id: '1', title: 'First Chat', created_at: Date.now(), updated_at: Date.now() },
    { id: '2', title: 'Second Chat', created_at: Date.now() - 86400000, updated_at: Date.now() - 86400000 },
]);
const mockLoading = ref(false);
const mockSearch = vi.fn();
const mockLoadConversation = vi.fn(() => Promise.resolve([]));
const mockDeleteConversation = vi.fn(() => Promise.resolve());

vi.mock('../../composables/useHistory', () => ({
    useHistory: () => ({
        groupedConversations: computed(() => ({
            today: mockConversations.value.filter(c => c.updated_at >= new Date().setHours(0, 0, 0, 0)),
            yesterday: [],
            lastWeek: [],
            older: mockConversations.value.filter(c => c.updated_at < new Date().setHours(0, 0, 0, 0)),
        })),
        loading: mockLoading,
        hasConversations: computed(() => mockConversations.value.length > 0),
        currentConversationId: ref(null),
        search: mockSearch,
        loadConversation: mockLoadConversation,
        deleteConversation: mockDeleteConversation,
    }),
}));

describe('HistoryPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConversations.value = [
            { id: '1', title: 'First Chat', created_at: Date.now(), updated_at: Date.now() },
            { id: '2', title: 'Second Chat', created_at: Date.now() - 86400000, updated_at: Date.now() - 86400000 },
        ];
        mockLoading.value = false;
    });

    describe('Display', () => {
        it('shows "History" title', () => {
            const wrapper = mount(HistoryPanel);
            expect(wrapper.text()).toContain('History');
        });

        it('shows search input', () => {
            const wrapper = mount(HistoryPanel);
            expect(wrapper.find('.search-input').exists()).toBe(true);
        });

        it('shows "New Chat" button', () => {
            const wrapper = mount(HistoryPanel);
            expect(wrapper.text()).toContain('New Chat');
        });

        it('shows close button', () => {
            const wrapper = mount(HistoryPanel);
            expect(wrapper.find('.history-close').exists()).toBe(true);
        });

        it('shows empty state when no conversations', () => {
            mockConversations.value = [];
            const wrapper = mount(HistoryPanel);
            expect(wrapper.text()).toContain('No conversations yet');
        });

        it('shows loading state while fetching', () => {
            mockLoading.value = true;
            const wrapper = mount(HistoryPanel);
            expect(wrapper.text()).toContain('Loading');
        });

        it('groups conversations by time period', () => {
            const wrapper = mount(HistoryPanel);
            expect(wrapper.text()).toContain('Today');
        });
    });

    describe('Actions', () => {
        it('emits close event when close button clicked', async () => {
            const wrapper = mount(HistoryPanel);
            await wrapper.find('.history-close').trigger('click');
            expect(wrapper.emitted('close')).toBeTruthy();
        });

        it('emits new-chat event when New Chat clicked', async () => {
            const wrapper = mount(HistoryPanel);
            await wrapper.find('.new-chat-btn').trigger('click');
            expect(wrapper.emitted('new-chat')).toBeTruthy();
        });

        it('emits select event when conversation selected', async () => {
            const wrapper = mount(HistoryPanel);

            // Find and click a history item
            const item = wrapper.find('.history-item');
            await item.trigger('click');
            await flushPromises();

            expect(wrapper.emitted('select')).toBeTruthy();
        });
    });

    describe('Search', () => {
        it('calls search when typing in input', async () => {
            vi.useFakeTimers();
            const wrapper = mount(HistoryPanel);

            const input = wrapper.find('.search-input');
            await input.setValue('test query');

            // Wait for debounce
            vi.advanceTimersByTime(250);
            await flushPromises();

            expect(mockSearch).toHaveBeenCalledWith('test query');
            vi.useRealTimers();
        });

        it('debounces search to avoid excessive calls', async () => {
            vi.useFakeTimers();
            const wrapper = mount(HistoryPanel);

            const input = wrapper.find('.search-input');

            // Type quickly
            await input.setValue('t');
            await input.setValue('te');
            await input.setValue('tes');
            await input.setValue('test');

            // Before debounce timeout
            vi.advanceTimersByTime(100);
            expect(mockSearch).not.toHaveBeenCalled();

            // After debounce timeout
            vi.advanceTimersByTime(150);
            await flushPromises();

            // Should only be called once with final value
            expect(mockSearch).toHaveBeenCalledTimes(1);
            expect(mockSearch).toHaveBeenCalledWith('test');

            vi.useRealTimers();
        });
    });
});
