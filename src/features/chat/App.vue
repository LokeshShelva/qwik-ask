<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import SettingsIcon from '../../shared/components/icons/SettingsIcon.vue';
import HistoryIcon from '../../shared/components/icons/HistoryIcon.vue';
import ChatMessage from './ChatMessage.vue';
import HistoryPanel from './HistoryPanel.vue';
import { useChat } from './composables/useChat';
import { useHistory } from './composables/useHistory';
import { useSettings } from '../settings/composables/useSettings';
import { applyThemeFromSettings, setupSystemThemeListener } from '../../shared/composables/useTheme';
import * as historyDb from './services/historyDb';

const appWindow = getCurrentWindow();
const inputQuery = ref('');
const inputEl = ref<HTMLTextAreaElement | null>(null);
const messagesContainer = ref<HTMLDivElement | null>(null);

const { settings, loadSettings } = useSettings();
const { messages, isStreaming, streamError, hasMessages, sendMessage, resetChat, loadConversation } = useChat();
const { historyOpen, openHistory, closeHistory } = useHistory();

// Computed for API key missing state
const apiKeyMissing = computed(() => !settings.value?.llm?.api_key);

// Computed for expanded state (either has messages or history is open)
const isExpanded = computed(() => hasMessages.value || historyOpen.value);

let unlistenFocus: (() => void) | null = null;
let unlistenSystemTheme: (() => void) | null = null;
let isAnimating = false;

const MIN_HEIGHT = 110;
const MAX_HEIGHT = 500;
const BASE_WIDTH = 680;
const ANIMATION_DURATION = 250; // ms

// Animated window resize function
const animateResize = async (targetWidth: number, targetHeight: number) => {
  if (isAnimating) return;
  
  try {
    const currentSize = await appWindow.innerSize();
    const startWidth = currentSize.width;
    const startHeight = currentSize.height;
    
    if (startWidth === targetWidth && startHeight === targetHeight) return;
    
    isAnimating = true;
    const startTime = performance.now();
    const widthDiff = targetWidth - startWidth;
    const heightDiff = targetHeight - startHeight;
    
    const animate = async (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const newWidth = Math.round(startWidth + widthDiff * eased);
      const newHeight = Math.round(startHeight + heightDiff * eased);
      
      await appWindow.setSize(new LogicalSize(newWidth, newHeight));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Final position and center
        await appWindow.setSize(new LogicalSize(targetWidth, targetHeight));
        await appWindow.center();
        isAnimating = false;
      }
    };
    
    requestAnimationFrame(animate);
  } catch (e) {
    console.error('Failed to animate resize:', e);
    isAnimating = false;
  }
};

// Window resize based on state
const updateWindowSize = async () => {
  const expanded = isExpanded.value;
  const showHistory = historyOpen.value;
  
  const targetWidth = BASE_WIDTH;
  const targetHeight = expanded ? MAX_HEIGHT : MIN_HEIGHT;
  
  if (expanded || showHistory) {
    await animateResize(targetWidth, targetHeight);
  } else {
    // Instant collapse for snappy feel
    try {
      await appWindow.setSize(new LogicalSize(targetWidth, targetHeight));
      await appWindow.center();
    } catch (e) {
      console.error('Failed to resize window:', e);
    }
  }
};

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
  // Focus input after closing history
  nextTick(() => {
    if (inputEl.value) {
      inputEl.value.focus();
    }
  });
};

const handleHistorySelect = async (conversationId: string) => {
  // Load the conversation messages
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
  
  // Reset textarea height
  if (inputEl.value) {
    inputEl.value.style.height = 'auto';
  }
  
  await sendMessage(
    query, 
    settings.value?.llm?.api_key || '',
    settings.value?.llm?.system_prompt
  );
};

const handleKeydown = async (e: KeyboardEvent) => {
  // Global escape handler
  if (e.key === 'Escape') {
    if (historyOpen.value) {
      closeHistory();
      return;
    }
    resetChat();
    inputQuery.value = '';
    await appWindow.hide();
    return;
  }
  
  // Ctrl+K to open settings (Windows)
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    await openSettings();
    return;
  }
  
  // Ctrl+H to toggle history
  if (e.ctrlKey && e.key === 'h') {
    e.preventDefault();
    await toggleHistoryPanel();
    return;
  }
};

const handleInputKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
};

// Auto-resize textarea
const handleInput = () => {
  if (inputEl.value) {
    inputEl.value.style.height = 'auto';
    inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 120) + 'px';
  }
};

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

// Window resize based on expanded state and history
watch([isExpanded, historyOpen], async () => {
  await updateWindowSize();
}, { immediate: true });

onMounted(async () => {
  await loadSettings();
  
  // Apply theme from settings and setup system theme listener
  if (settings.value) {
    applyThemeFromSettings(settings.value.general.theme);
    unlistenSystemTheme = setupSystemThemeListener(settings.value.general.theme) || null;
  }
  
  document.addEventListener('keydown', handleKeydown);
  
  unlistenFocus = await appWindow.onFocusChanged(async ({ payload: focused }) => {
    if (focused && inputEl.value) {
      // Reload settings when window gains focus to pick up theme changes from settings window
      await loadSettings();
      if (settings.value) {
        applyThemeFromSettings(settings.value.general.theme);
      }
      inputEl.value.focus();
    } else {
      // Close history and reset on blur
      closeHistory();
      resetChat();
      inputQuery.value = '';
      await appWindow.hide();
    }
  });
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  if (unlistenFocus) unlistenFocus();
  if (unlistenSystemTheme) unlistenSystemTheme();
});
</script>

<template>
  <div class="app-container">
    <!-- History Panel -->
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
            :disabled="false"
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
      
      <!-- Footer with actions - always visible -->
      <footer class="launcher-footer">
        <div class="footer-hints">
          <span class="hint"><kbd>ESC</kbd> Close</span>
          <span class="hint"><kbd>Ctrl</kbd> <kbd>H</kbd> History</span>
          <span class="hint"><kbd>Ctrl</kbd> <kbd>K</kbd> Settings</span>
        </div>
      </footer>
    </main>
  </div>
</template>

<style>
@import './styles.css';

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
