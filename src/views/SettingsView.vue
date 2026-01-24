<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useSettings } from '../composables/useSettings';
import { applyThemeFromSettings, setupSystemThemeListener } from '../composables/useTheme';
import { PROVIDER_MODELS, CUSTOM_PROVIDER_PRESETS, getDefaultModel } from '../types/settings';
import type { Theme, LlmProvider } from '../types/settings';
import { DEFAULT_SYSTEM_PROMPT } from '../types/settings';
import SettingsIcon from '../components/icons/SettingsIcon.vue';
import KeyboardIcon from '../components/icons/KeyboardIcon.vue';
import InfoIcon from '../components/icons/InfoIcon.vue';
import ShortcutRecorder from '../components/ShortcutRecorder.vue';

const settingsWindow = getCurrentWindow();

const { settings, loading, error, loadSettings, updateSettings } = useSettings();

let unlistenClose: (() => void) | null = null;
let unlistenSystemTheme: (() => void) | null = null;

// Window controls
const minimizeWindow = async () => {
  await settingsWindow.minimize();
};

const closeWindow = async () => {
  await settingsWindow.hide();
};

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

  const newProvider = target.value as LlmProvider;
  const defaultModel = getDefaultModel(newProvider);

  const updated = {
    ...settings.value,
    llm: {
      ...settings.value.llm,
      provider: newProvider,
      model: defaultModel,
      base_url: newProvider === 'custom' ? 'http://localhost:11434/v1' : undefined,
    },
  };

  try {
    await updateSettings(updated);
  } catch (err) {
    console.error('Failed to update provider:', err);
  }
};

const handleModelChange = async (e: Event) => {
  const target = e.target as HTMLSelectElement;
  if (!settings.value) return;

  const updated = {
    ...settings.value,
    llm: {
      ...settings.value.llm,
      model: target.value,
    },
  };

  try {
    await updateSettings(updated);
  } catch (err) {
    console.error('Failed to update model:', err);
  }
};

const handleBaseUrlChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!settings.value) return;

  const updated = {
    ...settings.value,
    llm: {
      ...settings.value.llm,
      base_url: target.value || undefined,
    },
  };

  try {
    await updateSettings(updated);
  } catch (err) {
    console.error('Failed to update base URL:', err);
  }
};

const handlePresetChange = async (e: Event) => {
  const target = e.target as HTMLSelectElement;
  if (!settings.value) return;

  const updated = {
    ...settings.value,
    llm: {
      ...settings.value.llm,
      base_url: target.value || undefined,
    },
  };

  try {
    await updateSettings(updated);
  } catch (err) {
    console.error('Failed to update preset:', err);
  }
};

// Computed for available models based on provider
const availableModels = computed(() => {
  if (!settings.value) return [];
  return PROVIDER_MODELS[settings.value.llm.provider] || [];
});

const isCustomProvider = computed(() => {
  return settings.value?.llm?.provider === 'custom';
});

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

const handleSystemPromptChange = async (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  if (!settings.value) return;

  const updated = {
    ...settings.value,
    llm: {
      ...settings.value.llm,
      system_prompt: target.value,
    },
  };

  try {
    await updateSettings(updated);
  } catch (err) {
    console.error('Failed to update system prompt:', err);
  }
};

const resetSystemPrompt = async () => {
  if (!settings.value) return;

  const updated = {
    ...settings.value,
    llm: {
      ...settings.value.llm,
      system_prompt: DEFAULT_SYSTEM_PROMPT,
    },
  };

  try {
    await updateSettings(updated);
  } catch (err) {
    console.error('Failed to reset system prompt:', err);
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
    <!-- Custom Title Bar -->
    <header class="titlebar" data-tauri-drag-region>
      <div class="titlebar-title" data-tauri-drag-region>
        <SettingsIcon :size="14" />
        <span data-tauri-drag-region>Qwik Ask Settings</span>
      </div>
      <div class="titlebar-buttons">
        <button class="titlebar-btn" @click="minimizeWindow" title="Minimize">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M0 5h10" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
        <button class="titlebar-btn titlebar-btn-close" @click="closeWindow" title="Close">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M0 0L10 10M10 0L0 10" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
      </div>
    </header>
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
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="custom">Custom (OpenAI-compatible)</option>
              </select>
            </div>

            <!-- Custom endpoint configuration -->
            <template v-if="isCustomProvider">
              <div class="setting-item">
                <div class="setting-info">
                  <label>Endpoint Preset</label>
                  <span class="setting-hint">Quick select common endpoints</span>
                </div>
                <select
                  class="select-input"
                  :value="settings.llm.base_url"
                  @change="handlePresetChange"
                  :disabled="loading"
                >
                  <option 
                    v-for="preset in CUSTOM_PROVIDER_PRESETS" 
                    :key="preset.name" 
                    :value="preset.baseUrl"
                  >
                    {{ preset.name }}
                  </option>
                </select>
              </div>

              <div class="setting-item">
                <div class="setting-info">
                  <label>Base URL</label>
                  <span class="setting-hint">API endpoint URL</span>
                </div>
                <input
                  type="text"
                  class="text-input"
                  :value="settings.llm.base_url"
                  @blur="handleBaseUrlChange"
                  :disabled="loading"
                  placeholder="http://localhost:11434/v1"
                />
              </div>

              <div class="setting-item">
                <div class="setting-info">
                  <label>Model Name</label>
                  <span class="setting-hint">e.g., llama3.2, mistral</span>
                </div>
                <input
                  type="text"
                  class="text-input"
                  :value="settings.llm.model"
                  @blur="handleModelChange"
                  :disabled="loading"
                  placeholder="Enter model name"
                />
              </div>
            </template>

            <!-- Standard model selection -->
            <div v-else class="setting-item">
              <div class="setting-info">
                <label>Model</label>
                <span class="setting-hint">Select model to use</span>
              </div>
              <select
                class="select-input"
                :value="settings.llm.model"
                @change="handleModelChange"
                :disabled="loading"
              >
                <option 
                  v-for="model in availableModels" 
                  :key="model.id" 
                  :value="model.id"
                >
                  {{ model.name }}
                </option>
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

          <!-- System Prompt -->
          <div class="setting-group system-prompt-group">
            <div class="system-prompt-header">
              <div class="setting-info">
                <label>System Prompt</label>
                <span class="setting-hint">Customize AI behavior and personality</span>
              </div>
              <button 
                class="btn-ghost-sm" 
                @click="resetSystemPrompt"
                :disabled="loading"
                title="Reset to default"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Reset
              </button>
            </div>
            <textarea 
              class="system-prompt-input"
              :value="settings.llm.system_prompt"
              @blur="handleSystemPromptChange"
              :disabled="loading"
              placeholder="Enter a system prompt to customize AI behavior..."
              rows="6"
            ></textarea>
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
@import '../styles/settings.css';
</style>
