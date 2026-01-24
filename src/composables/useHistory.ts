/**
 * @fileoverview History composable for managing chat history panel and conversations.
 * 
 * This composable manages:
 * - History panel open/close state
 * - Loading and searching conversations from SQLite
 * - Grouping conversations by time period (today, yesterday, etc.)
 * - CRUD operations for conversations
 * 
 * @example Basic usage
 * ```typescript
 * const { historyOpen, openHistory, groupedConversations } = useHistory();
 * 
 * // Open panel and load conversations
 * await openHistory();
 * 
 * // Access grouped conversations
 * console.log(groupedConversations.value.today);
 * ```
 * 
 * @module composables/useHistory
 */

import { ref, computed } from 'vue';
import * as historyDb from '../services/historyDb';
import type { Conversation, HistoryMessage, GroupedHistory } from '../types/history';

// ============================================================================
// SHARED STATE
// ============================================================================
// State is shared across all component instances using this composable.
// This enables the history panel state to be accessed from anywhere.
// ============================================================================

/** Whether the history panel is currently open */
const historyOpen = ref(false);

/** All loaded conversations */
const conversations = ref<Conversation[]>([]);

/** Current search query */
const searchQuery = ref('');

/** Loading state for async operations */
const loading = ref(false);

/** Currently selected conversation ID */
const currentConversationId = ref<string | null>(null);

/**
 * Composable for managing chat history state and operations.
 * 
 * **State is shared globally** - the history panel state persists across components.
 * 
 * @returns History state and methods
 */
export function useHistory() {
    /**
     * Conversations grouped by time period for display.
     * 
     * Groups:
     * - `today`: Updated today
     * - `yesterday`: Updated yesterday
     * - `lastWeek`: Updated in the last 7 days (excluding today/yesterday)
     * - `older`: Everything else
     * 
     * **Quirk:** Uses `updated_at` timestamp, not `created_at`. A conversation
     * created last week but messaged today appears in "Today".
     */
    const groupedConversations = computed<GroupedHistory>(() => {
        const todayStart = new Date().setHours(0, 0, 0, 0);
        const yesterdayStart = todayStart - 86400000; // 24 hours in ms
        const weekStart = todayStart - 7 * 86400000;

        const list = conversations.value;
        return {
            today: list.filter((c) => c.updated_at >= todayStart),
            yesterday: list.filter((c) => c.updated_at >= yesterdayStart && c.updated_at < todayStart),
            lastWeek: list.filter((c) => c.updated_at >= weekStart && c.updated_at < yesterdayStart),
            older: list.filter((c) => c.updated_at < weekStart),
        };
    });

    /** Whether there are any conversations loaded */
    const hasConversations = computed(() => conversations.value.length > 0);

    /**
     * Open the history panel and load conversations from DB.
     * Always reloads conversations when opened to ensure fresh data.
     */
    const openHistory = async () => {
        historyOpen.value = true;
        await loadConversations();
    };

    /**
     * Close the history panel and clear search query.
     */
    const closeHistory = () => {
        historyOpen.value = false;
        searchQuery.value = '';
    };

    /**
     * Toggle the history panel open/closed.
     */
    const toggleHistory = async () => {
        if (historyOpen.value) {
            closeHistory();
        } else {
            await openHistory();
        }
    };

    /**
     * Load all conversations from database.
     * Results are ordered by most recently updated.
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
     * Search conversations by title.
     * 
     * **Quirk:** Empty/whitespace-only query reloads all conversations
     * instead of returning empty results.
     * 
     * @param query - Search string (matches partial title)
     * 
     * @example
     * ```typescript
     * // Search for conversations about TypeScript
     * await search('typescript');
     * console.log(conversations.value); // Filtered results
     * 
     * // Clear search
     * await search(''); // Reloads all conversations
     * ```
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
     * Load all messages for a specific conversation.
     * 
     * @param id - Conversation ID
     * @returns Array of messages, empty array on error
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
     * Delete a conversation from database and local state.
     * 
     * **Quirk:** If deleting the currently selected conversation,
     * `currentConversationId` is reset to null.
     * 
     * @param id - Conversation ID to delete
     */
    const deleteConversation = async (id: string) => {
        try {
            await historyDb.deleteConversation(id);
            conversations.value = conversations.value.filter((c) => c.id !== id);
            if (currentConversationId.value === id) {
                currentConversationId.value = null;
            }
        } catch (e) {
            console.error('Failed to delete conversation:', e);
        }
    };

    /**
     * Reset current conversation ID for starting a new chat.
     */
    const startNewConversation = () => {
        currentConversationId.value = null;
    };

    /**
     * Set the current conversation ID.
     * 
     * @param id - Conversation ID or null
     */
    const setCurrentConversation = (id: string | null) => {
        currentConversationId.value = id;
    };

    /**
     * Create a new conversation in the database.
     * Also sets it as the current conversation.
     * 
     * @param id - Unique ID for the conversation
     * @param title - Initial title (often first message truncated)
     */
    const createConversation = async (id: string, title: string) => {
        await historyDb.createConversation(id, title);
        currentConversationId.value = id;
    };

    /**
     * Save a message to the current conversation.
     * No-op if no current conversation is set.
     * 
     * @param id - Unique message ID
     * @param role - 'user' or 'assistant'
     * @param content - Message content
     */
    const saveMessage = async (id: string, role: string, content: string) => {
        if (!currentConversationId.value) return;
        await historyDb.addMessage(id, currentConversationId.value, role, content);
    };

    return {
        historyOpen,
        conversations,
        groupedConversations,
        searchQuery,
        loading,
        hasConversations,
        currentConversationId,
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
