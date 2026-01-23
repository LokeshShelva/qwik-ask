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
  searchQuery,
  loading,
  hasConversations,
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
  const messages = await loadConversation(id);
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
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.history-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.history-close {
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
  transition: all 0.15s ease;
}

.history-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.history-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 14px 8px;
  padding: 8px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.search-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--text-primary);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0 14px 12px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
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
  width: 6px;
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
  font-size: 13px;
}

.history-empty-hint {
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.7;
}

.history-group {
  margin-bottom: 16px;
}

.history-group-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 12px 4px;
  margin: 0;
}
</style>
