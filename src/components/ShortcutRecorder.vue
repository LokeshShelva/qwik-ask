<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  currentShortcut: string;
}>();

const emit = defineEmits<{
  (e: 'save', shortcut: string): void;
  (e: 'cancel'): void;
}>();

const isRecording = ref(false);
const recordedKeys = ref<Set<string>>(new Set());
const currentCombo = ref('');
const warning = ref<string | null>(null);

// Dangerous shortcuts that could break the system
const DANGEROUS_SHORTCUTS = [
  'Alt+F4',
  'Ctrl+Alt+Delete',
  'Ctrl+Shift+Escape',
  'Alt+Tab',
  'Alt+Escape',
  'Ctrl+Escape',
  'Win',
  'Win+D',
  'Win+E',
  'Win+L',
  'Win+R',
  'Win+Tab',
];

// Common application shortcuts that might conflict
const COMMON_SHORTCUTS = [
  'Ctrl+C',
  'Ctrl+V',
  'Ctrl+X',
  'Ctrl+Z',
  'Ctrl+Y',
  'Ctrl+A',
  'Ctrl+S',
  'Ctrl+O',
  'Ctrl+N',
  'Ctrl+P',
  'Ctrl+F',
  'Ctrl+H',
  'Ctrl+W',
  'Ctrl+Q',
  'Ctrl+T',
  'Ctrl+Shift+T',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F11',
  'F12',
];

const formatKey = (key: string): string => {
  const keyMap: Record<string, string> = {
    'Control': 'Ctrl',
    'Meta': 'Win',
    ' ': 'Space',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
  };
  return keyMap[key] || key;
};

const buildShortcutString = (keys: Set<string>): string => {
  const modifiers = ['Ctrl', 'Alt', 'Shift', 'Win'];
  const sortedKeys: string[] = [];
  
  // Add modifiers in order
  for (const mod of modifiers) {
    if (keys.has(mod)) {
      sortedKeys.push(mod);
    }
  }
  
  // Add other keys
  for (const key of keys) {
    if (!modifiers.includes(key)) {
      sortedKeys.push(key);
    }
  }
  
  return sortedKeys.join('+');
};

const checkShortcut = (shortcut: string): string | null => {
  const normalized = shortcut.toLowerCase();
  
  // Check dangerous shortcuts
  for (const dangerous of DANGEROUS_SHORTCUTS) {
    if (dangerous.toLowerCase() === normalized) {
      return `"${shortcut}" is a system shortcut and cannot be used.`;
    }
  }
  
  // Check common shortcuts
  for (const common of COMMON_SHORTCUTS) {
    if (common.toLowerCase() === normalized) {
      return `"${shortcut}" is commonly used by other apps. Consider a different combination.`;
    }
  }
  
  return null;
};

const isValidShortcut = computed(() => {
  if (!currentCombo.value) return false;
  
  const parts = currentCombo.value.split('+');
  const modifiers = ['Ctrl', 'Alt', 'Shift', 'Win'];
  
  // Must have at least one modifier
  const hasModifier = parts.some(p => modifiers.includes(p));
  // Must have at least one non-modifier key
  const hasKey = parts.some(p => !modifiers.includes(p));
  
  return hasModifier && hasKey;
});

const isDangerous = computed(() => {
  if (!currentCombo.value) return false;
  const normalized = currentCombo.value.toLowerCase();
  return DANGEROUS_SHORTCUTS.some(d => d.toLowerCase() === normalized);
});

const handleKeyDown = (e: KeyboardEvent) => {
  e.preventDefault();
  e.stopPropagation();
  
  if (e.key === 'Escape') {
    emit('cancel');
    return;
  }
  
  isRecording.value = true;
  
  const key = formatKey(e.key);
  
  // Track modifiers
  if (e.ctrlKey) recordedKeys.value.add('Ctrl');
  if (e.altKey) recordedKeys.value.add('Alt');
  if (e.shiftKey) recordedKeys.value.add('Shift');
  if (e.metaKey) recordedKeys.value.add('Win');
  
  // Add the actual key if it's not just a modifier
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
    recordedKeys.value.add(key);
  }
  
  currentCombo.value = buildShortcutString(recordedKeys.value);
  warning.value = checkShortcut(currentCombo.value);
};

