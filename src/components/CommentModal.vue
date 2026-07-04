<!-- eslint-disable vue/html-self-closing -->
<template>
  <Transition name="modal-fade">
    <div
      v-if="isOpen"
      class="comment-modal-overlay"
      @click="handleCancel"
      @keydown.esc="handleCancel"
    >
      <Transition name="modal-slide">
        <div
          v-if="isOpen"
          class="comment-modal"
          role="dialog"
          aria-labelledby="comment-modal-title"
          aria-modal="true"
          @click.stop
        >
          <!-- Decorative Top Bar -->
          <div class="comment-modal-accent" />

          <!-- Header -->
          <div class="comment-modal-header">
            <div class="comment-modal-title-wrapper">
              <div class="comment-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h3 id="comment-modal-title" class="comment-modal-title">
                  Add Comment
                </h3>
                <p class="comment-modal-subtitle">
                  Share your thoughts on the selected text
                </p>
              </div>
            </div>
            <button
              class="comment-modal-close"
              type="button"
              aria-label="Close comment modal"
              @click="handleCancel"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5l10 10"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>

          <!-- Selected Text Preview -->
          <div v-if="selectedText" class="comment-selected-text">
            <div class="selected-text-header">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M13.5 8.5L9 13l-4.5-4.5m0-5L9 8l4.5-4.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span class="selected-text-label">Selected Text</span>
            </div>
            <div class="selected-text-content">
              {{ selectedText }}
            </div>
          </div>

          <!-- Comment Form -->
          <div class="comment-modal-body">
            <div class="textarea-wrapper">
              <textarea
                ref="textareaRef"
                v-model="content"
                class="comment-modal-textarea"
                placeholder="Write your comment... Type @ to mention someone"
                rows="5"
                autofocus
                @input="handleInput"
                @keydown="handleKeydown"
              />
              <div v-if="content.trim()" class="character-count">
                {{ content.length }} characters
              </div>
            </div>

            <!-- Mention Autocomplete Dropdown -->
            <Transition name="dropdown">
              <div
                v-if="showMentions && mentionSuggestions.length > 0"
                class="comment-mention-dropdown"
              >
                <div class="mention-dropdown-header">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle
                      cx="7"
                      cy="5"
                      r="2"
                      stroke="currentColor"
                      stroke-width="1.5"
                    />
                    <path
                      d="M11 12c0-2.21-1.79-4-4-4s-4 1.79-4 4"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                  <span>Mention someone</span>
                </div>
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
                  <svg
                    v-if="index === selectedMentionIndex"
                    class="mention-check"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M13 4L6 11L3 8"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </Transition>

            <!-- Helper Text -->
            <div class="comment-modal-helper">
              <div class="helper-tips">
                <span class="helper-tip">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle
                      cx="7"
                      cy="7"
                      r="5.5"
                      stroke="currentColor"
                      stroke-width="1.2"
                    />
                    <path
                      d="M7 4v3m0 2v.5"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                  Use @ to mention
                </span>
              </div>
              <span class="helper-shortcut">
                <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to submit
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="comment-modal-actions">
            <button
              class="comment-modal-cancel"
              type="button"
              @click="handleCancel"
            >
              Cancel
            </button>
            <button
              class="comment-modal-submit"
              type="button"
              :disabled="!content.trim()"
              @click="handleSubmit"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M14 2L7 9m7-7l-5 13-2-6-6-2 13-5z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Add Comment
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from "vue";
import type { MentionSuggestion } from "../composables/useComments";

interface Props {
  isOpen: boolean;
  selectedText?: string;
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
  isOpen: false,
  selectedText: "",
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

// Watch modal open to focus textarea
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      nextTick(() => {
        textareaRef.value?.focus();
      });
    } else {
      // Reset form when modal closes
      content.value = "";
      showMentions.value = false;
      mentionQuery.value = "";
      resetMentions();
    }
  }
);

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
    // Close on Escape
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
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
/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
}

.modal-slide-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.modal-slide-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Overlay */
.comment-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

/* Modal */
.comment-modal {
  background: var(--editor-bg, #ffffff);
  border-radius: 16px;
  max-width: 640px;
  width: 100%;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
}

/* Accent Bar */
.comment-modal-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
}

/* Header */
.comment-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 28px 32px 20px;
  gap: 16px;
}

.comment-modal-title-wrapper {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex: 1;
}

.comment-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.comment-modal-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-color, #111827);
  margin: 0 0 4px 0;
  line-height: 1.2;
}

