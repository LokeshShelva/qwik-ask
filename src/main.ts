import { createApp } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import App from './App.vue';
import { applyThemeFromSettings, setupSystemThemeListener } from './composables/useTheme';
import type { AppSettings } from './types/settings';

// Load settings and apply theme before mounting
async function initApp() {
  try {
    const settings = await invoke<AppSettings>('get_settings');
    applyThemeFromSettings(settings.general.theme);
    
    // Setup listener for system theme changes
    setupSystemThemeListener(settings.general.theme);
  } catch (e) {
    // Default to dark theme on error
    applyThemeFromSettings('dark');
    console.error('Failed to load settings for theme:', e);
  }

  createApp(App).mount('#app');
}

initApp();
