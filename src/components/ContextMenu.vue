<template>
  <teleport to="body">
    <transition name="context-menu">
      <div
        v-if="show"
        class="context-menu"
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
import { watch } from "vue";
import type { ContextMenuItem } from "../types/contextMenu";

interface Props {
  show: boolean;
  position: { top: number; left: number };
  items: ContextMenuItem[];
}

type Emits = (e: "close") => void;

const props = defineProps<Props>();
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

watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      // Add click listener to close menu when clicking outside
      setTimeout(() => {
        document.addEventListener("click", handleDocumentClick);
      }, 0);
    } else {
      document.removeEventListener("click", handleDocumentClick);
    }
  }
);
</script>

<style scoped>
.context-menu {
  position: fixed;
  min-width: 200px;
  background: var(--editor-bg, #ffffff);
  border: 1px solid var(--editor-border, #d8dde6);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
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
  color: var(--toolbar-text, #1f2937);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}

.context-menu-item:hover:not(:disabled) {
  background: var(--toolbar-hover, rgba(59, 130, 246, 0.1));
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
  background: var(--editor-border, #d8dde6);
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

/* Dark theme support */
:deep(.theme-dark) .context-menu {
  --editor-bg: #0f172a;
  --editor-border: #1e293b;
  --toolbar-text: #e2e8f0;
  --toolbar-hover: rgba(96, 165, 250, 0.2);
}
</style>
