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

    <!-- Actions -->
    <div class="comment-reply-actions">
      <button
        class="comment-reply-cancel"
        type="button"
        @click="handleCancel"
      >
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
import { ref, computed, nextTick } from "vue";
import type { MentionSuggestion } from "../composables/useComments";

interface Emits {
  (e: "submit", content: string, mentions: string[]): void;
  (e: "cancel"): void;
}

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

const mentionDropdownStyle = computed(() => {
  // Position dropdown above textarea
  return {
    bottom: "100%",
    marginBottom: "8px",
  };
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

  // Reset form
  content.value = "";
  showMentions.value = false;
  mentionQuery.value = "";
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
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--secondary-bg);
  color: var(--text-color);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  min-height: 60px;
}

.comment-reply-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
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
  gap: 8px;
  margin-top: 8px;
}

.comment-reply-cancel,
.comment-reply-submit {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.comment-reply-cancel {
  background: transparent;
  color: var(--text-muted);
}

.comment-reply-cancel:hover {
  background: var(--hover-bg);
  color: var(--text-color);
}

.comment-reply-submit {
  background: var(--primary-color);
  color: white;
}

.comment-reply-submit:hover:not(:disabled) {
  opacity: 0.9;
}

.comment-reply-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
