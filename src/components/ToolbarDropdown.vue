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
      @mousedown.prevent
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
}

const props = withDefaults(defineProps<Props>(), {
  icon: "",
  tooltip: "",
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "item-click": [item: DropdownItem];
}>();

const dropdownRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const hasActiveItem = computed(() => {
  return props.items.some((item) => item.isActive?.());
});

const displayLabel = computed(() => {
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

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
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
  padding: 6px 10px;
  border: 1px solid var(--border-color, #ddd);
  background: var(--toolbar-btn-bg, white);
  color: var(--text-color, #333);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  min-height: 32px;
}

.dropdown-trigger:hover:not(:disabled) {
  background: var(--toolbar-btn-hover, #f5f5f5);
  border-color: var(--border-hover-color, #999);
}

.dropdown-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dropdown-trigger.active {
  background: var(--toolbar-btn-active, #e8f0fe);
  border-color: var(--primary-color, #4285f4);
  color: var(--primary-color, #4285f4);
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

/* Tooltips for dropdown triggers */
.dropdown-trigger[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 8px);
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
  background: var(--dropdown-bg, white);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
  color: var(--text-color, #333);
  cursor: pointer;
  font-size: 14px;
  text-align: left;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: var(--dropdown-item-hover, #f5f5f5);
}

.dropdown-item.active {
  background: var(--dropdown-item-active, #e8f0fe);
  color: var(--primary-color, #4285f4);
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
  background: var(--border-color, #ddd);
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

/* Dark mode */
.dark .dropdown-trigger {
  --toolbar-btn-bg: #2d2d2d;
  --toolbar-btn-hover: #3a3a3a;
  --toolbar-btn-active: #1a3a52;
  --border-color: #444;
  --border-hover-color: #666;
  --text-color: #e0e0e0;
}

.dark .dropdown-trigger[data-tooltip]::after {
  background: rgba(15, 23, 42, 0.95);
  color: #e2e8f0;
}

.dark .dropdown-menu {
  --dropdown-bg: #2d2d2d;
  --dropdown-item-hover: #3a3a3a;
  --dropdown-item-active: #1a3a52;
  --border-color: #444;
  --text-color: #e0e0e0;
}
</style>
