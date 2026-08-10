<!-- eslint-disable vue/html-self-closing -->
<template>
  <div class="comment-reply-form">
    <textarea
      ref="textareaRef"
      v-model="content"
      class="comment-reply-textarea"
      placeholder="Write a reply... (use @ to mention)"
      rows="3"
      @input="handleInput"
      @keydown="handleKeydown"
    />

    <!-- Mention Autocomplete Dropdown -->
    <div
      v-if="showMentions && mentionSuggestions.length > 0"
      class="comment-mention-dropdown"
      :style="mentionDropdownStyle"
    >
      <div
        v-for="(suggestion, index) in mentionSuggestions"
        :key="suggestion.id"
        class="comment-mention-item"
        :class="{ active: index === selectedMentionIndex }"
        @click="selectMention(suggestion)"
        @mouseenter="selectedMentionIndex = index"
      >
        <div class="comment-mention-avatar">
          <img
            v-if="suggestion.avatarUrl"
            :src="suggestion.avatarUrl"
            :alt="suggestion.name"
          />
          <span v-else>
            {{ getInitials(suggestion.name) }}
          </span>
        </div>
        <div class="comment-mention-info">
          <div class="comment-mention-name">
            {{ suggestion.name }}
          </div>
          <div v-if="suggestion.email" class="comment-mention-email">
            {{ suggestion.email }}
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="comment-reply-actions">
      <button class="comment-reply-cancel" type="button" @click="handleCancel">
        Cancel
      </button>
      <button
        class="comment-reply-submit"
        type="button"
        :disabled="!content.trim()"
        @click="handleSubmit"
      >
        Reply
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from "vue";
import type { MentionSuggestion } from "../composables/useComments";

interface Props {
  /**
   * Host-supplied mention provider (e.g. useComments.searchMentions or the
   * onMentionTriggered callback). When absent, the dropdown stays empty.
   */
  mentionSearch?: (
    query: string
  ) => Promise<MentionSuggestion[]> | MentionSuggestion[];
}

interface Emits {
  (e: "submit", content: string, mentions: string[]): void;
  (e: "cancel"): void;
}

const props = withDefaults(defineProps<Props>(), {
  mentionSearch: undefined,
});

const emit = defineEmits<Emits>();

// Debounce interval before querying the mention provider
const MENTION_SEARCH_DEBOUNCE_MS = 150;

// Refs
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const content = ref("");
const showMentions = ref(false);
const mentionQuery = ref("");
const selectedMentionIndex = ref(0);
const mentionSuggestions = ref<MentionSuggestion[]>([]);

let mentionSearchTimer: ReturnType<typeof setTimeout> | null = null;
let mentionSearchToken = 0;

function cancelMentionSearch() {
  if (mentionSearchTimer !== null) {
    clearTimeout(mentionSearchTimer);
    mentionSearchTimer = null;
  }
}

function resetMentions() {
  cancelMentionSearch();
  // Invalidate any in-flight search so stale results are dropped
  mentionSearchToken++;
  mentionSuggestions.value = [];
}

async function runMentionSearch(query: string) {
  const search = props.mentionSearch;
  if (!search) return;

  const token = ++mentionSearchToken;
  try {
    const results = await search(query);
    if (token !== mentionSearchToken || !showMentions.value) return;
    mentionSuggestions.value = results ?? [];
    selectedMentionIndex.value = 0;
  } catch {
    if (token === mentionSearchToken) {
      mentionSuggestions.value = [];
    }
  }
}

function queueMentionSearch(query: string) {
  cancelMentionSearch();

  if (!props.mentionSearch) {
    mentionSuggestions.value = [];
    return;
  }

  mentionSearchTimer = setTimeout(() => {
    mentionSearchTimer = null;
    void runMentionSearch(query);
  }, MENTION_SEARCH_DEBOUNCE_MS);
}

const mentionDropdownStyle = computed(() => {
  // Position dropdown above textarea
  return {
    bottom: "100%",
    marginBottom: "8px",
  };
});

onBeforeUnmount(() => {
  cancelMentionSearch();
});

