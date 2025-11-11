<template>
  <div class="comments-sidebar" :class="{ 'comments-sidebar-open': isOpen }">
    <!-- Header -->
    <div class="comments-sidebar-header">
      <h3 class="comments-sidebar-title">Comments</h3>
      <button
        class="comments-sidebar-close"
        @click="closeSidebar"
        aria-label="Close comments sidebar"
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

    <!-- Tabs -->
    <div class="comments-tabs">
      <button
        class="comments-tab"
        :class="{ active: activeTab === 'open' }"
        @click="activeTab = 'open'"
      >
        Open
        <span class="comments-tab-badge">{{ openThreads.length }}</span>
      </button>
      <button
        class="comments-tab"
        :class="{ active: activeTab === 'resolved' }"
        @click="activeTab = 'resolved'"
      >
        Resolved
        <span class="comments-tab-badge">{{ resolvedThreads.length }}</span>
      </button>
    </div>

    <!-- Thread List -->
    <div class="comments-thread-list">
      <template v-if="currentThreads.length === 0">
        <div class="comments-empty-state">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path
              d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 27.1 4.7 30.05 5.95 32.7L4 44L15.3 42.05C17.95 43.3 20.9 44 24 44Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M32 28H16M32 20H16"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <p class="comments-empty-text">
            {{
              activeTab === "open"
                ? "No open comments yet"
                : "No resolved comments"
            }}
          </p>
          <p class="comments-empty-hint">
            Select text and click the comment button to add a comment
          </p>
        </div>
      </template>
      <template v-else>
        <CommentThreadCard
          v-for="thread in currentThreads"
          :key="thread.id"
          :thread="thread"
          :is-active="activeThreadId === thread.id"
          @select="selectThread"
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
      @click="createNewComment"
      aria-label="Add new comment"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 5v14m-7-7h14"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>
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
.comments-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-muted);
}

.comments-empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.comments-empty-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-color);
}

.comments-empty-hint {
  font-size: 14px;
  line-height: 1.5;
  max-width: 250px;
}
</style>
