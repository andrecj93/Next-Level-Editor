<template>
  <div
    class="comments-sidebar"
    :class="{ 'comments-sidebar-open': isOpen }"
  >
    <!-- Backdrop for mobile -->
    <div
      v-if="isOpen"
      class="comments-sidebar-backdrop"
      @click="closeSidebar"
    />

    <!-- Sidebar Content -->
    <div class="comments-sidebar-content">
      <!-- Header -->
      <div class="comments-sidebar-header">
        <div class="comments-header-top">
          <div class="comments-header-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <h3 class="comments-sidebar-title">
            Comments
          </h3>
          <button
            class="comments-sidebar-close"
            aria-label="Close comments sidebar"
            @click="closeSidebar"
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

        <!-- Tabs -->
        <div class="comments-tabs">
          <button
            class="comments-tab"
            :class="{ active: activeTab === 'open' }"
            @click="activeTab = 'open'"
          >
            <span class="comments-tab-label">Open</span>
            <span class="comments-tab-badge">{{ openThreads.length }}</span>
          </button>
          <button
            class="comments-tab"
            :class="{ active: activeTab === 'resolved' }"
            @click="activeTab = 'resolved'"
          >
            <span class="comments-tab-label">Resolved</span>
            <span class="comments-tab-badge">{{ resolvedThreads.length }}</span>
          </button>
        </div>
      </div>

      <!-- Thread List -->
      <div class="comments-thread-list">
        <template v-if="currentThreads.length === 0">
          <div class="comments-empty-state">
            <div class="comments-empty-icon">
              <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                fill="none"
              >
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  stroke-width="2"
                  opacity="0.2"
                />
                <path
                  d="M32 48C41.9411 48 50 39.9411 50 30C50 20.0589 41.9411 12 32 12C22.0589 12 14 20.0589 14 30C14 32.5 14.5 34.9 15.4 37.1L14 50L26.9 48.6C29.1 49.5 31.5 50 32 48Z"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle
                  cx="24"
                  cy="28"
                  r="2"
                  fill="currentColor"
                />
                <circle
                  cx="32"
                  cy="28"
                  r="2"
                  fill="currentColor"
                />
                <circle
                  cx="40"
                  cy="28"
                  r="2"
                  fill="currentColor"
                />
              </svg>
            </div>
            <p class="comments-empty-text">
              {{
                activeTab === "open"
                  ? "No comments yet"
                  : "No resolved comments"
              }}
            </p>
            <p class="comments-empty-hint">
              Select text and add your first comment to start a conversation
            </p>
          </div>
        </template>
        <template v-else>
          <CommentThreadCard
            v-for="thread in currentThreads"
            :key="thread.id"
            :thread="thread"
            :is-active="activeThreadId === thread.id"
            :is-expanded="expandedThreads.has(thread.id)"
            @select="selectThread"
            @toggle="toggleThread"
            @resolve="resolveThread"
            @reopen="reopenThread"
            @delete="deleteThread"
            @add-reply="addReply"
          />
        </template>
      </div>

      <!-- New Comment FAB -->
      <button
        v-if="activeTab === 'open'"
        class="comments-fab"
        aria-label="Add new comment"
        title="Add new comment"
        @click="createNewComment"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 5v14m-7-7h14"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { CommentThread } from "../composables/useComments";
import CommentThreadCard from "./CommentThreadCard.vue";

interface Props {
  threads: CommentThread[];
  activeThreadId: string | null;
  isOpen?: boolean;
}

interface Emits {
  (e: "close"): void;
  (e: "select-thread", threadId: string): void;
  (e: "resolve-thread", threadId: string): void;
  (e: "reopen-thread", threadId: string): void;
  (e: "delete-thread", threadId: string): void;
  (e: "add-reply", threadId: string, content: string, mentions: string[]): void;
  (e: "create-comment"): void;
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: true,
});

const emit = defineEmits<Emits>();

// State
const activeTab = ref<"open" | "resolved">("open");
const expandedThreads = ref<Set<string>>(new Set());

// Computed
const openThreads = computed(() =>
  props.threads.filter((thread) => thread.status === "open")
);

const resolvedThreads = computed(() =>
  props.threads.filter((thread) => thread.status === "resolved")
);

