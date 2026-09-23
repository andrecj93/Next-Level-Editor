<template>
  <div class="comments-sidebar" :class="{ 'comments-sidebar-open': isOpen }">
    <!-- Backdrop for mobile -->
    <div
      v-if="isOpen"
      class="comments-sidebar-backdrop"
      @click="closeSidebar"
    />

    <!-- Sidebar Content. Closing is done with a CSS transform, which moves the
         panel off-screen but leaves every control focusable and in the
         accessibility tree — Tab landed on four invisible buttons. #R23-21 -->
    <div
      ref="sidebarContentRef"
      class="comments-sidebar-content"
      role="complementary"
      :aria-label="t('Comments')"
      :inert="!isOpen ? true : undefined"
      :aria-hidden="!isOpen ? 'true' : undefined"
    >
      <!-- Header -->
      <div class="comments-sidebar-header">
        <div class="comments-header-top">
          <div class="comments-header-icon">
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
          <h3 class="comments-sidebar-title">{{ t("Comments") }}</h3>
          <button
            v-if="activeTab === 'open' && !readonly"
            class="comments-fab"
            type="button"
            :aria-label="t('Add new comment')"
            :title="t('Add new comment')"
            @click="createNewComment"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
          <button
            ref="closeButtonRef"
            class="comments-sidebar-close"
            :aria-label="t('Close comments sidebar')"
            @click="closeSidebar"
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
        <div class="comments-tabs" role="tablist" :aria-label="t('Comment threads')">
          <button
            class="comments-tab"
            role="tab"
            :aria-selected="activeTab === 'open'"
            :class="{ active: activeTab === 'open' }"
            @click="activeTab = 'open'"
          >
            <span class="comments-tab-label">{{ t("Open") }}</span>
            <span class="comments-tab-badge">{{ number(openThreads.length) }}</span>
          </button>
          <button
            class="comments-tab"
            role="tab"
            :aria-selected="activeTab === 'resolved'"
            :class="{ active: activeTab === 'resolved' }"
            @click="activeTab = 'resolved'"
          >
            <span class="comments-tab-label">{{ t("Resolved") }}</span>
            <span class="comments-tab-badge">{{ number(resolvedThreads.length) }}</span>
          </button>
        </div>
      </div>

      <!-- Thread List -->
      <div class="comments-thread-list">
        <p v-if="readonly" class="comments-readonly-notice" role="status">{{ t("Comments are read-only.") }}</p>
        <template v-if="currentThreads.length === 0">
          <div class="comments-empty-state">
            <div class="comments-empty-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
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
                <circle cx="24" cy="28" r="2" fill="currentColor" />
                <circle cx="32" cy="28" r="2" fill="currentColor" />
                <circle cx="40" cy="28" r="2" fill="currentColor" />
              </svg>
            </div>
            <p class="comments-empty-text">
              {{
                t(activeTab === "open"
                  ? "No comments yet"
                  : "No resolved comments")
              }}
            </p>
            <p v-if="!readonly" class="comments-empty-hint">
              {{ t("Select text and add your first comment to start a conversation") }}
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
            :mention-search="mentionSearch"
            :readonly="readonly"
            @select="selectThread"
            @toggle="toggleThread"
            @resolve="resolveThread"
            @reopen="reopenThread"
            @delete="deleteThread"
            @add-reply="addReply"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorLocale } from "../composables/useEditorLocale";
const { t, number } = useEditorLocale();
import { ref, computed, watch, nextTick } from "vue";
import type {
  CommentThread,
  MentionSuggestion,
} from "../composables/useComments";
import CommentThreadCard from "./CommentThreadCard.vue";

interface Props {
  threads: CommentThread[];
  activeThreadId: string | null;
  isOpen?: boolean;
  readonly?: boolean;
  /** Host-supplied @mention provider, passed through to the reply forms. */
  mentionSearch?: (
    query: string
  ) => Promise<MentionSuggestion[]> | MentionSuggestion[];
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
  readonly: false,
  mentionSearch: undefined,
});

const emit = defineEmits<Emits>();

// The "Open comments" FAB unmounts itself on activation (its v-if includes
// !showCommentsSidebar), so focus would fall to <body> the instant the sidebar
// appears. Move focus into the panel — its Close button — when it opens, so a
// keyboard user lands inside the dialog they just summoned. #R23-22
const sidebarContentRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLElement | null>(null);

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      nextTick(() => closeButtonRef.value?.focus());
    }
  }
);

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
  if (props.readonly) return;
  emit("resolve-thread", threadId);
  focusActiveTab();
}

