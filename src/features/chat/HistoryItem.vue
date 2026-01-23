<script setup lang="ts">
import type { Conversation } from '../types/history';

const props = defineProps<{
  conversation: Conversation;
}>();

const emit = defineEmits<{
  select: [id: string];
  delete: [id: string];
}>();

// Format relative time
const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  
  return new Date(timestamp).toLocaleDateString();
};

const handleClick = () => {
  emit('select', props.conversation.id);
};

const handleDelete = (e: Event) => {
  e.stopPropagation();
  emit('delete', props.conversation.id);
};
</script>

<template>
  <div class="history-item" @click="handleClick">
    <div class="history-item-content">
      <span class="history-item-title">{{ conversation.title }}</span>
      <span class="history-item-time">{{ formatTime(conversation.updated_at) }}</span>
    </div>
    <button class="history-item-delete" @click="handleDelete" title="Delete">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.history-item:hover {
  background: var(--bg-hover);
}

.history-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-item-title {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item-time {
  font-size: 11px;
  color: var(--text-muted);
}

.history-item-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
}

.history-item:hover .history-item-delete {
  opacity: 1;
}

.history-item-delete:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
</style>
