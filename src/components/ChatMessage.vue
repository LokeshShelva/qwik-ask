<script setup lang="ts">
import { ref, computed } from 'vue';
import { marked } from 'marked';
import CopyIcon from './CopyIcon.vue';
import CheckIcon from './CheckIcon.vue';

const props = defineProps<{
  content: string;
  role: 'user' | 'assistant';
}>();

const copied = ref(false);

// Configure marked for security
marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderedContent = computed(() => {
  if (props.role === 'user') {
    return props.content;
  }
  return marked.parse(props.content) as string;
});

const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(props.content);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.error('Failed to copy:', e);
  }
};
</script>

<template>
  <div :class="['message', `message-${role}`]">
    <!-- User message: compact inline -->
    <template v-if="role === 'user'">
      <span class="user-label">You:</span>
      <span class="user-content">{{ content }}</span>
    </template>
    
    <!-- Assistant message: full with copy -->
    <template v-else>
      <div class="assistant-header">
        <button 
          v-if="content" 
          class="copy-btn" 
          @click="copyContent" 
          :title="copied ? 'Copied!' : 'Copy'"
        >
          <CheckIcon v-if="copied" :size="12" />
          <CopyIcon v-else :size="12" />
        </button>
      </div>
      <div class="message-content markdown-body" v-html="renderedContent"></div>
    </template>
  </div>
</template>

<style scoped>
.message {
  margin-bottom: 12px;
}

.message-user {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  padding: 0 0 8px 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
}

.user-label {
  font-weight: 600;
  color: var(--text-muted);
  flex-shrink: 0;
}

.user-content {
  color: var(--text-secondary);
  white-space: pre-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-assistant {
  position: relative;
}

.assistant-header {
  position: absolute;
  top: 0;
  right: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.message-assistant:hover .assistant-header {
  opacity: 1;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.copy-btn:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.message-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
}

/* Markdown styles */
.markdown-body :deep(p) {
  margin: 0 0 12px 0;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(pre) {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
  margin: 12px 0;
  border: 1px solid var(--border);
}

.markdown-body :deep(code) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

.markdown-body :deep(p code),
.markdown-body :deep(li code) {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 16px 0 8px 0;
  font-weight: 600;
}

.markdown-body :deep(h1) {
  font-size: 18px;
}

.markdown-body :deep(h2) {
  font-size: 16px;
}

.markdown-body :deep(h3) {
  font-size: 15px;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid var(--text-muted);
  padding-left: 12px;
  margin: 12px 0;
  color: var(--text-secondary);
}

.markdown-body :deep(a) {
  color: var(--accent);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 16px 0;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: var(--bg-secondary);
  font-weight: 600;
}
</style>
