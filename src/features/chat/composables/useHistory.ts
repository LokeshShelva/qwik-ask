// Composable for managing chat history state and operations

import { ref, computed } from 'vue';
import * as historyDb from '../services/historyDb';
import type { Conversation, HistoryMessage, GroupedHistory } from '../types/history';

// Shared state
const historyOpen = ref(false);
const conversations = ref<Conversation[]>([]);
const searchQuery = ref('');
const loading = ref(false);
const currentConversationId = ref<string | null>(null);

export function useHistory() {
    /**
     * Group conversations by time period
     */
    const groupedConversations = computed<GroupedHistory>(() => {
        const todayStart = new Date().setHours(0, 0, 0, 0);
        const yesterdayStart = todayStart - 86400000;
        const weekStart = todayStart - 7 * 86400000;

        const list = conversations.value;
        return {
            today: list.filter((c) => c.updated_at >= todayStart),
            yesterday: list.filter((c) => c.updated_at >= yesterdayStart && c.updated_at < todayStart),
            lastWeek: list.filter((c) => c.updated_at >= weekStart && c.updated_at < yesterdayStart),
            older: list.filter((c) => c.updated_at < weekStart),
        };
    });

    /**
     * Check if there are any conversations
     */
    const hasConversations = computed(() => conversations.value.length > 0);

    /**
     * Open history panel and load conversations
     */
    const openHistory = async () => {
        historyOpen.value = true;
        await loadConversations();
    };

    /**
     * Close history panel
     */
    const closeHistory = () => {
        historyOpen.value = false;
        searchQuery.value = '';
    };

    /**
     * Toggle history panel
     */
    const toggleHistory = async () => {
        if (historyOpen.value) {
            closeHistory();
        } else {
            await openHistory();
        }
    };

    /**
     * Load all conversations from database
     */
    const loadConversations = async () => {
        loading.value = true;
        try {
            conversations.value = await historyDb.getConversations();
        } catch (e) {
            console.error('Failed to load conversations:', e);
        } finally {
            loading.value = false;
        }
    };

    /**
     * Search conversations by title
     */
    const search = async (query: string) => {
        searchQuery.value = query;
        if (!query.trim()) {
            await loadConversations();
            return;
        }
        loading.value = true;
        try {
            conversations.value = await historyDb.searchConversations(query);
        } catch (e) {
            console.error('Failed to search conversations:', e);
        } finally {
            loading.value = false;
        }
    };

    /**
     * Load messages for a specific conversation
     */
    const loadConversation = async (id: string): Promise<HistoryMessage[]> => {
        try {
            return await historyDb.getMessages(id);
        } catch (e) {
            console.error('Failed to load conversation:', e);
            return [];
        }
    };

    /**
     * Delete a conversation
     */
    const deleteConversation = async (id: string) => {
        try {
            await historyDb.deleteConversation(id);
            // Remove from local state
            conversations.value = conversations.value.filter((c) => c.id !== id);
            // If we deleted the current conversation, reset it
            if (currentConversationId.value === id) {
                currentConversationId.value = null;
            }
        } catch (e) {
            console.error('Failed to delete conversation:', e);
        }
    };

    /**
     * Start a new conversation (resets current ID)
     */
    const startNewConversation = () => {
        currentConversationId.value = null;
    };

    /**
     * Set the current conversation ID
     */
    const setCurrentConversation = (id: string | null) => {
        currentConversationId.value = id;
    };

    /**
     * Create a new conversation in the database
     */
    const createConversation = async (id: string, title: string) => {
        await historyDb.createConversation(id, title);
        currentConversationId.value = id;
    };

    /**
     * Save a message to the current conversation
     */
    const saveMessage = async (id: string, role: string, content: string) => {
        if (!currentConversationId.value) return;
        await historyDb.addMessage(id, currentConversationId.value, role, content);
    };

    return {
        // State
        historyOpen,
        conversations,
        groupedConversations,
        searchQuery,
        loading,
        hasConversations,
        currentConversationId,
        // Actions
        openHistory,
        closeHistory,
        toggleHistory,
        loadConversations,
        search,
        loadConversation,
        deleteConversation,
        startNewConversation,
        setCurrentConversation,
        createConversation,
        saveMessage,
    };
}
