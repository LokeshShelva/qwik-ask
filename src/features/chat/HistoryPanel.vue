<script setup lang="ts">
import { ref, watch } from 'vue';
import { useHistory } from './composables/useHistory';
import HistoryItem from './HistoryItem.vue';

const emit = defineEmits<{
  select: [id: string];
  close: [];
}>();

const {
  groupedConversations,
  loading,
  hasConversations,
  currentConversationId,
  search,
  loadConversation,
  deleteConversation,
} = useHistory();

const searchInput = ref('');
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// Debounced search
watch(searchInput, (value) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    search(value);
  }, 200);
});

const handleSelect = async (id: string) => {
  await loadConversation(id);
  emit('select', id);
};

const handleDelete = async (id: string) => {
  await deleteConversation(id);
};

const handleClose = () => {
  emit('close');
};

const handleNewChat = () => {
  emit('close');
};
</script>

<template>
  <div class="history-panel">
    <!-- Header -->
    <div class="history-header">
      <h2 class="history-title">History</h2>
      <button class="history-close" @click="handleClose" title="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Search -->
    <div class="history-search">
      <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        v-model="searchInput"
        type="text"
        class="search-input"
        placeholder="Search conversations..."
      />
    </div>

    <!-- New Chat Button -->
    <button class="new-chat-btn" @click="handleNewChat">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      New Chat
    </button>

    <!-- Content -->
    <div class="history-content">
      <!-- Loading -->
      <div v-if="loading" class="history-loading">
        Loading...
      </div>

      <!-- Empty state -->
      <div v-else-if="!hasConversations" class="history-empty">
        <p>No conversations yet</p>
        <p class="history-empty-hint">Start chatting to see your history here</p>
      </div>

      <!-- Conversation list -->
      <template v-else>
        <!-- Today -->
        <template v-if="groupedConversations.today.length > 0">
          <div class="history-group">
            <h3 class="history-group-title">Today</h3>
            <HistoryItem
              v-for="conv in groupedConversations.today"
              :key="conv.id"
              :conversation="conv"
              :is-active="conv.id === currentConversationId"
              @select="handleSelect"
              @delete="handleDelete"
            />
          </div>
        </template>

        <!-- Yesterday -->
        <template v-if="groupedConversations.yesterday.length > 0">
          <div class="history-group">
            <h3 class="history-group-title">Yesterday</h3>
            <HistoryItem
              v-for="conv in groupedConversations.yesterday"
              :key="conv.id"
              :conversation="conv"
              :is-active="conv.id === currentConversationId"
              @select="handleSelect"
              @delete="handleDelete"
            />
          </div>
        </template>

        <!-- Last 7 days -->
        <template v-if="groupedConversations.lastWeek.length > 0">
          <div class="history-group">
            <h3 class="history-group-title">Last 7 Days</h3>
            <HistoryItem
              v-for="conv in groupedConversations.lastWeek"
              :key="conv.id"
              :conversation="conv"
              :is-active="conv.id === currentConversationId"
              @select="handleSelect"
              @delete="handleDelete"
            />
          </div>
        </template>

        <!-- Older -->
        <template v-if="groupedConversations.older.length > 0">
          <div class="history-group">
            <h3 class="history-group-title">Older</h3>
            <HistoryItem
              v-for="conv in groupedConversations.older"
              :key="conv.id"
              :conversation="conv"
              :is-active="conv.id === currentConversationId"
              @select="handleSelect"
              @delete="handleDelete"
            />
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.history-panel {
  display: flex;
  flex-direction: column;
  width: 280px;
  height: 100%;
  background: #18181b; /* Solid zinc-900 to fix transparency */
  border-right: 1px solid var(--border);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px; /* reduced padding */
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.history-title {
  font-size: 13px; /* reduced size */
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}

.history-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px; /* smaller button */
  height: 24px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.history-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.history-search {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 12px 6px; /* tighter spacing */
  padding: 6px 8px; /* compact padding */
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px; /* smaller radius */
}

.search-icon {
  color: var(--text-muted);
  flex-shrink: 0;
  opacity: 0.7;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 12px; /* smaller font */
  color: var(--text-primary);
  min-width: 0;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 6px 12px 10px;
  padding: 6px 10px; /* compact button */
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.new-chat-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.history-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 12px;
}

.history-content::-webkit-scrollbar {
  width: 5px; /* thinner scrollbar */
}

.history-content::-webkit-scrollbar-track {
  background: transparent;
}

.history-content::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.history-loading,
.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

.history-empty-hint {
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.7;
}

.history-group {
  margin-bottom: 12px;
}

.history-group-title {
  font-size: 10px; /* smaller title */
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 6px 8px 2px;
  margin: 0;
}
</style>
