/**
 * Tests for HistoryItem component.
 * 
 * Focus: Display of conversation info and user interactions.
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import HistoryItem from '../../components/HistoryItem.vue';

describe('HistoryItem', () => {
    const mockConversation = {
        id: 'conv-123',
        title: 'Test Conversation',
        created_at: Date.now() - 3600000, // 1 hour ago
        updated_at: Date.now() - 300000,  // 5 minutes ago
    };

    it('displays conversation title', () => {
        const wrapper = mount(HistoryItem, {
            props: {
                conversation: mockConversation,
            },
        });

        expect(wrapper.text()).toContain('Test Conversation');
    });

    it('displays relative time for recent conversations', () => {
        const wrapper = mount(HistoryItem, {
            props: {
                conversation: {
                    ...mockConversation,
                    updated_at: Date.now() - 300000, // 5 minutes ago
                },
            },
        });

        expect(wrapper.text()).toContain('5m ago');
    });

    it('displays hours for older conversations', () => {
        const wrapper = mount(HistoryItem, {
            props: {
                conversation: {
                    ...mockConversation,
                    updated_at: Date.now() - 7200000, // 2 hours ago
                },
            },
        });

        expect(wrapper.text()).toContain('2h ago');
    });

    it('displays "Just now" for very recent conversations', () => {
        const wrapper = mount(HistoryItem, {
            props: {
                conversation: {
                    ...mockConversation,
                    updated_at: Date.now() - 30000, // 30 seconds ago
                },
            },
        });

        expect(wrapper.text()).toContain('Just now');
    });

    it('emits select event when clicked', async () => {
        const wrapper = mount(HistoryItem, {
            props: {
                conversation: mockConversation,
            },
        });

        await wrapper.find('.history-item').trigger('click');

        expect(wrapper.emitted('select')).toBeTruthy();
        expect(wrapper.emitted('select')![0]).toEqual(['conv-123']);
    });

    it('emits delete event when delete button clicked', async () => {
        const wrapper = mount(HistoryItem, {
            props: {
                conversation: mockConversation,
            },
        });

        await wrapper.find('.history-item-delete').trigger('click');

        expect(wrapper.emitted('delete')).toBeTruthy();
        expect(wrapper.emitted('delete')![0]).toEqual(['conv-123']);
    });

    it('delete click does not trigger select', async () => {
        const wrapper = mount(HistoryItem, {
            props: {
                conversation: mockConversation,
            },
        });

        await wrapper.find('.history-item-delete').trigger('click');

        // Delete should emit, but not select (stopPropagation)
        expect(wrapper.emitted('delete')).toBeTruthy();
        expect(wrapper.emitted('select')).toBeFalsy();
    });

    it('active item has active class', () => {
        const wrapper = mount(HistoryItem, {
            props: {
                conversation: mockConversation,
                isActive: true,
            },
        });

        expect(wrapper.find('.history-item').classes()).toContain('active');
    });

    it('inactive item does not have active class', () => {
        const wrapper = mount(HistoryItem, {
            props: {
                conversation: mockConversation,
                isActive: false,
            },
        });

        expect(wrapper.find('.history-item').classes()).not.toContain('active');
    });
});
