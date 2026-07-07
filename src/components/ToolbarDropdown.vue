<template>
  <div
    ref="dropdownRef"
    class="toolbar-dropdown"
    :class="{ open: isOpen }"
  >
    <button
      class="dropdown-trigger"
      :class="{ active: hasActiveItem }"
      :data-tooltip="tooltip"
      :aria-label="label"
      :aria-expanded="isOpen"
      :aria-haspopup="true"
      :disabled="disabled"
      @mousedown.prevent="$emit('remember-selection')"
      @click.stop="!disabled ? toggle() : null"
    >
      <span
        v-if="icon"
        class="dropdown-icon"
        v-html="icon"
      />
      <span class="dropdown-label">{{ displayLabel }}</span>
      <span class="dropdown-arrow">▼</span>
    </button>

    <transition name="dropdown-fade">
      <div
        v-if="isOpen"
        class="dropdown-menu"
        :style="menuStyle"
      >
        <div
          v-for="(item, index) in items"
          :key="item.id || index"
        >
          <div
            v-if="item.divider"
            class="dropdown-divider"
          />
          <button
            v-else
            class="dropdown-item"
            :class="{ active: item.isActive?.() }"
            :aria-label="item.label"
            @mousedown.prevent
            @click="handleItemClick(item)"
          >
            <span
              v-if="item.icon"
              class="item-icon"
              v-html="item.icon"
            />
            <span class="item-label">{{ item.label }}</span>
            <span
              v-if="item.shortcut"
              class="item-shortcut"
            >{{
              item.shortcut
            }}</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";

interface DropdownItem {
  id?: string;
  label?: string;
  icon?: string;
  shortcut?: string;
  onClick?: () => void;
  isActive?: () => boolean;
  divider?: boolean;
}

interface Props {
  label: string;
  icon?: string;
  tooltip?: string;
  items: DropdownItem[];
  modelValue?: boolean;
  disabled?: boolean;
  /**
   * Keep the static label as the trigger text. By default the trigger shows
   * the active item's label (select-like dropdowns such as Format/Size); menus
   * with stateful toggle items (e.g. Tools > Spell Check) must opt out so the
   * trigger doesn't get hijacked by whichever item happens to be active.
   */
  preserveLabel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  icon: "",
  tooltip: "",
  disabled: false,
  preserveLabel: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "item-click": [item: DropdownItem];
  // Emitted on trigger mousedown so the host can save the editor selection
  // and suppress the floating bubble before the dropdown opens.
  "remember-selection": [];
}>();

const dropdownRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const hasActiveItem = computed(() => {
  return props.items.some((item) => item.isActive?.());
});

const displayLabel = computed(() => {
  if (props.preserveLabel) return props.label;
  const activeItem = props.items.find((item) => item.isActive?.());
  return activeItem?.label || props.label;
});

const menuStyle = computed(() => {
  return {
    minWidth: "200px",
  };
});

const toggle = () => {
  isOpen.value = !isOpen.value;
  emit("update:modelValue", isOpen.value);
};

const close = () => {
  isOpen.value = false;
  emit("update:modelValue", false);
};

const handleItemClick = (item: DropdownItem) => {
  if (item.onClick) {
    item.onClick();
  }
  emit("item-click", item);
  close();
};

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    close();
  }
};

// Standard menu keyboard behavior: Escape dismisses an open dropdown. The
// event is consumed so the editor's application-level Escape handler (which
// dismisses its own top-most overlay) doesn't also fire on the same keystroke.
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Escape" || !isOpen.value) return;
  event.preventDefault();
  event.stopPropagation();
  close();
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  // Capture phase so an open dropdown wins over the editor's document-level
  // bubble-phase Escape handler.
  document.addEventListener("keydown", handleKeydown, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleKeydown, true);
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== undefined) {
      isOpen.value = newVal;
    }
  }
);
</script>

<style scoped>
.toolbar-dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  /* Theme tokens so triggers reskin with any editor theme (light + dark). */
  border: 1px solid var(--color-border, #ddd);
  background: var(--color-surface-raised, white);
  color: var(--toolbar-text, #333);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
  min-height: 34px;
}

.dropdown-trigger:hover:not(:disabled) {
  background: var(--color-surface-overlay, #f5f5f5);
  border-color: var(--toolbar-accent, #999);
}

.dropdown-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dropdown-trigger.active {
  background: var(--toolbar-hover, #e8f0fe);
  border-color: var(--toolbar-accent, #4285f4);
  color: var(--toolbar-accent, #4285f4);
}

.dropdown-icon {
  font-size: 16px;
  line-height: 1;
}

.dropdown-label {
  white-space: nowrap;
}

.dropdown-arrow {
  font-size: 10px;
  opacity: 0.6;
  transition: transform 0.2s;
}

.toolbar-dropdown.open .dropdown-arrow {
  transform: rotate(180deg);
}

/* Tooltips for dropdown triggers — drop DOWN: the toolbar sits at the top of
   an overflow:hidden editor, so an upward tooltip on the first row is clipped. */
.dropdown-trigger[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 10px;
  background: rgba(17, 24, 39, 0.92);
  color: #f9fafb;
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
  border-radius: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 1000;
}

.dropdown-trigger[data-tooltip]:hover::after {
  opacity: 1;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: var(--color-surface, white);
  border: 1px solid var(--color-border, #ddd);
  border-radius: var(--radius-lg, 8px);
  box-shadow: var(--shadow-lg);
  z-index: 10000;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--color-text, #333);
  cursor: pointer;
  font-size: 14px;
  text-align: left;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: var(--color-surface-overlay, #f5f5f5);
}

.dropdown-item.active {
  background: var(--toolbar-hover, #e8f0fe);
  color: var(--toolbar-accent, #4285f4);
  font-weight: 500;
}

.item-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.item-label {
  flex: 1;
}

.item-shortcut {
  font-size: 12px;
  opacity: 0.6;
  margin-left: auto;
  flex-shrink: 0;
}

.dropdown-divider {
  height: 1px;
  background: var(--color-border, #ddd);
  margin: 4px 0;
}

/* Animations */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-fade-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Dark mode — trigger/menu colours now come straight from the theme tokens
   (which flip for .theme-dark), so only the tooltip needs a dark override. */
.theme-dark .dropdown-trigger[data-tooltip]::after {
  background: rgba(15, 23, 42, 0.95);
  color: #e2e8f0;
}
</style>