// Methods
function handleInput() {
  // Detect @ mentions
  const cursorPos = textareaRef.value?.selectionStart ?? 0;
  const textBeforeCursor = content.value.slice(0, cursorPos);
  const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

  if (mentionMatch) {
    showMentions.value = true;
    mentionQuery.value = mentionMatch[1];
    selectedMentionIndex.value = 0;
    queueMentionSearch(mentionMatch[1]);
  } else {
    showMentions.value = false;
    mentionQuery.value = "";
    resetMentions();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (!showMentions.value) {
    // Submit on Cmd/Ctrl + Enter
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
    return;
  }

  // Navigate mention suggestions
  if (event.key === "ArrowDown") {
    event.preventDefault();
    selectedMentionIndex.value = Math.min(
      selectedMentionIndex.value + 1,
      mentionSuggestions.value.length - 1
    );
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    selectedMentionIndex.value = Math.max(selectedMentionIndex.value - 1, 0);
  } else if (event.key === "Enter" || event.key === "Tab") {
    event.preventDefault();
    const suggestion = mentionSuggestions.value[selectedMentionIndex.value];
    if (suggestion) {
      selectMention(suggestion);
    }
  } else if (event.key === "Escape") {
    event.preventDefault();
    showMentions.value = false;
  }
}

function selectMention(suggestion: MentionSuggestion) {
  const cursorPos = textareaRef.value?.selectionStart ?? 0;
  const textBeforeCursor = content.value.slice(0, cursorPos);
  const textAfterCursor = content.value.slice(cursorPos);

  // Replace @query with @username
  const newTextBefore = textBeforeCursor.replace(
    /@(\w*)$/,
    `@${suggestion.name} `
  );
  content.value = newTextBefore + textAfterCursor;

  showMentions.value = false;
  mentionQuery.value = "";
  resetMentions();

  // Move cursor to end of inserted mention
  nextTick(() => {
    if (textareaRef.value) {
      const newPos = newTextBefore.length;
      textareaRef.value.setSelectionRange(newPos, newPos);
      textareaRef.value.focus();
    }
  });
}

function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return [...new Set(mentions)]; // Remove duplicates
}

function handleSubmit() {
  if (!content.value.trim()) return;

  const mentions = extractMentions(content.value);
  emit("submit", content.value.trim(), mentions);

  // Reset form
  content.value = "";
  showMentions.value = false;
  mentionQuery.value = "";
  resetMentions();
}

function handleCancel() {
  emit("cancel");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
</script>

<style scoped>
.comment-reply-form {
  position: relative;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.comment-reply-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  background: var(--editor-bg, #ffffff);
  color: var(--text-color, #1f2937);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  min-height: 80px;
  transition: all 0.2s ease;
}

.comment-reply-textarea:focus {
  outline: none;
  border-color: transparent;
  background: var(--editor-bg, #ffffff);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08);
}

.comment-reply-textarea:hover:not(:focus) {
  border-color: var(--toolbar-accent, #3b82f6);
}

.comment-mention-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  background: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
}

.comment-mention-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.comment-mention-item:hover,
.comment-mention-item.active {
  background: var(--hover-bg);
}

.comment-mention-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.comment-mention-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.comment-mention-info {
  flex: 1;
  min-width: 0;
}

.comment-mention-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}

.comment-mention-email {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.comment-reply-cancel,
.comment-reply-submit {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.comment-reply-cancel::before,
.comment-reply-submit::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.comment-reply-cancel:hover::before,
.comment-reply-submit:hover:not(:disabled)::before {
  width: 300px;
  height: 300px;
}

.comment-reply-cancel {
  background: transparent;
  color: var(--text-muted, #6b7280);
  border: 1px solid var(--border-color, #e5e7eb);
}

.comment-reply-cancel:hover {
  background: var(--hover-bg, #f3f4f6);
  color: var(--text-color, #1f2937);
  border-color: var(--border-color, #d1d5db);
}

.comment-reply-submit {
  background: var(--toolbar-accent, #3b82f6);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.comment-reply-submit:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}

.comment-reply-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
</style>
