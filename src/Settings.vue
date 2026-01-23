<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useSettings } from './composables/useSettings';
import { applyThemeFromSettings, setupSystemThemeListener } from './composables/useTheme';
import type { Theme, LlmProvider } from './types/settings';
import SettingsIcon from './components/SettingsIcon.vue';
import KeyboardIcon from './components/KeyboardIcon.vue';
import InfoIcon from './components/InfoIcon.vue';
import ShortcutRecorder from './components/ShortcutRecorder.vue';

const settingsWindow = getCurrentWindow();

const { settings, loading, error, loadSettings, updateSettings } = useSettings();

let unlistenClose: (() => void) | null = null;
let unlistenSystemTheme: (() => void) | null = null;

// Shortcut recorder modal state
const showShortcutRecorder = ref(false);

const openShortcutRecorder = () => {
  showShortcutRecorder.value = true;
};

const closeShortcutRecorder = () => {
  showShortcutRecorder.value = false;
};

const handleShortcutSave = async (newShortcut: string) => {
  if (!settings.value) return;

  const updated = {
    ...settings.value,
    shortcuts: {
      ...settings.value.shortcuts,
      toggle_launcher: newShortcut,
    },
  };

  try {
    await updateSettings(updated);
    showShortcutRecorder.value = false;
  } catch (err) {
    console.error('Failed to update shortcut:', err);
  }
};

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

  const newTheme = target.value as Theme;
  
  const updated = {
    ...settings.value,
    general: {
      ...settings.value.general,
      theme: newTheme,
    },
  };

  try {
    await updateSettings(updated);
    
    // Apply theme immediately to this window
    applyThemeFromSettings(newTheme);
    
    // Update the system theme listener for the new setting
    if (unlistenSystemTheme) {
      unlistenSystemTheme();
    }
    unlistenSystemTheme = setupSystemThemeListener(newTheme) || null;
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
  
  // Setup system theme listener after settings are loaded
  if (settings.value) {
    unlistenSystemTheme = setupSystemThemeListener(settings.value.general.theme) || null;
  }

  unlistenClose = await settingsWindow.onCloseRequested(async (event) => {
    event.preventDefault();
    await settingsWindow.hide();
  });
});

onUnmounted(() => {
  if (unlistenClose) unlistenClose();
  if (unlistenSystemTheme) unlistenSystemTheme();
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
        <p class="page-description">Configure your Quick Assist preferences</p>

        <!-- General Settings Group -->
        <div class="setting-group-container">
          <h2 class="group-title">
            <SettingsIcon :size="14" />
            General
          </h2>

          <div class="setting-group">
            <div class="setting-item">
              <div class="setting-info">
                <label>Launch at startup</label>
                <span class="setting-hint">Start when you log in</span>
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
                <span class="setting-hint">Color scheme</span>
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
            <KeyboardIcon :size="14" />
            Shortcuts
          </h2>

          <div class="setting-group">
            <div class="setting-item">
              <div class="setting-info">
                <label>Toggle launcher</label>
                <span class="setting-hint">Show or hide Quick Assist</span>
              </div>
              <button 
                class="shortcut-btn" 
                @click="openShortcutRecorder"
                :disabled="loading"
              >
                <kbd>{{ settings.shortcuts.toggle_launcher }}</kbd>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- LLM Settings Group -->
        <div class="setting-group-container">
          <h2 class="group-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"></path>
            </svg>
            AI Provider
          </h2>

          <div class="setting-group">
            <div class="setting-item">
              <div class="setting-info">
                <label>Model provider</label>
                <span class="setting-hint">Select AI service</span>
              </div>
              <select 
                class="select-input"
                :value="settings.llm.provider"
                @change="handleProviderChange"
                :disabled="loading"
              >
                <option value="gemini">Gemini</option>
                <option value="openai" disabled>OpenAI (Soon)</option>
              </select>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <label>API Key</label>
                <span class="setting-hint">Your {{ settings.llm.provider }} key</span>
              </div>
              <input 
                type="password" 
                class="text-input"
                :value="settings.llm.api_key"
                @blur="handleApiKeyChange"
                :disabled="loading"
                placeholder="Enter API key"
              />
            </div>
          </div>
        </div>

        <!-- About Section -->
        <div class="setting-group-container">
          <h2 class="group-title">
            <InfoIcon :size="14" />
            About
          </h2>

          <div class="about-info">
            <h2>Quick Assist</h2>
            <p class="version">v0.1.0</p>
            <p class="description">A fast launcher for AI-powered assistance.</p>
            <p class="settings-location">
              Settings stored in <code>settings.json</code>
            </p>
            <button @click="openSettingsFile" class="btn-secondary" :disabled="loading">
              Open settings file
            </button>
          </div>
        </div>
      </main>
    </div>

    <!-- Shortcut Recorder Modal -->
    <ShortcutRecorder 
      v-if="showShortcutRecorder && settings"
      :current-shortcut="settings.shortcuts.toggle_launcher"
      @save="handleShortcutSave"
      @cancel="closeShortcutRecorder"
    />
  </div>
</template>

<style>
@import './settings.css';
</style>
