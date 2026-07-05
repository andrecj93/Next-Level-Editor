<template>
  <teleport to="body">
    <transition name="context-menu">
      <div
        v-if="show"
        class="context-menu"
        :class="theme"
        :style="{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }"
        @click.stop
        @contextmenu.prevent
      >
        <div
          v-for="(item, index) in items"
          :key="index"
        >
          <div
            v-if="item.divider"
            class="context-menu-divider"
          />
          <button
            v-else
            class="context-menu-item"
            :disabled="item.disabled"
            @click="handleItemClick(item)"
          >
            <span class="context-menu-icon">{{ item.icon }}</span>
            <span class="context-menu-label">{{ item.label }}</span>
            <span
              v-if="item.shortcut"
              class="context-menu-shortcut"
            >{{
              item.shortcut
            }}</span>
          </button>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from "vue";
import type { ContextMenuItem } from "../types/contextMenu";

interface Props {
  show: boolean;
  position: { top: number; left: number };
  items: ContextMenuItem[];
  theme?: string;
}

type Emits = (e: "close") => void;

const props = withDefaults(defineProps<Props>(), {
  theme: "theme-light",
});
const emit = defineEmits<Emits>();

const handleItemClick = (item: ContextMenuItem) => {
  if (item.disabled) return;

  if (item.onClick) {
    item.onClick();
  }

  emit("close");
};

// Close menu when clicking outside
const handleDocumentClick = () => {
  if (props.show) {
    emit("close");
  }
};

// #31: close the menu when the underlying page scrolls or the window resizes -
// in both cases the anchor point the menu was positioned at is no longer valid.
const handleDismiss = () => {
  if (props.show) {
    emit("close");
  }
};

// #31: close the menu on Escape pressed while it is open. Listening on the
// menu container keeps this scoped to the menu; a keydown anywhere in the
// document while the menu is open should still dismiss it.
const handleKeydown = (event: KeyboardEvent) => {
  if (props.show && event.key === "Escape") {
    emit("close");
  }
};

const addDismissListeners = () => {
  document.addEventListener("click", handleDocumentClick);
  // `scroll` fires on inner scrollable elements too, so capture it.
  window.addEventListener("scroll", handleDismiss, true);
  window.addEventListener("resize", handleDismiss);
  document.addEventListener("keydown", handleKeydown);
};

const removeDismissListeners = () => {
  document.removeEventListener("click", handleDocumentClick);
  window.removeEventListener("scroll", handleDismiss, true);
  window.removeEventListener("resize", handleDismiss);
  document.removeEventListener("keydown", handleKeydown);
};

watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      // Defer so the opening right-click/keypress does not immediately close it.
      setTimeout(() => {
        addDismissListeners();
      }, 0);
    } else {
      removeDismissListeners();
    }
  }
);

// Ensure listeners are removed if the component is unmounted while the menu is
// still open (the watch only removes them on close).
onBeforeUnmount(() => {
  removeDismissListeners();
});
</script>

<style scoped>
.context-menu {
  position: fixed;
  min-width: 200px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  z-index: 10000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.context-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}

.context-menu-item:hover:not(:disabled) {
  background: var(--color-surface-raised);
}

.context-menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-icon {
  font-size: 16px;
  min-width: 20px;
  text-align: center;
}

.context-menu-label {
  flex: 1;
  font-weight: 500;
}

.context-menu-shortcut {
  font-size: 12px;
  opacity: 0.6;
  font-family: "Courier New", monospace;
}

.context-menu-divider {
  height: 1px;
  background: var(--color-border);
  margin: 4px 8px;
}

.context-menu-enter-active,
.context-menu-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.context-menu-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
