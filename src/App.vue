<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import SettingsIcon from './components/SettingsIcon.vue';

const appWindow = getCurrentWindow();
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

let unlistenFocus: (() => void) | null = null;

const openSettings = async () => {
  await invoke('open_settings');
};

const handleKeydown = async (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    await appWindow.hide();
  }
};

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown);
  
  unlistenFocus = await appWindow.onFocusChanged(async ({ payload: focused }) => {
    if (focused && searchInput.value) {
      searchInput.value.focus();
      searchInput.value.select();
    } else {
      await appWindow.hide();
    }
  });
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  if (unlistenFocus) unlistenFocus();
});
</script>

<template>
  <main class="launcher">
    <header class="launcher-header">
      <button class="settings-btn" title="Settings" @click="openSettings">
        <SettingsIcon :size="20" />
      </button>
    </header>
    <section class="results-area">
      <!-- Results will be populated here -->
    </section>
    <footer class="input-area">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="Type to search..."
        autofocus
      />
    </footer>
  </main>
</template>

<style>
@import './styles.css';
</style>
