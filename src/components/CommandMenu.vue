<template>
  <transition name="command-menu">
    <div
      v-if="show"
      ref="menuEl"
      class="command-menu"
      :style="{
        top: `${position.top}px`,
        left: `${position.left}px`,
        maxHeight: position.maxHeight ? `${position.maxHeight}px` : undefined,
      }"
    >
      <div class="command-menu-header">
        Quick Actions
      </div>
      <div
        v-if="options.length === 0"
        class="command-menu-empty"
      >
        No matching commands
      </div>
      <ul
        v-else
        :id="listboxId"
        role="listbox"
        aria-label="Quick actions"
      >
        <li
          v-for="(option, index) in options"
          :id="optionId ? optionId(index) : undefined"
          :key="option.id"
          role="option"
          :class="{ selected: index === selectedIndex }"
          :aria-selected="index === selectedIndex"
          @mousedown.prevent
          @click="$emit('select', option)"
        >
          <div class="command-title">
            {{ option.label }}
          </div>
          <div class="command-description">
            {{ option.description }}
          </div>
        </li>
      </ul>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import type { SlashCommandOption } from "../composables/useSlashCommands";

// Re-export for backward compatibility
export interface CommandOption {
  id: string;
  label: string;
  description: string;
  action?: () => void;
}

export interface CommandMenuPosition {
  top: number;
  left: number;
  /** Cap so the menu scrolls internally instead of extending under fixed bars. */
  maxHeight?: number;
}

interface Props {
  show: boolean;
  position: CommandMenuPosition;
  options: SlashCommandOption[];
  /** Keyboard-highlighted option index (Arrow keys drive it upstream). */
  selectedIndex?: number;
  /**
   * Ids that let the FOCUSED element (the editing surface — focus never enters
   * this menu) point at the listbox and its highlighted option via
   * aria-controls / aria-activedescendant. #R23-5
   */
  listboxId?: string;
  optionId?: (index: number) => string;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  listboxId: undefined,
  optionId: undefined,
  position: () => ({ top: 0, left: 0 }),
  options: () => [],
  selectedIndex: 0,
});

const menuEl = ref<HTMLElement | null>(null);
// Scroll only this menu's list. scrollIntoView also scrolls host containers,
// moving the document away from the caret, especially in mobile WebKit.
watch(
  () => props.selectedIndex,
  () => {
    if (!props.show) return;
    nextTick(() => {
      const list = menuEl.value?.querySelector("ul");
      const el = list?.querySelector<HTMLElement>("li.selected");
      if (!list || !el) return;
      const row = el.getBoundingClientRect();
      const viewport = list.getBoundingClientRect();
      if (row.top < viewport.top) list.scrollTop += row.top - viewport.top;
      else if (row.bottom > viewport.bottom) list.scrollTop += row.bottom - viewport.bottom;
    });
  }
);

const emit = defineEmits<{
  select: [option: SlashCommandOption];
  dismiss: [];
}>();

const dismissOnLayoutChange = (event: Event) => {
  if (!props.show || (event.target instanceof Node && menuEl.value?.contains(event.target))) return;
  emit("dismiss");
};
onMounted(() => {
  document.addEventListener("scroll", dismissOnLayoutChange, true);
  window.addEventListener("resize", dismissOnLayoutChange);
});
onUnmounted(() => {
  document.removeEventListener("scroll", dismissOnLayoutChange, true);
  window.removeEventListener("resize", dismissOnLayoutChange);
});
</script>

<style scoped>
.command-menu-empty {
  padding: 14px 16px;
  font-size: 13px;
  color: var(--toolbar-text);
  opacity: 0.6;
}
</style>
