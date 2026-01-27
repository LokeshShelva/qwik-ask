<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import SettingsIcon from '../components/icons/SettingsIcon.vue';
import HistoryIcon from '../components/icons/HistoryIcon.vue';
import ChatMessage from '../components/ChatMessage.vue';
import HistoryPanel from '../components/HistoryPanel.vue';
import { useChat } from '../composables/useChat';
import { useHistory } from '../composables/useHistory';
import { useSettings } from '../composables/useSettings';
import { useWindowResize } from '../composables/useWindowResize';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import { applyThemeFromSettings, setupSystemThemeListener } from '../composables/useTheme';
import * as historyDb from '../services/historyDb';

// Window resize composable
const { appWindow, updateSize, hide } = useWindowResize({
  minHeight: 110,
  maxHeight: 500,
  baseWidth: 680,
});

// Local refs
const inputQuery = ref('');
const inputEl = ref<HTMLTextAreaElement | null>(null);
const messagesContainer = ref<HTMLDivElement | null>(null);
const is_dev = ref<boolean>(false)

// Composables
const { settings, loadSettings } = useSettings();
const { messages, isStreaming, streamError, hasMessages, sendMessage, resetChat, loadConversation } = useChat();
const { historyOpen, openHistory, closeHistory } = useHistory();

// Computed states
const apiKeyMissing = computed(() => !settings.value?.llm?.api_key);
const isExpanded = computed(() => hasMessages.value || historyOpen.value);

// Listeners
let unlistenFocus: (() => void) | null = null;
let unlistenSystemTheme: (() => void) | null = null;

// --- Actions ---

const openSettings = async () => {
  await invoke('open_settings');
};

const toggleHistoryPanel = async () => {
  if (historyOpen.value) {
    closeHistory();
  } else {
    await openHistory();
  }
};

const handleNewChat = () => {
  resetChat();
  inputQuery.value = '';
  closeHistory();
  nextTick(() => {
    inputEl.value?.focus();
  });
};

const handleHistorySelect = async (conversationId: string) => {
  const historyMessages = await historyDb.getMessages(conversationId);
  await loadConversation(conversationId, historyMessages);
  closeHistory();
};

const handleHistoryClose = () => {
  closeHistory();
};

const handleSubmit = async () => {
  if (!inputQuery.value.trim() || isStreaming.value) return;

  const query = inputQuery.value;
  inputQuery.value = '';

  if (inputEl.value) {
    inputEl.value.style.height = 'auto';
  }

  await sendMessage(
    query,
    {
      provider: settings.value?.llm?.provider || 'gemini',
      apiKey: settings.value?.llm?.api_key || '',
      model: settings.value?.llm?.model || 'gemini-2.0-flash',
      baseUrl: settings.value?.llm?.base_url,
    },
    settings.value?.llm?.system_prompt
  );
};

const handleInputKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
};

const handleInput = () => {
  if (inputEl.value) {
    inputEl.value.style.height = 'auto';
    inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 120) + 'px';
  }
};

// --- Keyboard Shortcuts ---

useKeyboardShortcuts({
  shortcuts: [
    {
      key: 'Escape',
      handler: async () => {
        if (historyOpen.value) {
          closeHistory();
          return;
        }
        resetChat();
        inputQuery.value = '';
        await hide();
      },
      preventDefault: false,
    },
    {
      key: 'k',
      ctrl: true,
      handler: openSettings,
    },
    {
      key: 'h',
      ctrl: true,
      handler: toggleHistoryPanel,
    },
  ],
});

// --- Watchers ---

// Scroll to bottom when messages change
watch(
  () => messages.value[messages.value.length - 1]?.content,
  async () => {
    await nextTick();
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  }
);

// Window resize based on expanded state
watch([isExpanded, historyOpen], async () => {
  await updateSize(isExpanded.value);
}, { immediate: true });

// --- Lifecycle ---

onMounted(async () => {
  await loadSettings();

  try {
    const dev_env = await invoke("get_environment_variable", {envName: "QWIK_ASK_DEV"})
    is_dev.value = dev_env !== null;
  }catch {
    is_dev.value = false
  }

  if (settings.value) {
    applyThemeFromSettings(settings.value.general.theme);
    unlistenSystemTheme = setupSystemThemeListener(settings.value.general.theme) || null;
  }

  unlistenFocus = await appWindow.onFocusChanged(async ({ payload: focused }) => {
    if (focused && inputEl.value) {
      await loadSettings();
      if (settings.value) {
        applyThemeFromSettings(settings.value.general.theme);
      }
      inputEl.value.focus();
    } else {
      closeHistory();
      resetChat();
      inputQuery.value = '';
      await hide();
    }
  });
});

onUnmounted(() => {
  if (unlistenFocus) unlistenFocus();
  if (unlistenSystemTheme) unlistenSystemTheme();
});
</script>

<template>
  <div class="app-container">
    <!-- History Panel Overlay -->
    <Transition name="slide">
      <HistoryPanel
        v-if="historyOpen"
        class="history-overlay"
        @select="handleHistorySelect"
        @close="handleHistoryClose"
        @new-chat="handleNewChat"
      />
    </Transition>

    <!-- Main Launcher -->
    <main class="launcher" :class="{ 'with-history': historyOpen }">
      <!-- Top bar with input -->
      <header class="launcher-header">
        <button
          class="icon-btn"
          :class="{ active: historyOpen }"
          title="History (Ctrl+H)"
          @click="toggleHistoryPanel"
        >
          <HistoryIcon :size="18" />
        </button>

        <div class="input-wrapper">
          <textarea
            ref="inputEl"
            v-model="inputQuery"
            class="chat-input"
            placeholder="Ask AI..."
            rows="1"
            @keydown="handleInputKeydown"
            @input="handleInput"
          ></textarea>
        </div>

        <button class="icon-btn" title="Settings (Ctrl+K)" @click="openSettings">
          <SettingsIcon :size="18" />
        </button>
      </header>

      <!-- API Key Warning -->
      <div v-if="apiKeyMissing && !hasMessages" class="api-warning">
        <span>⚠️ API key not configured.</span>
        <button @click="openSettings" class="link-btn">Add in Settings</button>
      </div>

      <!-- Chat Area -->
      <section v-if="hasMessages" ref="messagesContainer" class="messages-area">
        <template v-for="message in messages" :key="message.id">
          <ChatMessage :content="message.content" :role="message.role" />
        </template>

        <!-- Streaming indicator -->
        <div v-if="isStreaming && messages[messages.length - 1]?.content === ''" class="streaming-indicator">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </section>

      <!-- Error display -->
      <div v-if="streamError" class="error-message">
        {{ streamError }}
      </div>

      <!-- Footer with keyboard hints -->
      <footer class="launcher-footer">
        <div class="footer-hints">
          <span class="hint"><kbd>ESC</kbd> Close</span>
          <span class="hint"><kbd>Ctrl</kbd> <kbd>H</kbd> History</span>
          <span class="hint"><kbd>Ctrl</kbd> <kbd>K</kbd> Settings</span>
        </div>
        <div v-if="is_dev" class="dev-note">
          dev
        </div>
      </footer>
    </main>
  </div>
</template>

<style>
@import '../styles/chat.css';

.app-container {
  display: flex;
  height: 100%;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
}

.history-overlay {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 20;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.3);
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

.launcher.with-history {
  flex: 1;
}

.icon-btn.active {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
</style>
