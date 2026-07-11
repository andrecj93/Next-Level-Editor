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
        ref="menuRef"
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
            :class="{ active: item.isActive?.(), disabled: isItemDisabled(item) }"
            :disabled="isItemDisabled(item)"
            :aria-label="item.label"
            @mousedown.prevent
            @click="!isItemDisabled(item) && handleItemClick(item)"
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
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue";

interface DropdownItem {
  id?: string;
  label?: string;
  icon?: string;
  shortcut?: string;
  onClick?: () => void;
  isActive?: () => boolean;
  divider?: boolean;
  /**
   * Disabled state, honored two ways: a static/getter boolean (`disabled`, as
   * on Tools > Paste Format) or a lazily-evaluated predicate (`isDisabled()`).
   * A disabled item is dimmed, non-focusable and its onClick never fires.
   */
  disabled?: boolean;
  isDisabled?: () => boolean;
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
const menuRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

// Viewport clamping — the menu is left-aligned to its trigger, so triggers
// near the right edge of a narrow viewport would push the 200px menu
// off-screen. Measured on open (after the v-if renders) and applied via
// `left` (not transform: the enter transition animates transform).
const menuLeft = ref(0);

const clampMenu = () => {
  const menu = menuRef.value;
  if (!menu) return;
  const margin = 8;
  // Measure at the natural position first (no inline `left`, so the
  // position-variant CSS decides the anchor).
  menuLeft.value = 0;
  const r = menu.getBoundingClientRect();
  let shift = 0;
  if (r.right > window.innerWidth - margin) {
    shift = window.innerWidth - margin - r.right;
  }
  if (r.left + shift < margin) {
    shift = margin - r.left;
  }
  menuLeft.value = Math.round(shift);
};

watch(isOpen, (open) => {
  if (open) nextTick(clampMenu);
  else menuLeft.value = 0;
});

const hasActiveItem = computed(() => {
  return props.items.some((item) => item.isActive?.());
});

/** An item is disabled via a static `disabled` flag or an `isDisabled()` predicate. */
const isItemDisabled = (item: DropdownItem): boolean =>
  Boolean(item.disabled || item.isDisabled?.());

const displayLabel = computed(() => {
  if (props.preserveLabel) return props.label;
  const activeItem = props.items.find((item) => item.isActive?.());
  return activeItem?.label || props.label;
});

const menuStyle = computed(() => {
  const style: Record<string, string> = { minWidth: "200px" };
  // Only override `left` when the clamp actually needs to shift the menu.
  // Emitting `left: 0` unconditionally would defeat the position-variant CSS
  // (the left-rail right-flyout at `left: calc(100% + 4px)` and the Export
  // right-anchor at `right: 0`), pinning those menus to the wrong edge.
  if (menuLeft.value !== 0) style.left = `${menuLeft.value}px`;
  return style;
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

/* Masthead ghost trigger: no border, no fill at rest — secondary ink that
   sharpens on hover over a soft --toolbar-hover pill. Theme tokens so
   triggers reskin with any editor theme (light + dark). State rules use
   background-color (never the shorthand): the active underline bar lives in
   background-image. */
.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  border: none;
  background: transparent;
  color: var(--toolbar-text-secondary, var(--color-text-secondary, #6b7280));
  border-radius: var(--radius-md, 6px);
  cursor: pointer;
  font-size: 14px;
  transition: background-color var(--nle-motion-quick, 120ms)
      var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1)),
    color var(--nle-motion-quick, 120ms)
      var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1)),
    opacity var(--nle-motion-quick, 120ms)
      var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1));
  min-height: 34px;
}

.dropdown-trigger:hover:not(:disabled) {
  background-color: var(--toolbar-hover, #f5f5f5);
  color: var(--toolbar-text, #333);
}

.dropdown-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Active (an item in the menu is on): accent INK + the masthead's 2px
   underline bar instead of a filled chip. */
.dropdown-trigger.active {
  background-color: transparent;
  color: var(--toolbar-accent, #4285f4);
  background-image: linear-gradient(
    var(--toolbar-accent, #4285f4),
    var(--toolbar-accent, #4285f4)
  );
  background-repeat: no-repeat;
  background-size: 60% 2px;
  background-position: center calc(100% - 3px);
}

.dropdown-trigger.active:hover:not(:disabled) {
  background-color: var(--toolbar-hover, #f5f5f5);
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
  transition: transform var(--nle-motion-quick, 120ms)
    var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1));
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
  /* Soft surface: hairline edge; the shadow carries the elevation. */
  border: 1px solid var(--color-divider, #e5e7eb);
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
  transition: background-color var(--nle-motion-quick, 120ms)
    var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1));
}

.dropdown-item:hover:not(.disabled) {
  background: var(--toolbar-hover, #f5f5f5);
}

.dropdown-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
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

/* Animations — enter decelerates in (ease-out), exit accelerates away
   (ease-in) and is faster than the entry (motion tokens; see tokens.css). */
.dropdown-fade-enter-active {
  transition: opacity var(--nle-motion-enter, 180ms)
      var(--nle-ease-out, cubic-bezier(0.05, 0.7, 0.1, 1)),
    transform var(--nle-motion-enter, 180ms)
      var(--nle-ease-out, cubic-bezier(0.05, 0.7, 0.1, 1));
}

.dropdown-fade-leave-active {
  transition: opacity var(--nle-motion-exit, 140ms)
      var(--nle-ease-in, cubic-bezier(0.3, 0, 0.8, 0.15)),
    transform var(--nle-motion-exit, 140ms)
      var(--nle-ease-in, cubic-bezier(0.3, 0, 0.8, 0.15));
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
