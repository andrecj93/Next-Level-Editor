<template>
  <!-- Dropdown Section -->
  <ToolbarDropdown
    v-if="type === 'dropdown'"
    :class="{ 'toolbar-section-disabled': !visible }"
    :label="label"
    :icon="icon"
    :tooltip="
      visible ? tooltip : `${tooltip} (not available for current selection)`
    "
    :items="items"
    :disabled="!visible"
  />

  <!-- Button Group Section -->
  <div
    v-else-if="type === 'buttons'"
    class="toolbar-group"
  >
    <button
      v-for="action in items"
      :key="action.id"
      :class="[
        'toolbar-btn-modern',
        { active: action.isActive?.(), disabled: !visible },
      ]"
      :data-tooltip="
        visible
          ? action.tooltip
          : `${action.tooltip} (not available for current selection)`
      "
      :aria-label="action.label"
      :aria-pressed="action.isActive?.() || false"
      :disabled="!visible"
      @mousedown.prevent="$emit('remember-selection')"
      @click="visible ? action.onClick() : null"
    >
      <span v-html="action.icon" />
    </button>
  </div>

  <!-- Custom Section -->
  <div
    v-else-if="type === 'custom'"
    :class="{ 'toolbar-section-disabled': !visible }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import ToolbarDropdown from "./ToolbarDropdown.vue";
import type { ToolbarAction } from "../types/toolbar";

interface Props {
  type: "dropdown" | "buttons" | "custom";
  visible?: boolean;
  label?: string;
  icon?: string;
  tooltip?: string;
  items?: ToolbarAction[] | any[];
}

withDefaults(defineProps<Props>(), {
  visible: true,
  label: "",
  icon: "",
  tooltip: "",
  items: () => [],
});

defineEmits<{
  "remember-selection": [];
}>();
</script>

<style scoped>
.toolbar-section-disabled {
  opacity: 0.4;
  pointer-events: none;
  cursor: not-allowed;
}

.toolbar-btn-modern.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.toolbar-btn-modern:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
