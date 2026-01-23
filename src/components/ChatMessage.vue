<script setup lang="ts">
import { ref, computed, onMounted, onUpdated, nextTick } from 'vue';
import { marked } from 'marked';
import CopyIcon from './CopyIcon.vue';
import CheckIcon from './CheckIcon.vue';

const props = defineProps<{
  content: string;
  role: 'user' | 'assistant';
}>();

const copied = ref(false);
const messageContentRef = ref<HTMLDivElement | null>(null);

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

// Add copy buttons to code blocks
const addCodeBlockCopyButtons = async () => {
  await nextTick();
  if (!messageContentRef.value) return;
  
  const preBlocks = messageContentRef.value.querySelectorAll('pre');
  preBlocks.forEach((pre) => {
    // Skip if already has a copy button
    if (pre.querySelector('.code-copy-btn')) return;
    
    // Create copy button
    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.title = 'Copy code';
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code');
      const text = code ? code.textContent : pre.textContent;
      
      try {
        await navigator.clipboard.writeText(text || '');
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        btn.classList.add('copied');
        
        setTimeout(() => {
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
          btn.classList.remove('copied');
        }, 2000);
      } catch (e) {
        console.error('Failed to copy code:', e);
      }
    });
    
    // Insert at beginning for sticky positioning
    pre.insertBefore(btn, pre.firstChild);
  });
};

onMounted(addCodeBlockCopyButtons);
onUpdated(addCodeBlockCopyButtons);
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
      <div ref="messageContentRef" class="message-content markdown-body" v-html="renderedContent"></div>
      <div class="assistant-footer">
        <button 
          v-if="content" 
          class="response-copy-btn" 
          @click="copyContent" 
          :title="copied ? 'Copied!' : 'Copy response'"
        >
          <CheckIcon v-if="copied" :size="12" />
          <CopyIcon v-else :size="12" />
          <span>{{ copied ? 'Copied' : 'Copy' }}</span>
        </button>
      </div>
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

.assistant-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.response-copy-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.response-copy-btn:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.response-copy-btn span {
  line-height: 1;
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
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
  margin: 12px 0;
  border: 1px solid var(--border);
}

/* Horizontal scrollbar styling */
.markdown-body :deep(pre)::-webkit-scrollbar {
  height: 6px;
}

.markdown-body :deep(pre)::-webkit-scrollbar-track {
  background: transparent;
}

.markdown-body :deep(pre)::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.markdown-body :deep(pre)::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Code block copy button */
.markdown-body :deep(.code-copy-btn) {
  position: sticky;
  float: right;
  top: 6px;
  right: 6px;
  margin-top: -32px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: rgba(39, 39, 42, 0.9);
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
  z-index: 1;
}

.markdown-body :deep(pre:hover .code-copy-btn) {
  opacity: 1;
}

.markdown-body :deep(.code-copy-btn:hover) {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.markdown-body :deep(.code-copy-btn.copied) {
  color: #22c55e;
  border-color: #22c55e;
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
