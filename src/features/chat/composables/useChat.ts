import { ref, computed } from 'vue';
import type { Message } from '../types/chat';
import { streamChat } from '../services/gemini';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const messages = ref<Message[]>([]);
const isStreaming = ref(false);
const streamError = ref<string | null>(null);
const currentAssistantMessage = ref<string>('');

export function useChat() {
  const hasMessages = computed(() => messages.value.length > 0);
  const lastAssistantMessage = computed(() => {
    const assistantMessages = messages.value.filter((m) => m.role === 'assistant');
    return assistantMessages[assistantMessages.length - 1];
  });

  const sendMessage = async (content: string, apiKey: string, systemPrompt?: string) => {
    if (!content.trim() || isStreaming.value) return;

    streamError.value = null;

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };
    messages.value.push(userMessage);

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
    sendMessage,
    resetChat,
    copyLastResponse,
  };
}
