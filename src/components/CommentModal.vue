<template>
  <div
    v-if="isOpen"
    class="comment-modal-overlay"
    @click="handleCancel"
    @keydown.esc="handleCancel"
  >
    <div
      class="comment-modal"
      role="dialog"
      aria-labelledby="comment-modal-title"
      aria-modal="true"
      @click.stop
    >
      <!-- Header -->
      <div class="comment-modal-header">
        <h3 id="comment-modal-title" class="comment-modal-title">
          💬 Add Comment
        </h3>
        <button
          class="comment-modal-close"
          type="button"
          aria-label="Close comment modal"
          @click="handleCancel"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
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
        <div class="selected-text-label">Commenting on:</div>
        <div class="selected-text-content">
          "{{ selectedText }}"
        </div>
      </div>

      <!-- Comment Form -->
      <div class="comment-modal-body">
        <textarea
          ref="textareaRef"
          v-model="content"
          class="comment-modal-textarea"
          placeholder="Write your comment... (use @ to mention)"
          rows="4"
          autofocus
          @input="handleInput"
          @keydown="handleKeydown"
        />

        <!-- Mention Autocomplete Dropdown -->
        <div
          v-if="showMentions && mentionSuggestions.length > 0"
          class="comment-mention-dropdown"
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
              >
              <span v-else>
                {{ getInitials(suggestion.name) }}
              </span>
            </div>
            <div class="comment-mention-info">
              <div class="comment-mention-name">
                {{ suggestion.name }}
              </div>
              <div
                v-if="suggestion.email"
                class="comment-mention-email"
              >
                {{ suggestion.email }}
              </div>
            </div>
          </div>
        </div>

        <!-- Helper Text -->
        <div class="comment-modal-helper">
          <span class="helper-tip">💡 Tip: Use @ to mention someone</span>
          <span class="helper-shortcut">Press Ctrl+Enter to submit</span>
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
          Add Comment
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import type { MentionSuggestion } from "../composables/useComments";

interface Props {
  isOpen: boolean;
  selectedText?: string;
}

interface Emits {
  (e: "submit", content: string, mentions: string[]): void;
  (e: "cancel"): void;
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  selectedText: "",
});

const emit = defineEmits<Emits>();

// Refs
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const content = ref("");
const showMentions = ref(false);
const mentionQuery = ref("");
const selectedMentionIndex = ref(0);

// Mock mention suggestions (in real app, would come from useComments.searchMentions)
const mentionSuggestions = computed<MentionSuggestion[]>(() => {
  if (!mentionQuery.value) return [];

  // Mock data - in real app, call useComments.searchMentions(mentionQuery.value)
  const allUsers: MentionSuggestion[] = [
    { id: "user1", name: "John Doe", email: "john@example.com" },
    { id: "user2", name: "Jane Smith", email: "jane@example.com" },
    { id: "user3", name: "Bob Johnson", email: "bob@example.com" },
  ];

  const query = mentionQuery.value.toLowerCase();
  return allUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(query) ||
      (user.email && user.email.toLowerCase().includes(query))
  );
});

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
    }
  }
);

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
  } else {
    showMentions.value = false;
    mentionQuery.value = "";
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
.comment-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.comment-modal {
  background: var(--editor-bg, #ffffff);
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.comment-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.comment-modal-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-color, #1f2937);
  margin: 0;
}

.comment-modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #6b7280);
  transition: all 0.2s ease;
}

.comment-modal-close:hover {
  background: var(--hover-bg, #f3f4f6);
  color: var(--error-color, #dc3545);
}

.comment-selected-text {
  padding: 16px 24px;
  background: var(--secondary-bg, #f9fafb);
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.selected-text-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.selected-text-content {
  font-size: 14px;
  color: var(--text-color, #1f2937);
  font-style: italic;
  line-height: 1.5;
  padding: 8px 12px;
  background: var(--editor-bg, #ffffff);
  border-left: 3px solid var(--primary-color, #3b82f6);
  border-radius: 4px;
  max-height: 80px;
  overflow-y: auto;
}

.comment-modal-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.comment-modal-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  background: var(--editor-bg, #ffffff);
  color: var(--text-color, #1f2937);
  font-family: inherit;
  font-size: 15px;
  line-height: 1.6;
  resize: vertical;
  min-height: 120px;
  transition: all 0.2s ease;
}

.comment-modal-textarea:focus {
  outline: none;
  border-color: var(--primary-color, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.comment-mention-dropdown {
  position: absolute;
  left: 24px;
  right: 24px;
  background: var(--editor-bg, #ffffff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  max-height: 240px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 8px;
}

.comment-mention-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.comment-mention-item:hover,
.comment-mention-item.active {
  background: var(--hover-bg, #f3f4f6);
}

.comment-mention-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary-color, #3b82f6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
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
  font-weight: 600;
  color: var(--text-color, #1f2937);
}

.comment-mention-email {
  font-size: 13px;
  color: var(--text-muted, #6b7280);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-modal-helper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-muted, #6b7280);
}

.helper-tip {
  display: flex;
  align-items: center;
  gap: 4px;
}

.helper-shortcut {
  font-weight: 500;
  padding: 4px 8px;
  background: var(--secondary-bg, #f9fafb);
  border-radius: 4px;
  border: 1px solid var(--border-color, #e5e7eb);
}

.comment-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color, #e5e7eb);
}

.comment-modal-cancel,
.comment-modal-submit {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.comment-modal-cancel {
  background: transparent;
  color: var(--text-muted, #6b7280);
  border: 2px solid var(--border-color, #e5e7eb);
}

.comment-modal-cancel:hover {
  background: var(--hover-bg, #f3f4f6);
  color: var(--text-color, #1f2937);
  border-color: var(--text-muted, #6b7280);
}

.comment-modal-submit {
  background: var(--primary-color, #3b82f6);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}

.comment-modal-submit:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
}

.comment-modal-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Dark mode support */
:global(.dark-mode) .comment-modal {
  --editor-bg: #1f2937;
  --secondary-bg: #111827;
  --border-color: #374151;
  --text-color: #f9fafb;
  --text-muted: #9ca3af;
  --hover-bg: #374151;
  --primary-color: #3b82f6;
  --error-color: #ef4444;
}

/* Responsive */
@media (max-width: 640px) {
  .comment-modal {
    max-width: 100%;
    margin: 0;
    border-radius: 0;
    max-height: 100vh;
  }

  .comment-modal-overlay {
    padding: 0;
  }

  .comment-modal-helper {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