function reopenThread(threadId: string) {
  if (props.readonly) return;
  emit("reopen-thread", threadId);
  focusActiveTab();
}

// Resolving or reopening removes the focused card from the current list.
// Keep the next keyboard action inside the panel instead of losing it to body.
function focusActiveTab() {
  nextTick(() => sidebarContentRef.value
    ?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')
    ?.focus());
}

function deleteThread(threadId: string) {
  if (props.readonly) return;
  emit("delete-thread", threadId);
}

function addReply(threadId: string, content: string, mentions: string[]) {
  if (props.readonly) return;
  emit("add-reply", threadId, content, mentions);
  // Ensure thread stays expanded after adding reply
  if (!expandedThreads.value.has(threadId)) {
    expandedThreads.value.add(threadId);
    expandedThreads.value = new Set(expandedThreads.value);
  }
}

function createNewComment() {
  if (props.readonly) return;
  emit("create-comment");
}

/** Reveal the passage's discussion, even when its thread is already selected. */
function revealThread(threadId: string) {
  const thread = props.threads.find(item => item.id === threadId);
  if (!thread) return;
  activeTab.value = thread.status;
  expandedThreads.value = new Set([...expandedThreads.value, threadId]);
  nextTick(() => {
    const cards = sidebarContentRef.value?.querySelectorAll<HTMLElement>('.comment-thread-card');
    const card = cards && Array.from(cards).find(item => item.dataset.threadId === threadId);
    card?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  });
}

defineExpose({ revealThread });
</script>

<style scoped>
.comments-readonly-notice {
  margin: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  background: var(--background-alt, #f8fafc);
  color: var(--text-secondary, #64748b);
  font-size: 13px;
  line-height: 1.5;
}

/* Sidebar Container */
.comments-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 0;
  /* Open panels sit ABOVE the toolbar shell (9999) so their content never
     loses clicks to the sticky bar; FABs stay below it at 9998. */
  z-index: 10000;
  pointer-events: none;
  overflow: visible;
}

.comments-sidebar-open {
  width: 420px;
  pointer-events: all;
}

.comments-sidebar-content {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
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

.comments-sidebar-content :deep(button) {
  font-family: inherit;
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
  gap: 10px;
  padding: 16px 20px 12px;
}

.comments-header-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--toolbar-accent, #3b82f6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}

.comments-header-icon svg {
  width: 18px;
  height: 18px;
}

.comments-sidebar-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-color, #111827);
  margin: 0;
  flex: 1;
}

.comments-sidebar-close {
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
  flex-shrink: 0;
}

.comments-sidebar-close svg {
  width: 18px;
  height: 18px;
}

.comments-sidebar-close:hover {
  background: var(--hover-bg, #f3f4f6);
  color: var(--text-color, #1f2937);
}

/* Tabs */
.comments-tabs {
  display: flex;
  gap: 4px;
  padding: 0 20px 12px;
}

.comments-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
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
  background: rgba(59, 130, 246, 0.1);
  color: var(--toolbar-accent, #3b82f6);
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
  background: var(--toolbar-accent, #3b82f6);
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
  0%,
  100% {
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

/* Keep the new-comment action in the header, clear of the scrollable replies. */
.comments-fab {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: var(--toolbar-accent, #3b82f6);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px -4px rgba(15, 23, 42, 0.28),
    0 1px 3px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.18s ease, filter 0.18s ease;
  z-index: 10;
}

.comments-fab:hover {
  transform: translateY(-2px);
  filter: brightness(1.06);
  box-shadow: 0 12px 28px -6px rgba(15, 23, 42, 0.35),
    0 2px 6px rgba(15, 23, 42, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.comments-fab:active {
  transform: translateY(0) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .comments-fab {
    transition: box-shadow 0.18s ease, filter 0.18s ease;
  }
  .comments-fab:hover,
  .comments-fab:active {
    transform: none;
  }
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
.theme-dark .comments-sidebar-content {
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

  .comments-sidebar-open {
    width: 100%;
  }

  .comments-sidebar-content {
    width: 100%;
    max-width: 100vw;
  }

  .comments-sidebar-backdrop {
    display: block;
  }

  .comments-fab {
    width: 44px;
    height: 44px;
  }
}
</style>
