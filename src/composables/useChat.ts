/**
 * @fileoverview Chat composable for managing conversation state and LLM interactions.
 * 
 * This composable handles the core chat functionality including:
 * - Message state management (user and assistant messages)
 * - Streaming responses from the LLM
 * - Automatic conversation persistence to SQLite
 * - Auto-generated conversation titles
 * 
 * @example Basic usage
 * ```typescript
 * const { messages, sendMessage, resetChat } = useChat();
 * 
 * // Send a message
 * await sendMessage('Hello!', apiKey, systemPrompt);
 * 
 * // Access messages
 * console.log(messages.value);
 * 
 * // Reset for new chat
 * resetChat();
 * ```
 * 
 * @module composables/useChat
 */

import { ref, computed } from 'vue';
import type { Message } from '../types/chat';
import type { HistoryMessage } from '../types/history';
import { streamChat, generateTitle } from '../services/gemini';
import * as historyDb from '../services/historyDb';

/**
 * Generates a unique ID combining timestamp and random string.
 * Format: `{timestamp}-{random9chars}`
 * 
 * @returns Unique identifier string
 * @internal
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// SHARED STATE
// ============================================================================
// These refs are defined outside the composable function to share state
// across all component instances that use useChat(). This is intentional -
// we want a single chat session shared across the app.
// ============================================================================

/** Current conversation messages */
const messages = ref<Message[]>([]);

/** Whether the LLM is currently streaming a response */
const isStreaming = ref(false);

/** Error message from the last failed stream, null if no error */
const streamError = ref<string | null>(null);

/** Buffer for the current assistant message being streamed */
const currentAssistantMessage = ref<string>('');

/** ID of the current conversation, null if new/unsaved */
const currentConversationId = ref<string | null>(null);

/**
 * Composable for managing chat state and LLM interactions.
 * 
 * **State is shared globally** - all components using this composable
 * share the same messages array. This is intentional for a single-chat app.
 * 
 * @returns Chat state and methods
 * 
 * @example Loading a previous conversation
 * ```typescript
 * const { loadConversation, messages } = useChat();
 * const historyMessages = await historyDb.getMessages(conversationId);
 * await loadConversation(conversationId, historyMessages);
 * // messages.value now contains the loaded conversation
 * ```
 */
export function useChat() {
    /** Whether there are any messages in the current conversation */
    const hasMessages = computed(() => messages.value.length > 0);

    /** The most recent assistant message, useful for copy operations */
    const lastAssistantMessage = computed(() => {
        const assistantMessages = messages.value.filter((m) => m.role === 'assistant');
        return assistantMessages[assistantMessages.length - 1];
    });

    /**
     * Send a message to the LLM and stream the response.
     * 
     * **Quirks:**
     * - Creates a new conversation in DB on first message (fire-and-forget, doesn't block UI)
     * - Auto-generates title after first assistant response using a separate LLM call
     * - Empty assistant messages are removed on error
     * - Ignores calls if already streaming or content is empty
     * 
     * @param content - User message content
     * @param apiKey - Gemini API key
     * @param systemPrompt - Optional system prompt to customize LLM behavior
     * 
     * @example
     * ```typescript
     * await sendMessage(
     *   'Explain quantum computing',
     *   'your-api-key',
     *   'You are a physics teacher. Keep explanations simple.'
     * );
     * ```
     */
    const sendMessage = async (content: string, apiKey: string, systemPrompt?: string) => {
        if (!content.trim() || isStreaming.value) return;

        streamError.value = null;
        const trimmedContent = content.trim();

        // Create new conversation on first message
        const isFirstMessage = messages.value.length === 0;
        if (isFirstMessage) {
            const convId = generateId();
            const title = trimmedContent.substring(0, 50);
            currentConversationId.value = convId;

            historyDb.createConversation(convId, title).catch((e) => {
                console.error('Failed to create conversation:', e);
            });
        }

        const userMessage: Message = {
            id: generateId(),
            role: 'user',
            content: trimmedContent,
            timestamp: Date.now(),
        };
        messages.value.push(userMessage);

        if (currentConversationId.value) {
            historyDb.addMessage(userMessage.id, currentConversationId.value, 'user', trimmedContent).catch((e) => {
                console.error('Failed to save user message:', e);
            });
        }

        const assistantMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
        };
        messages.value.push(assistantMessage);
        currentAssistantMessage.value = '';

        isStreaming.value = true;

        await streamChat(apiKey, messages.value.slice(0, -1), {
            onToken: (token) => {
                currentAssistantMessage.value += token;
                const lastMsg = messages.value[messages.value.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content = currentAssistantMessage.value;
                }
            },
            onComplete: () => {
                isStreaming.value = false;

                // Persist assistant message
                const lastMsg = messages.value[messages.value.length - 1];
                if (currentConversationId.value && lastMsg && lastMsg.role === 'assistant' && lastMsg.content) {
                    historyDb.addMessage(lastMsg.id, currentConversationId.value, 'assistant', lastMsg.content).catch((e) => {
                        console.error('Failed to save assistant message:', e);
                    });

                    // Auto-generate title after first exchange
                    if (isFirstMessage && messages.value.length === 2) {
                        const userContent = messages.value[0].content;
                        const assistantContent = lastMsg.content;
                        const convId = currentConversationId.value;

                        generateTitle(apiKey, userContent, assistantContent).then((title) => {
                            if (title && convId) {
                                historyDb.updateConversationTitle(convId, title).catch(console.error);
                            }
                        });
                    }
                }
            },
            onError: (error) => {
                streamError.value = error;
                isStreaming.value = false;
                // Clean up empty assistant message on error
                if (messages.value.length > 0) {
                    const lastMsg = messages.value[messages.value.length - 1];
                    if (lastMsg.role === 'assistant' && !lastMsg.content) {
                        messages.value.pop();
                    }
                }
            },
        }, systemPrompt);
    };

    /**
     * Reset all chat state for a new conversation.
     * Clears messages, errors, and conversation ID.
     */
    const resetChat = () => {
        messages.value = [];
        isStreaming.value = false;
        streamError.value = null;
        currentAssistantMessage.value = '';
        currentConversationId.value = null;
    };

    /**
     * Load a previous conversation from history.
     * Replaces current messages with the loaded conversation.
     * 
     * @param conversationId - The conversation ID to associate with
     * @param historyMessages - Messages fetched from historyDb.getMessages()
     * 
     * @example
     * ```typescript
     * const messages = await historyDb.getMessages('conv-123');
     * await loadConversation('conv-123', messages);
     * ```
     */
    const loadConversation = async (conversationId: string, historyMessages: HistoryMessage[]) => {
        resetChat();
        currentConversationId.value = conversationId;

        messages.value = historyMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.created_at,
        }));
    };

    /**
     * Copy the last assistant response to clipboard.
     * 
     * @returns true if copied successfully, false otherwise
     */
    const copyLastResponse = async (): Promise<boolean> => {
        const lastAssistant = lastAssistantMessage.value;
        if (!lastAssistant?.content) return false;

        try {
            await navigator.clipboard.writeText(lastAssistant.content);
            return true;
        } catch {
            return false;
        }
    };

    return {
        messages,
        isStreaming,
        streamError,
        hasMessages,
        lastAssistantMessage,
        currentConversationId,
        sendMessage,
        resetChat,
        loadConversation,
        copyLastResponse,
    };
}