.comment-modal-subtitle {
  font-size: 14px;
  color: var(--text-muted, #6b7280);
  margin: 0;
  line-height: 1.4;
}

.comment-modal-close {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #6b7280);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.comment-modal-close:hover {
  background: var(--hover-bg, #f3f4f6);
  color: var(--error-color, #ef4444);
  transform: rotate(90deg);
}

/* Selected Text */
.comment-selected-text {
  padding: 0 32px 20px;
  margin-bottom: 8px;
}

.selected-text-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--text-muted, #6b7280);
}

.selected-text-header svg {
  opacity: 0.7;
}

.selected-text-label {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.selected-text-content {
  font-size: 15px;
  color: var(--text-color, #1f2937);
  line-height: 1.6;
  padding: 16px 20px;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.05) 0%,
    rgba(139, 92, 246, 0.05) 100%
  );
  border-left: 3px solid;
  border-image: linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%) 1;
  border-radius: 0 8px 8px 0;
  max-height: 120px;
  overflow-y: auto;
  font-style: italic;
}

/* Body */
.comment-modal-body {
  padding: 0 32px 24px;
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.textarea-wrapper {
  position: relative;
}

.comment-modal-textarea {
  width: 100%;
  padding: 16px 18px;
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  background: var(--editor-bg, #ffffff);
  color: var(--text-color, #1f2937);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  resize: vertical;
  min-height: 140px;
  transition: all 0.2s ease;
}

.comment-modal-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05);
}

.comment-modal-textarea::placeholder {
  color: var(--text-muted, #9ca3af);
}

.character-count {
  position: absolute;
  bottom: 12px;
  right: 16px;
  font-size: 12px;
  color: var(--text-muted, #9ca3af);
  background: var(--editor-bg, #ffffff);
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 500;
}

/* Mention Dropdown */
.comment-mention-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 8px);
  background: var(--editor-bg, #ffffff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
  max-height: 280px;
  overflow-y: auto;
  z-index: 1000;
}

.mention-dropdown-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted, #6b7280);
  background: var(--secondary-bg, #f9fafb);
  border-radius: 12px 12px 0 0;
}

.comment-mention-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.comment-mention-item:hover,
.comment-mention-item.active {
  background: linear-gradient(
    90deg,
    rgba(59, 130, 246, 0.08) 0%,
    rgba(139, 92, 246, 0.08) 100%
  );
}

.comment-mention-item.active {
  border-left: 3px solid #3b82f6;
}

.comment-mention-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.comment-mention-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  object-fit: cover;
}

.comment-mention-info {
  flex: 1;
  min-width: 0;
}

.comment-mention-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color, #1f2937);
  margin-bottom: 2px;
}

.comment-mention-email {
  font-size: 13px;
  color: var(--text-muted, #6b7280);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mention-check {
  color: #3b82f6;
  flex-shrink: 0;
}

/* Helper */
.comment-modal-helper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  gap: 16px;
}

.helper-tips {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.helper-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted, #6b7280);
  font-weight: 500;
}

.helper-tip svg {
  color: #3b82f6;
  flex-shrink: 0;
}

.helper-shortcut {
  font-size: 12px;
  color: var(--text-muted, #6b7280);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: var(--secondary-bg, #f9fafb);
  border-radius: 6px;
  border: 1px solid var(--border-color, #e5e7eb);
  white-space: nowrap;
}

.helper-shortcut kbd {
  padding: 2px 6px;
  background: var(--editor-bg, #ffffff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  font-family: monospace;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* Actions */
.comment-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 32px 28px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  background: var(--secondary-bg, #f9fafb);
  border-radius: 0 0 16px 16px;
}

.comment-modal-cancel,
.comment-modal-submit {
  padding: 11px 24px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-modal-cancel {
  background: transparent;
  color: var(--text-color, #374151);
  border: 2px solid var(--border-color, #e5e7eb);
}

.comment-modal-cancel:hover {
  background: var(--hover-bg, #f3f4f6);
  border-color: var(--text-muted, #9ca3af);
  transform: translateY(-1px);
}

.comment-modal-submit {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.comment-modal-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.comment-modal-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.comment-modal-submit svg {
  width: 16px;
  height: 16px;
}

/* Dark mode support */
.theme-dark .comment-modal {
  --editor-bg: #1f2937;
  --secondary-bg: #111827;
  --border-color: #374151;
  --text-color: #f9fafb;
  --text-muted: #9ca3af;
  --hover-bg: #374151;
}

.theme-dark .comment-selected-text-content {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1) 0%,
    rgba(139, 92, 246, 0.1) 100%
  );
}

.theme-dark .comment-mention-item:hover,
.theme-dark .comment-mention-item.active {
  background: linear-gradient(
    90deg,
    rgba(59, 130, 246, 0.15) 0%,
    rgba(139, 92, 246, 0.15) 100%
  );
}

/* Scrollbar */
.comment-modal-textarea::-webkit-scrollbar,
.comment-mention-dropdown::-webkit-scrollbar,
.selected-text-content::-webkit-scrollbar {
  width: 8px;
}

.comment-modal-textarea::-webkit-scrollbar-track,
.comment-mention-dropdown::-webkit-scrollbar-track,
.selected-text-content::-webkit-scrollbar-track {
  background: transparent;
}

.comment-modal-textarea::-webkit-scrollbar-thumb,
.comment-mention-dropdown::-webkit-scrollbar-thumb,
.selected-text-content::-webkit-scrollbar-thumb {
  background: var(--border-color, #d1d5db);
  border-radius: 4px;
}

.comment-modal-textarea::-webkit-scrollbar-thumb:hover,
.comment-mention-dropdown::-webkit-scrollbar-thumb:hover,
.selected-text-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted, #9ca3af);
}

/* Responsive */
@media (max-width: 640px) {
  .comment-modal {
    max-width: 100%;
    margin: 0;
    border-radius: 16px 16px 0 0;
    max-height: 95vh;
  }

  .comment-modal-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .comment-modal-header {
    padding: 24px 20px 16px;
  }

  .comment-modal-body {
    padding: 0 20px 20px;
  }

  .comment-modal-actions {
    padding: 16px 20px 24px;
    flex-direction: column-reverse;
  }

  .comment-modal-cancel,
  .comment-modal-submit {
    width: 100%;
    justify-content: center;
  }

  .comment-modal-helper {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .helper-shortcut {
    justify-content: center;
  }
}
</style>
