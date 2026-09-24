<!-- eslint-disable vue/html-self-closing -->
<template>
  <div
    class="comment-thread-card"
    :data-thread-id="thread.id"
    :class="{ 'comment-thread-card-expanded': isExpanded }"
  >
    <!-- Selected Text Quote -->
    <div
      v-if="thread.rangeData.text"
      class="comment-quote"
      @click="handleToggle"
    >
      <div class="comment-quote-bar" />
      <div class="comment-quote-content">
        <div class="comment-quote-text">"{{ thread.rangeData.text }}"</div>
      </div>
    </div>

    <!-- Main Comment -->
    <div class="comment-main" @click="handleToggle">
      <div class="comment-avatar-wrapper">
        <div
          class="comment-avatar"
          :style="{ background: thread.comments[0]?.author.color || '#3b82f6' }"
        >
          <img
            v-if="thread.comments[0]?.author.avatarUrl"
            :src="thread.comments[0].author.avatarUrl"
            :alt="thread.comments[0]?.author.name"
          />
          <span v-else>
            {{ getInitials(thread.comments[0]?.author.name || "") }}
          </span>
        </div>
      </div>

      <div class="comment-body">
        <div class="comment-header">
          <div class="comment-meta">
            <span class="comment-author">
              {{ thread.comments[0]?.author.name }}
            </span>
            <span class="comment-time">
              {{ formatTime(thread.createdAt) }}
            </span>
          </div>

          <div class="comment-actions" @click.stop>
            <button
              v-if="thread.status === 'open'"
              class="comment-action-btn"
              aria-label="Resolve thread"
              title="Mark as resolved"
              @click="emit('resolve', thread.id)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
              @click="emit('reopen', thread.id)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 2v12M2 8h12"
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
              @click="handleDelete"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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

        <div
          class="comment-text"
          v-html="renderCommentContent(thread.comments[0]?.content || '')"
        />

        <!-- Status Badge -->
        <div v-if="thread.status === 'resolved'" class="comment-status-badge">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M10 3L4.5 8.5L2 6"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Resolved
        </div>
      </div>
    </div>

    <!-- Reply Count Button -->
    <button
      v-if="thread.comments.length > 1 && !isExpanded"
      class="comment-replies-toggle"
      @click="handleToggle"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M2 8h8M8 2L14 8l-6 6"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      View {{ thread.comments.length - 1 }}
      {{ thread.comments.length === 2 ? "reply" : "replies" }}
    </button>

    <!-- Add Reply Button (always visible when not showing form) -->
    <button
      v-if="!showReplyForm"
      ref="replyButtonRef"
      class="comment-add-reply-btn"
      @click.stop="openReplyForm"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 2v12M2 8h12"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
      Write a reply
    </button>

    <!-- Reply Form (when active) -->
    <div v-if="showReplyForm" class="comment-reply-standalone">
      <div class="comment-avatar-wrapper">
        <div class="comment-avatar comment-avatar-small">
          <span>U</span>
        </div>
      </div>
      <div class="comment-body">
        <CommentReplyForm
          :initial-content="replyDraft"
          :autofocus="focusReplyOnMount"
          :mention-search="mentionSearch"
          @draft-change="emit('reply-draft', thread.id, $event)"
          @submit="handleReplySubmit"
          @cancel="closeReplyForm"
        />
      </div>
    </div>

    <!-- Expanded Replies -->
    <Transition name="expand">
      <div
        v-if="isExpanded && thread.comments.length > 1"
        class="comment-replies"
      >
        <div
          v-for="comment in thread.comments.slice(1)"
          :key="comment.id"
          class="comment-reply"
        >
          <div class="comment-avatar-wrapper">
            <div
              class="comment-avatar comment-avatar-small"
              :style="{ background: comment.author.color || '#8b5cf6' }"
            >
              <img
                v-if="comment.author.avatarUrl"
                :src="comment.author.avatarUrl"
                :alt="comment.author.name"
              />
              <span v-else>
                {{ getInitials(comment.author.name) }}
              </span>
            </div>
          </div>

          <div class="comment-body">
            <div class="comment-header">
              <div class="comment-meta">
                <span class="comment-author">
                  {{ comment.author.name }}
                </span>
                <span class="comment-time">
                  {{ formatTime(comment.createdAt) }}
                </span>
              </div>
            </div>

            <div
              class="comment-text"
              v-html="renderCommentContent(comment.content)"
            />

            <span v-if="comment.isEdited" class="comment-edited">
              (edited)
            </span>
          </div>
        </div>

        <!-- Collapse Button -->
        <button class="comment-collapse-btn" @click="handleToggle">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M11 9L7 5L3 9"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Hide replies
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";
import type {
  CommentThread,
  MentionSuggestion,
} from "../composables/useComments";
import CommentReplyForm from "./CommentReplyForm.vue";

