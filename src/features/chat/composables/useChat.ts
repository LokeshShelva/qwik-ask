import { ref, computed } from 'vue';
import type { Message } from '../types/chat';
import type { HistoryMessage } from '../types/history';
import { streamChat } from '../services/gemini';
import * as historyDb from '../services/historyDb';

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const messages = ref<Message[]>([]);
const isStreaming = ref(false);
const streamError = ref<string | null>(null);
const currentAssistantMessage = ref<string>('');
const currentConversationId = ref<string | null>(null);

export function useChat() {
    const hasMessages = computed(() => messages.value.length > 0);
    const lastAssistantMessage = computed(() => {
        const assistantMessages = messages.value.filter((m) => m.role === 'assistant');
        return assistantMessages[assistantMessages.length - 1];
    });

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

            // Save conversation to database (don't await to keep UI snappy)
            historyDb.createConversation(convId, title).catch((e) => {
                console.error('Failed to create conversation:', e);
            });
        }

        // Add user message
        const userMessage: Message = {
            id: generateId(),
            role: 'user',
            content: trimmedContent,
            timestamp: Date.now(),
        };
        messages.value.push(userMessage);

        // Save user message to database
        if (currentConversationId.value) {
            historyDb.addMessage(userMessage.id, currentConversationId.value, 'user', trimmedContent).catch((e) => {
                console.error('Failed to save user message:', e);
            });
        }

        // Prepare assistant message placeholder
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
                // Update the last message in place
                const lastMsg = messages.value[messages.value.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content = currentAssistantMessage.value;
                }
            },
            onComplete: () => {
                isStreaming.value = false;

                // Save assistant message to database
                const lastMsg = messages.value[messages.value.length - 1];
                if (currentConversationId.value && lastMsg && lastMsg.role === 'assistant' && lastMsg.content) {
                    historyDb.addMessage(lastMsg.id, currentConversationId.value, 'assistant', lastMsg.content).catch((e) => {
                        console.error('Failed to save assistant message:', e);
                    });
                }
            },
            onError: (error) => {
                streamError.value = error;
                isStreaming.value = false;
                // Remove empty assistant message on error
                if (messages.value.length > 0) {
                    const lastMsg = messages.value[messages.value.length - 1];
                    if (lastMsg.role === 'assistant' && !lastMsg.content) {
                        messages.value.pop();
                    }
                }
            },
        }, systemPrompt);
    };

    const resetChat = () => {
        messages.value = [];
        isStreaming.value = false;
        streamError.value = null;
        currentAssistantMessage.value = '';
        currentConversationId.value = null;
    };

    /**
     * Load a previous conversation from history
     */
    const loadConversation = async (conversationId: string, historyMessages: HistoryMessage[]) => {
        resetChat();
        currentConversationId.value = conversationId;

        // Convert history messages to chat messages
        messages.value = historyMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.created_at,
        }));
    };

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