const currentThreads = computed(() =>
  activeTab.value === "open" ? openThreads.value : resolvedThreads.value
);

// Methods
function closeSidebar() {
  emit("close");
}

function selectThread(threadId: string) {
  emit("select-thread", threadId);
  // Auto-expand when selecting a thread
  if (!expandedThreads.value.has(threadId)) {
    expandedThreads.value.add(threadId);
  }
}

function toggleThread(threadId: string) {
  if (expandedThreads.value.has(threadId)) {
    expandedThreads.value.delete(threadId);
  } else {
    expandedThreads.value.add(threadId);
  }
  // Trigger reactivity
  expandedThreads.value = new Set(expandedThreads.value);
}

function resolveThread(threadId: string) {
  emit("resolve-thread", threadId);
}

function reopenThread(threadId: string) {
  emit("reopen-thread", threadId);
}

function deleteThread(threadId: string) {
  emit("delete-thread", threadId);
}

function addReply(threadId: string, content: string, mentions: string[]) {
  emit("add-reply", threadId, content, mentions);
}

function createNewComment() {
  emit("create-comment");
}
</script>

<style scoped>
/* Sidebar Container */
.comments-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  z-index: 9999;
  pointer-events: none;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.comments-sidebar-content {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  background: var(--editor-bg, #ffffff);
  border-left: 1px solid var(--border-color, #e5e7eb);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: all;
}

.comments-sidebar-open .comments-sidebar-content {
  transform: translateX(0);
}

/* Backdrop */
.comments-sidebar-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;
  pointer-events: all;
  display: none;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

/* Header */
.comments-sidebar-header {
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  background: var(--secondary-bg, #f9fafb);
}

.comments-header-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px 16px;
}

.comments-header-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.comments-sidebar-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-color, #111827);
  margin: 0;
  flex: 1;
}

.comments-sidebar-close {
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

.comments-sidebar-close:hover {
  background: var(--hover-bg, #f3f4f6);
  color: var(--text-color, #1f2937);
}

/* Tabs */
.comments-tabs {
  display: flex;
  gap: 4px;
  padding: 0 24px 16px;
}

.comments-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted, #6b7280);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.comments-tab:hover {
  background: var(--hover-bg, #f3f4f6);
  color: var(--text-color, #1f2937);
}

.comments-tab.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.comments-tab-label {
  font-weight: 600;
}

.comments-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  background: var(--badge-bg, #e5e7eb);
  color: var(--text-color, #374151);
  border-radius: 11px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.comments-tab.active .comments-tab-badge {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

/* Thread List */
.comments-thread-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

/* Empty State */
.comments-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 32px;
  text-align: center;
  min-height: 400px;
}

.comments-empty-icon {
  margin-bottom: 24px;
  color: var(--text-muted, #9ca3af);
  opacity: 0.6;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.comments-empty-text {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-color, #111827);
}

.comments-empty-hint {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-muted, #6b7280);
  max-width: 280px;
}

/* FAB */
.comments-fab {
  position: absolute;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.comments-fab:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 12px 32px rgba(59, 130, 246, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15) inset;
}

.comments-fab:active {
  transform: translateY(0) scale(0.98);
}

/* Scrollbar */
.comments-thread-list::-webkit-scrollbar {
  width: 8px;
}

.comments-thread-list::-webkit-scrollbar-track {
  background: transparent;
}

.comments-thread-list::-webkit-scrollbar-thumb {
  background: var(--border-color, #d1d5db);
  border-radius: 4px;
}

.comments-thread-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted, #9ca3af);
}

/* Dark mode */
:global(.dark-mode) .comments-sidebar-content {
  --editor-bg: #1f2937;
  --secondary-bg: #111827;
  --border-color: #374151;
  --text-color: #f9fafb;
  --text-muted: #9ca3af;
  --hover-bg: #374151;
  --badge-bg: #374151;
}

/* Responsive */
@media (max-width: 768px) {
  .comments-sidebar {
    width: 100%;
  }

  .comments-sidebar-backdrop {
    display: block;
  }

  .comments-fab {
    bottom: 16px;
    right: 16px;
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }
}
</style>