interface Props {
  replyDraft?: string;
  thread: CommentThread;
  isActive: boolean;
  isExpanded?: boolean;
  /** Host-supplied @mention provider, passed through to the reply form. */
  mentionSearch?: (
    query: string
  ) => Promise<MentionSuggestion[]> | MentionSuggestion[];
}

interface Emits {
  (e: "reply-draft", threadId: string, content: string | undefined): void;
  (e: "select", threadId: string): void;
  (e: "toggle", threadId: string): void;
  (e: "resolve", threadId: string): void;
  (e: "reopen", threadId: string): void;
  (e: "delete", threadId: string): void;
  (e: "add-reply", threadId: string, content: string, mentions: string[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  replyDraft: undefined,
  isExpanded: false,
  mentionSearch: undefined,
});

const emit = defineEmits<Emits>();

// State
const showReplyForm = ref(props.replyDraft !== undefined);
const focusReplyOnMount = ref(props.replyDraft === undefined);
const replyButtonRef = ref<HTMLButtonElement | null>(null);

// Methods
function openReplyForm() {
  focusReplyOnMount.value = true;
  showReplyForm.value = true;
  emit("reply-draft", props.thread.id, props.replyDraft ?? "");
}

function handleToggle() {
  emit("toggle", props.thread.id);
}

function handleDelete() {
  if (confirm("Are you sure you want to delete this thread?")) {
    emit("delete", props.thread.id);
  }
}

function handleReplySubmit(content: string, mentions: string[]) {
  emit("add-reply", props.thread.id, content, mentions);
  closeReplyForm();
}

function closeReplyForm() {
  emit("reply-draft", props.thread.id, undefined);
  showReplyForm.value = false;
  nextTick(() => replyButtonRef.value?.focus());
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
  // Comment bodies are ARBITRARY USER INPUT (typed in a plain textarea, or
  // arriving via importThreads' JSON) rendered through v-html. Escape the
  // content FIRST — an unescaped `<img onerror=…>` here was a stored XSS in
  // every viewer's page — then layer the mention styling on the safe text.
  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  return escaped.replace(
    /@(\w+)/g,
    '<span class="comment-mention">@$1</span>'
  );
}
</script>

<style scoped>
/* Transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 2000px;
  transform: translateY(0);
}

/* Thread Card */
.comment-thread-card {
  padding: 20px;
  margin: 12px;
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  background: var(--editor-bg, #ffffff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.comment-thread-card:hover {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.02) 0%,
    rgba(139, 92, 246, 0.02) 100%
  );
  border-color: var(--toolbar-accent, #3b82f6);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.12);
  transform: translateY(-2px);
}

.comment-thread-card-expanded {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.03) 0%,
    rgba(139, 92, 246, 0.03) 100%
  );
  border-color: var(--toolbar-accent, #3b82f6);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.15);
  cursor: default;
}

/* Quote */
.comment-quote {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.03) 0%,
    rgba(139, 92, 246, 0.03) 100%
  );
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.comment-quote:hover {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.06) 0%,
    rgba(139, 92, 246, 0.06) 100%
  );
}

