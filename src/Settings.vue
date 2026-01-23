<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useSettings } from './composables/useSettings';
import type { Theme, LlmProvider } from './types/settings';
import SettingsIcon from './components/SettingsIcon.vue';
import KeyboardIcon from './components/KeyboardIcon.vue';
import InfoIcon from './components/InfoIcon.vue';

const settingsWindow = getCurrentWindow();

const { settings, loading, error, loadSettings, updateSettings } = useSettings();

let unlistenClose: (() => void) | null = null;

const handleAutoStartupToggle = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!settings.value) return;

  const updated = {
    ...settings.value,
    general: {
      ...settings.value.general,
      auto_startup: target.checked,
    },
  };

  try {
    await updateSettings(updated);
  } catch (err) {
    console.error('Failed to update auto startup:', err);
    // Revert checkbox on error
    target.checked = !target.checked;
  }
};

const handleThemeChange = async (e: Event) => {
  const target = e.target as HTMLSelectElement;
  if (!settings.value) return;

  const updated = {
    ...settings.value,
    general: {
      ...settings.value.general,
      theme: target.value as Theme,
    },
  };

  try {
    await updateSettings(updated);
  } catch (err) {
    console.error('Failed to update theme:', err);
  }
};

const handleProviderChange = async (e: Event) => {
  const target = e.target as HTMLSelectElement;
  if (!settings.value) return;

  const updated = {
    ...settings.value,
    llm: {
      ...settings.value.llm,
      provider: target.value as LlmProvider,
    },
  };

  try {
    await updateSettings(updated);
  } catch (err) {
    console.error('Failed to update provider:', err);
  }
};

const handleApiKeyChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!settings.value) return;

  const updated = {
    ...settings.value,
    llm: {
      ...settings.value.llm,
      api_key: target.value,
    },
  };

  try {
    await updateSettings(updated);
  } catch (err) {
    console.error('Failed to update API key:', err);
  }
};

const openSettingsFile = async () => {
  try {
    await invoke('open_settings_file');
  } catch (err) {
    console.error('Failed to open settings file:', err);
  }
};

onMounted(async () => {
  await loadSettings();

  unlistenClose = await settingsWindow.onCloseRequested(async (event) => {
    event.preventDefault();
    await settingsWindow.hide();
  });
});

onUnmounted(() => {
  if (unlistenClose) unlistenClose();
});
</script>

<template>
  <div class="settings-container">
    <!-- Loading State -->
    <div v-if="loading && !settings" class="loading-state">
      <p>Loading settings...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p>Error loading settings: {{ error }}</p>
    </div>

    <!-- Settings Content -->
    <div v-else-if="settings" class="settings-content-wrapper">
      <main class="settings-content">
        <h1 class="page-title">Settings</h1>
        <p class="page-description">Manage your Quick Assist preferences</p>

        <!-- General Settings Group -->
        <div class="setting-group-container">
          <h2 class="group-title">
            <SettingsIcon :size="20" />
            General
          </h2>

          <div class="setting-group">
            <div class="setting-item">
              <div class="setting-info">
                <label>Launch at startup</label>
                <span class="setting-hint">Automatically start Quick Assist when you log in</span>
              </div>
              <label class="toggle">
                <input 
                  type="checkbox" 
                  :checked="settings.general.auto_startup"
                  @change="handleAutoStartupToggle"
                  :disabled="loading"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <label>Theme</label>
                <span class="setting-hint">Choose your preferred color theme</span>
              </div>
              <select 
                class="select-input"
                :value="settings.general.theme"
                @change="handleThemeChange"
                :disabled="loading"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Shortcuts Settings Group -->
        <div class="setting-group-container">
          <h2 class="group-title">
            <KeyboardIcon :size="20" />
            Shortcuts
          </h2>

          <div class="setting-group">
            <div class="setting-item">
              <div class="setting-info">
                <label>Toggle launcher</label>
                <span class="setting-hint">Show or hide the Quick Assist launcher</span>
              </div>
              <kbd class="shortcut-display">{{ settings.shortcuts.toggle_launcher }}</kbd>
            </div>
          </div>
        </div>

        <!-- LLM Settings Group -->
        <div class="setting-group-container">
          <h2 class="group-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
            AI Integration
          </h2>

          <div class="setting-group">
            <div class="setting-item">
              <div class="setting-info">
                <label>Model Provider</label>
                <span class="setting-hint">Choose your AI model provider</span>
              </div>
              <select 
                class="select-input"
                :value="settings.llm.provider"
                @change="handleProviderChange"
                :disabled="loading"
              >
                <option value="gemini">Gemini</option>
                <option value="openai" disabled>OpenAI (Coming Soon)</option>
              </select>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <label>API Key</label>
                <span class="setting-hint">Enter your {{ settings.llm.provider }} API key</span>
              </div>
              <input 
                type="password" 
                class="text-input"
                :value="settings.llm.api_key"
                @blur="handleApiKeyChange"
                :disabled="loading"
                placeholder="Enter your API key"
              />
            </div>
          </div>
        </div>

        <!-- About Section -->
        <div class="setting-group-container">
          <h2 class="group-title">
            <InfoIcon :size="20" />
            About
          </h2>

          <div class="about-info">
            <h2>Quick Assist</h2>
            <p class="version">Version 0.1.0</p>
            <p class="description">A fast launcher application inspired by PowerToys Run.</p>
            <p class="settings-location">
              Settings are stored in <code>settings.json</code> and can be manually edited
            </p>
            <button @click="openSettingsFile" class="btn-secondary" :disabled="loading">
              Open settings.json
            </button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style>
@import './settings.css';
</style>
