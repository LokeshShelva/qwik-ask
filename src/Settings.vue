<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import SettingsIcon from './components/SettingsIcon.vue';
import KeyboardIcon from './components/KeyboardIcon.vue';
import InfoIcon from './components/InfoIcon.vue';

const settingsWindow = getCurrentWindow();
const activeSection = ref('general');

let unlistenClose: (() => void) | null = null;

const sections = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'shortcuts', label: 'Shortcuts', icon: 'keyboard' },
  { id: 'about', label: 'About', icon: 'info' },
];

const setActiveSection = (sectionId: string) => {
  activeSection.value = sectionId;
};

onMounted(async () => {
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
    <aside class="settings-sidebar">
      <nav class="settings-nav">
        <a
          v-for="section in sections"
          :key="section.id"
          href="#"
          class="nav-item"
          :class="{ active: activeSection === section.id }"
          @click.prevent="setActiveSection(section.id)"
        >
          <SettingsIcon v-if="section.icon === 'settings'" :size="18" />
          <KeyboardIcon v-if="section.icon === 'keyboard'" :size="18" />
          <InfoIcon v-if="section.icon === 'info'" :size="18" />
          {{ section.label }}
        </a>
      </nav>
    </aside>

    <main class="settings-content">
      <!-- General Section -->
      <section v-show="activeSection === 'general'" class="settings-section">
        <h1>General</h1>
        <p class="section-description">Configure general application settings.</p>

        <div class="setting-group">
          <div class="setting-item">
            <div class="setting-info">
              <label>Launch at startup</label>
              <span class="setting-hint">Automatically start Quick Assist when you log in</span>
            </div>
            <label class="toggle">
              <input type="checkbox" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <label>Theme</label>
              <span class="setting-hint">Choose your preferred color theme</span>
            </div>
            <select class="select-input">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Shortcuts Section -->
      <section v-show="activeSection === 'shortcuts'" class="settings-section">
        <h1>Shortcuts</h1>
        <p class="section-description">Configure keyboard shortcuts.</p>

        <div class="setting-group">
          <div class="setting-item">
            <div class="setting-info">
              <label>Toggle launcher</label>
              <span class="setting-hint">Show or hide the Quick Assist launcher</span>
            </div>
            <kbd class="shortcut-display">Alt + Shift + Space</kbd>
          </div>
        </div>
      </section>

      <!-- About Section -->
      <section v-show="activeSection === 'about'" class="settings-section">
        <h1>About</h1>
        <p class="section-description">Information about Quick Assist.</p>

        <div class="about-info">
          <h2>Quick Assist</h2>
          <p class="version">Version 0.1.0</p>
          <p class="description">A fast launcher application inspired by PowerToys Run.</p>
        </div>
      </section>
    </main>
  </div>
</template>

<style>
@import './settings.css';
</style>