.comment-quote-bar {
  width: 3px;
  background: var(--toolbar-accent, #3b82f6);
  border-radius: 2px;
  flex-shrink: 0;
}

.comment-quote-content {
  flex: 1;
  min-width: 0;
}

.comment-quote-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted, #6b7280);
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Main Comment */
.comment-main {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.comment-avatar-wrapper {
  flex-shrink: 0;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--toolbar-accent, #3b82f6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.comment-avatar-small {
  width: 32px;
  height: 32px;
  font-size: 12px;
}

.comment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

/* Comment Header */
.comment-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
  gap: 12px;
}

.comment-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.comment-author {
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-color, #111827);
}

.comment-time {
  font-size: 12px;
  color: var(--text-muted, #9ca3af);
  font-weight: 500;
}

.comment-actions {
  display: flex;
  flex-shrink: 0;
  gap: 4px;
}

.comment-action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #9ca3af);
  transition: all 0.2s ease;
}

.comment-action-btn:hover {
  background: var(--hover-bg, #f3f4f6);
  color: var(--text-color, #1f2937);
}

.comment-action-btn:focus-visible {
  outline: 2px solid var(--toolbar-accent, #3b82f6);
  outline-offset: 2px;
}

@media (any-pointer: coarse), (max-width: 640px) {
  .comment-action-btn {
    width: 44px;
    height: 44px;
  }
}

.comment-action-delete:hover {
  color: var(--error-color, #ef4444);
  background: rgba(239, 68, 68, 0.1);
}

/* Comment Text */
.comment-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-color, #1f2937);
  word-wrap: break-word;
  margin-bottom: 8px;
}

.comment-text :deep(.comment-mention) {
  color: var(--toolbar-accent, #3b82f6);
  font-weight: 600;
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
}

.comment-edited {
  font-size: 12px;
  color: var(--text-muted, #9ca3af);
  font-style: italic;
}

/* Status Badge */
.comment-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 8px;
}

/* Reply Toggle */
.comment-replies-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-top: 8px;
  margin-left: 52px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-muted, #6b7280);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.comment-replies-toggle:hover {
  background: var(--hover-bg, #f3f4f6);
  color: var(--toolbar-accent, #3b82f6);
}

.comment-replies-toggle svg {
  transition: transform 0.2s ease;
}

/* Replies */
.comment-replies {
  margin-top: 12px;
  padding-left: 52px;
  border-left: 2px solid var(--border-color, #e5e7eb);
  margin-left: 20px;
}

.comment-reply {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.comment-reply:last-child {
  margin-bottom: 0;
}

/* Standalone Reply Form */
.comment-reply-standalone {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.03) 0%,
    rgba(139, 92, 246, 0.03) 100%
  );
  border-radius: 10px;
  border: 2px solid transparent;
  background-clip: padding-box;
  position: relative;
}

.comment-reply-standalone::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 10px;
  padding: 2px;
  background: var(--toolbar-accent, #3b82f6);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.3;
}

/* Add Reply Button */
.comment-add-reply-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  margin-top: 12px;
  background: transparent;
  border: 2px dashed var(--border-color, #e5e7eb);
  border-radius: 8px;
  color: var(--text-muted, #6b7280);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.comment-add-reply-btn:hover {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.05) 0%,
    rgba(139, 92, 246, 0.05) 100%
  );
  border-color: var(--toolbar-accent, #3b82f6);
  border-style: solid;
  color: var(--toolbar-accent, #3b82f6);
}

/* Collapse Button */
.comment-collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  margin-top: 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-muted, #9ca3af);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.comment-collapse-btn:hover {
  background: var(--hover-bg, #f3f4f6);
  color: var(--text-color, #1f2937);
}

/* Dark Mode */
.theme-dark .comment-thread-card {
  --editor-bg: #1f2937;
  --hover-bg: #374151;
  --border-color: #4b5563;
  --text-color: #f9fafb;
  --text-muted: #9ca3af;
}

.theme-dark .comment-quote {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.08) 0%,
    rgba(139, 92, 246, 0.08) 100%
  );
}

.theme-dark .comment-quote:hover {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.12) 0%,
    rgba(139, 92, 246, 0.12) 100%
  );
}
</style>
