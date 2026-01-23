<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import SettingsIcon from './components/SettingsIcon.vue';
import HistoryIcon from './components/HistoryIcon.vue';
import CopyIcon from './components/CopyIcon.vue';
import CheckIcon from './components/CheckIcon.vue';
import ChatMessage from './components/ChatMessage.vue';
import { useChat } from './composables/useChat';
import { useSettings } from './composables/useSettings';
import { applyThemeFromSettings, setupSystemThemeListener } from './composables/useTheme';

const appWindow = getCurrentWindow();
const inputQuery = ref('');
const inputEl = ref<HTMLTextAreaElement | null>(null);
const messagesContainer = ref<HTMLDivElement | null>(null);
const copied = ref(false);

const { settings, loadSettings } = useSettings();
const { messages, isStreaming, streamError, hasMessages, sendMessage, resetChat, copyLastResponse } = useChat();

// Computed for API key missing state
const apiKeyMissing = computed(() => !settings.value?.llm?.api_key);

let unlistenFocus: (() => void) | null = null;
let unlistenSystemTheme: (() => void) | null = null;
let isAnimating = false;

const MIN_HEIGHT = 80;
const MAX_HEIGHT = 500;
const ANIMATION_DURATION = 250; // ms

// Animated window resize function
const animateResize = async (targetHeight: number) => {
  if (isAnimating) return;
  
  try {
    const currentSize = await appWindow.innerSize();
    const startHeight = currentSize.height;
    
    if (startHeight === targetHeight) return;
    
    isAnimating = true;
    const startTime = performance.now();
    const heightDiff = targetHeight - startHeight;
    
    const animate = async (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const newHeight = Math.round(startHeight + heightDiff * eased);
      
      await appWindow.setSize(new LogicalSize(680, newHeight));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Final position and center
        await appWindow.setSize(new LogicalSize(680, targetHeight));
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

// Window resize function (instant for collapse, animated for expand)
const resizeWindow = async (expanded: boolean) => {
  if (expanded) {
    await animateResize(MAX_HEIGHT);
  } else {
    // Instant collapse for snappy feel
    try {
      await appWindow.setSize(new LogicalSize(680, MIN_HEIGHT));
      await appWindow.center();
    } catch (e) {
      console.error('Failed to resize window:', e);
    }
  }
};

const openSettings = async () => {
  await invoke('open_settings');
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
    resetChat();
    inputQuery.value = '';
    await appWindow.hide();
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

// Copy response handler
const handleCopy = async () => {
  const success = await copyLastResponse();
  if (success) {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
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

// Window resize based on content
watch(hasMessages, async (has) => {
  await resizeWindow(has);
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
  <main class="launcher">
    <!-- Top bar with input -->
    <header class="launcher-header">
      <button class="icon-btn" title="History">
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
      
      <button class="icon-btn" title="Settings" @click="openSettings">
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
    
    <!-- Footer with actions -->
    <footer v-if="hasMessages" class="launcher-footer">
      <div class="footer-hints">
        <span class="hint"><kbd>ESC</kbd> Close</span>
        <span class="hint"><kbd>⌘</kbd> <kbd>K</kbd> Settings</span>
      </div>
    </footer>
  </main>
</template>

<style>
@import './styles.css';
</style>
