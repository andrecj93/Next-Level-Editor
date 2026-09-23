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
    :preserve-label="preserveLabel"
    @remember-selection="$emit('remember-selection')"
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
        { active: action.isActive?.(), disabled: !visible || action.isDisabled?.() },
      ]"
      :data-tooltip="
        visible
          ? action.tooltip
          : `${action.tooltip} (not available for current selection)`
      "
      :aria-label="t(action.label)"
      :aria-pressed="action.isActive ? action.isActive() : undefined"
      :disabled="!visible || action.isDisabled?.()"
      @mousedown.prevent="$emit('remember-selection')"
      @click="visible && !action.isDisabled?.() ? action.onClick() : null"
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
import { useEditorLocale } from "../composables/useEditorLocale";
const { t } = useEditorLocale();
import ToolbarDropdown from "./ToolbarDropdown.vue";
import type { ToolbarAction } from "../types/toolbar";

interface Props {
  type: "dropdown" | "buttons" | "custom";
  visible?: boolean;
  label?: string;
  icon?: string;
  tooltip?: string;
  items?: ToolbarAction[] | any[];
  /** Keep the static trigger label (see ToolbarDropdown.preserveLabel). */
  preserveLabel?: boolean;
}

withDefaults(defineProps<Props>(), {
  visible: true,
  label: "",
  icon: "",
  tooltip: "",
  items: () => [],
  preserveLabel: false,
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
