<template>
  <transition name="command-menu">
    <div
      v-if="show"
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
      <ul role="listbox">
        <li
          v-for="(option, index) in options"
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
import { watch, nextTick } from "vue";
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
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  position: () => ({ top: 0, left: 0 }),
  options: () => [],
  selectedIndex: 0,
});

// Keep the keyboard-highlighted item scrolled into view within the menu.
watch(
  () => props.selectedIndex,
  () => {
    if (!props.show) return;
    nextTick(() => {
      const el = document.querySelector(".command-menu li.selected");
      el?.scrollIntoView({ block: "nearest" });
    });
  }
);

defineEmits<{
  select: [option: SlashCommandOption];
}>();
</script>