const handleKeyUp = (e: KeyboardEvent) => {
  // When all keys are released, finalize the combo
  if (!e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
    isRecording.value = false;
  }
};

const handleSave = () => {
  if (isValidShortcut.value && !isDangerous.value) {
    emit('save', currentCombo.value);
  }
};

const handleCancel = () => {
  emit('cancel');
};

const resetRecording = () => {
  recordedKeys.value = new Set();
  currentCombo.value = '';
  warning.value = null;
  isRecording.value = false;
};

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);
});
</script>

<template>
  <div class="modal-overlay" @click.self="handleCancel">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Set Shortcut</h3>
        <button class="modal-close" @click="handleCancel" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <p class="modal-instruction">Press any key combination</p>
        
        <div class="shortcut-recorder" :class="{ recording: isRecording, invalid: isDangerous }">
          <span v-if="currentCombo" class="recorded-shortcut">{{ currentCombo }}</span>
          <span v-else class="placeholder">Waiting for input...</span>
        </div>
        
        <div v-if="warning" class="warning-message" :class="{ danger: isDangerous }">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>{{ warning }}</span>
        </div>
        
        <p class="current-shortcut">
          Current: <kbd>{{ currentShortcut }}</kbd>
        </p>
      </div>
      
      <div class="modal-footer">
        <button class="btn-ghost" @click="resetRecording">Reset</button>
        <div class="footer-actions">
          <button class="btn-ghost" @click="handleCancel">Cancel</button>
          <button 
            class="btn-primary" 
            @click="handleSave"
            :disabled="!isValidShortcut || isDangerous"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: rgba(24, 24, 27, 0.95);
  border: 1px solid rgba(63, 63, 70, 0.6);
  border-radius: 12px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(63, 63, 70, 0.4);
}

.modal-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: rgb(250, 250, 250);
  margin: 0;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgb(113, 113, 122);
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-close:hover {
  background: rgba(39, 39, 42, 0.6);
  color: rgb(250, 250, 250);
}

.modal-body {
  padding: 20px 16px;
}

.modal-instruction {
  font-size: 12px;
  color: rgb(113, 113, 122);
  text-align: center;
  margin-bottom: 12px;
}

.shortcut-recorder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  padding: 12px 16px;
  background: rgba(39, 39, 42, 0.5);
  border: 2px dashed rgba(63, 63, 70, 0.6);
  border-radius: 8px;
  transition: all 0.15s ease;
}

.shortcut-recorder.recording {
  border-color: rgb(161, 161, 170);
  border-style: solid;
  background: rgba(39, 39, 42, 0.8);
}

.shortcut-recorder.invalid {
  border-color: rgb(239, 68, 68);
  background: rgba(239, 68, 68, 0.1);
}

.recorded-shortcut {
  font-size: 18px;
  font-weight: 600;
  color: rgb(250, 250, 250);
  letter-spacing: 0.02em;
}

.placeholder {
  font-size: 13px;
  color: rgb(113, 113, 122);
}

.warning-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.3);
  border-radius: 6px;
  font-size: 12px;
  color: rgb(250, 204, 21);
}

.warning-message.danger {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: rgb(248, 113, 113);
}

.warning-message svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.current-shortcut {
  margin-top: 16px;
  font-size: 12px;
  color: rgb(113, 113, 122);
  text-align: center;
}

.current-shortcut kbd {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(39, 39, 42, 0.6);
  border: 1px solid rgba(63, 63, 70, 0.6);
  border-radius: 4px;
  font-size: 11px;
  font-family: inherit;
  color: rgb(161, 161, 170);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid rgba(63, 63, 70, 0.4);
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.btn-ghost {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  color: rgb(161, 161, 170);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-ghost:hover {
  background: rgba(39, 39, 42, 0.6);
  color: rgb(250, 250, 250);
}

.btn-primary {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  background: rgb(250, 250, 250);
  color: rgb(9, 9, 11);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: rgb(228, 228, 231);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
