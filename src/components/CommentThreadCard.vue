<template>
  <div
    class="comment-thread-card"
    :class="{ 'comment-thread-card-active': isActive }"
    @click="handleSelect"
  >
    <!-- Thread Header -->
    <div class="comment-thread-header">
      <div class="comment-thread-meta">
        <span class="comment-thread-author">
          {{ thread.comments[0]?.author.name }}
        </span>
        <span class="comment-thread-time">
          {{ formatTime(thread.createdAt) }}
        </span>
      </div>
      <div class="comment-thread-actions">
        <button
          v-if="thread.status === 'open'"
          class="comment-action-btn"
          aria-label="Resolve thread"
          title="Resolve thread"
          @click.stop="emit('resolve', thread.id)"
        >
          <svg
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
        </button>
        <button
          v-else
          class="comment-action-btn"
          aria-label="Reopen thread"
          title="Reopen thread"
          @click.stop="emit('reopen', thread.id)"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M3 8h10M8 3v10"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <button
          class="comment-action-btn comment-action-delete"
          aria-label="Delete thread"
          title="Delete thread"
          @click.stop="handleDelete"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M13 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Thread Text Preview -->
    <div class="comment-thread-text">
      {{ thread.rangeData.text }}
    </div>

    <!-- First Comment -->
    <div
      v-if="thread.comments[0]"
      class="comment-item"
    >
      <div class="comment-avatar">
        <img
          v-if="thread.comments[0].author.avatarUrl"
          :src="thread.comments[0].author.avatarUrl"
          :alt="thread.comments[0].author.name"
        >
        <span v-else>
          {{ getInitials(thread.comments[0].author.name) }}
        </span>
      </div>
      <div class="comment-content">
        <div
          class="comment-text"
          v-html="renderCommentContent(thread.comments[0].content)"
        />
        <span
          v-if="thread.comments[0].isEdited"
          class="comment-edited"
        >
          (edited)
        </span>
      </div>
    </div>

    <!-- Reply Count -->
    <div
      v-if="thread.comments.length > 1"
      class="comment-replies-count"
    >
      {{ thread.comments.length - 1 }}
      {{ thread.comments.length === 2 ? "reply" : "replies" }}
    </div>

    <!-- All Replies (when expanded) -->
    <template v-if="isActive && thread.comments.length > 1">
      <div
        v-for="comment in thread.comments.slice(1)"
        :key="comment.id"
        class="comment-item comment-reply"
      >
        <div class="comment-avatar">
          <img
            v-if="comment.author.avatarUrl"
            :src="comment.author.avatarUrl"
            :alt="comment.author.name"
          >
          <span v-else>
            {{ getInitials(comment.author.name) }}
          </span>
        </div>
        <div class="comment-content">
          <div class="comment-meta">
            <span class="comment-author">
              {{ comment.author.name }}
            </span>
            <span class="comment-time">
              {{ formatTime(comment.createdAt) }}
            </span>
          </div>
          <div
            class="comment-text"
            v-html="renderCommentContent(comment.content)"
          />
          <span
            v-if="comment.isEdited"
            class="comment-edited"
          > (edited) </span>
        </div>
      </div>
    </template>

    <!-- Reply Form (when active) -->
    <CommentReplyForm
      v-if="isActive && showReplyForm"
      @submit="handleReplySubmit"
      @cancel="showReplyForm = false"
    />

    <!-- Add Reply Button (when active and no form) -->
    <button
      v-if="isActive && !showReplyForm"
      class="comment-add-reply-btn"
      @click.stop="showReplyForm = true"
    >
      Add reply
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { CommentThread } from "../composables/useComments";
import CommentReplyForm from "./CommentReplyForm.vue";

interface Props {
  thread: CommentThread;
  isActive: boolean;
}

interface Emits {
  (e: "select", threadId: string): void;
  (e: "resolve", threadId: string): void;
  (e: "reopen", threadId: string): void;
  (e: "delete", threadId: string): void;
  (e: "add-reply", threadId: string, content: string, mentions: string[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// State
const showReplyForm = ref(false);

// Methods
function handleSelect() {
  emit("select", props.thread.id);
}

function handleDelete() {
  if (confirm("Are you sure you want to delete this thread?")) {
    emit("delete", props.thread.id);
  }
}

function handleReplySubmit(content: string, mentions: string[]) {
  emit("add-reply", props.thread.id, content, mentions);
  showReplyForm.value = false;
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function renderCommentContent(content: string): string {
  // Replace @mentions with styled spans
  return content.replace(
    /@(\w+)/g,
    '<span class="comment-mention">@$1</span>'
  );
}
</script>

<style scoped>
.comment-action-delete:hover {
  color: var(--error-color, #dc3545);
}

.comment-add-reply-btn {
  width: 100%;
  padding: 8px;
  margin-top: 8px;
  background: transparent;
  border: 1px dashed var(--border-color);
  border-radius: 4px;
  color: var(--primary-color);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.comment-add-reply-btn:hover {
  background: var(--hover-bg);
  border-style: solid;
}
</style>
