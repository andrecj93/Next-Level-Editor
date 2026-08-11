<template>
  <div
    ref="dropdownRef"
    class="toolbar-dropdown"
    :class="{ open: isOpen }"
    @focusout="onFocusOut"
  >
    <button
      ref="triggerRef"
      class="dropdown-trigger"
      :class="{ active: hasActiveItem }"
      :data-tooltip="tooltip"
      :aria-label="label"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      :disabled="disabled"
      @mousedown.prevent="$emit('remember-selection')"
      @click.stop="!disabled ? toggle() : null"
      @keydown="onTriggerKeydown"
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
        role="menu"
        :aria-label="label"
        @keydown="onMenuKeydown"
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
            role="menuitem"
            tabindex="-1"
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
const triggerRef = ref<HTMLButtonElement | null>(null);
const isOpen = ref(false);

// Viewport clamping — the menu is left-aligned to its trigger, so triggers
// near the right edge of a narrow viewport would push the 200px menu
// off-screen. Measured on open (after the v-if renders) and applied via
// `left` (not transform: the enter transition animates transform).
const menuLeft = ref(0);
// Vertical budget. The menu lives inside `.next-level-editor`, which is
// overflow:hidden with an author-set height — anything past the editor's
// bottom edge is clipped away and unreachable (the static 400px cap rarely
// fires: the largest menus are ~380px). The real limit is therefore
// min(viewport bottom, editor bottom); the budget is applied as an inline
// max-height so `overflow-y: auto` produces a scrollbar for EVERY menu that
// doesn't fit, and the menu flips above the trigger when the space there is
// meaningfully larger.
const menuMaxHeight = ref<number | null>(null);
const openUp = ref(false);
/** Menus tighter than this flip up / trade sides instead of squeezing. */
const MIN_MENU_BUDGET = 120;

const clampMenu = async () => {
  // Reset to the natural anchor first so measurements aren't polluted by a
  // previous clamp (re-entry happens on window resize/scroll while open).
  menuLeft.value = 0;
  menuMaxHeight.value = null;
  openUp.value = false;
  await nextTick();
  const menu = menuRef.value;
  const trigger = triggerRef.value;
  if (!menu || !trigger || !isOpen.value) return;
  const margin = 8;
  const r = menu.getBoundingClientRect();
  let shift = 0;
  if (r.right > window.innerWidth - margin) {
    shift = window.innerWidth - margin - r.right;
  }
  if (r.left + shift < margin) {
    shift = margin - r.left;
  }
  menuLeft.value = Math.round(shift);

  // Vertical: measure from the trigger (stable), not the menu (its enter
  // transition animates translateY, skewing rect.top by a few px).
  const t = trigger.getBoundingClientRect();
  const editorRect = dropdownRef.value
    ?.closest(".next-level-editor")
    ?.getBoundingClientRect();
  const bottomLimit = Math.min(
    window.innerHeight,
    editorRect ? editorRect.bottom : Infinity
  );
  const topLimit = Math.max(0, editorRect ? editorRect.top : 0);
  const naturalHeight = menu.scrollHeight;
  const spaceBelow = bottomLimit - (t.bottom + 4) - margin;
  const spaceAbove = t.top - 4 - topLimit - margin;
  const flip =
    spaceBelow < Math.min(naturalHeight, MIN_MENU_BUDGET) &&
    spaceAbove > spaceBelow;
  openUp.value = flip;
  const budget = flip ? spaceAbove : spaceBelow;
  menuMaxHeight.value = Math.max(MIN_MENU_BUDGET, Math.floor(budget));
};

watch(isOpen, (open) => {
  if (open) clampMenu();
  else {
    menuLeft.value = 0;
    menuMaxHeight.value = null;
    openUp.value = false;
  }
});

// Re-clamp while open: scrolling the page moves the editor (and its clip box)
// relative to the viewport, and resizing changes both limits. Scrolls that
// originate INSIDE the menu (its own overflow-y) must not re-clamp — that
// would reset the very scroll position the user is dragging.
let reclampQueued = false;
const reclampIfOpen = (event?: Event) => {
  if (!isOpen.value) return;
  const target = event?.target;
  if (target instanceof Node && menuRef.value?.contains(target)) return;
  if (reclampQueued) return;
  reclampQueued = true;
  requestAnimationFrame(() => {
    reclampQueued = false;
    if (isOpen.value) clampMenu();
  });
};

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
  if (menuMaxHeight.value !== null) {
    style.maxHeight = `${Math.min(400, menuMaxHeight.value)}px`;
  }
  if (openUp.value) {
    style.top = "auto";
    style.bottom = "calc(100% + 4px)";
  }
  return style;
});

const toggle = () => {
  isOpen.value = !isOpen.value;
  emit("update:modelValue", isOpen.value);
};

const close = () => {
  // Hand focus back to the trigger BEFORE the menu unmounts. Closing used to
  // tear the focused .dropdown-item out of the DOM with focus still on it, so
  // focus fell to <body> and a keyboard user's next Tab restarted at the top of
  // the HOST page. It also poisoned any overlay opened FROM the menu:
  // useModalDialog records document.activeElement on activate, so the Link
  // modal captured <body> and had nothing to restore to. Only when focus is
  // still INSIDE the menu — an item that opened a modal has already moved
  // focus into it, and that must not be stolen back. #R23-4
  const active = document.activeElement;
  if (active && menuRef.value?.contains(active)) {
    triggerRef.value?.focus();
  }
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

/**
 * The WAI-ARIA menu-button keyboard model. The trigger already advertised
 * aria-haspopup, but nothing implemented the contract: ArrowDown did nothing,
 * so a keyboard user could open a menu they could not enter. EditorToolbar's
 * roving handler excludes `.dropdown-menu` precisely because "menus own their
 * navigation" — this is that navigation. #R23-23
 */
const focusableItems = (): HTMLElement[] =>
  Array.from(
    menuRef.value?.querySelectorAll<HTMLElement>(
      "button.dropdown-item:not([disabled])"
    ) ?? []
  );

const focusItemAt = (index: number) => {
  const items = focusableItems();
  if (!items.length) return;
  // Wrap at both ends, so the menu is a loop rather than a dead end.
  const wrapped = (index + items.length) % items.length;
  items[wrapped].focus();
  // The menu scrolls internally when clamped — keep the focused item visible
  // (focus() alone doesn't reliably scroll partially-visible items).
  items[wrapped].scrollIntoView({ block: "nearest" });
};

/** Open (if needed) and land on the first or last item. */
const enterMenu = (edge: "first" | "last") => {
  const land = () => focusItemAt(edge === "first" ? 0 : focusableItems().length - 1);
  if (isOpen.value) {
    land();
    return;
  }
  isOpen.value = true;
  emit("update:modelValue", true);
  nextTick(land);
};

const onTriggerKeydown = (event: KeyboardEvent) => {
  if (props.disabled) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    enterMenu("first");
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    enterMenu("last");
  }
};

const onMenuKeydown = (event: KeyboardEvent) => {
  const items = focusableItems();
  if (!items.length) return;
  const current = items.indexOf(document.activeElement as HTMLElement);

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      focusItemAt(current + 1);
      break;
    case "ArrowUp":
      event.preventDefault();
      focusItemAt(current - 1);
      break;
    case "Home":
      event.preventDefault();
      focusItemAt(0);
      break;
    case "End":
      event.preventDefault();
      focusItemAt(items.length - 1);
      break;
    case "Tab":
      // Tab leaves the menu entirely rather than walking its items — close so
      // it cannot linger open behind the newly focused control.
      close();
      break;
  }
};

/**
 * Close when focus leaves the whole dropdown. Without this, the toolbar's
 * ArrowLeft/ArrowRight moved the roving stop to the next trigger while this
 * menu stayed open and still reported aria-expanded="true", with nothing
 * focused inside it. #R23-23
 */
const onFocusOut = (event: FocusEvent) => {
  if (!isOpen.value) return;
  const next = event.relatedTarget as Node | null;
  if (next && dropdownRef.value?.contains(next)) return;
  isOpen.value = false;
  emit("update:modelValue", false);
};

const handleClickOutside = (event: Event) => {
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
  // Capture-phase pointerdown, NOT a bubble-phase click: the trigger uses
  // @click.stop, which stops click from ever reaching a document bubble
  // listener — so opening a second dropdown never closed the first (both
  // stayed open). A capture-phase pointerdown fires before any .stop and for
  // every dropdown, so each open one closes when the press lands outside it.
  document.addEventListener("pointerdown", handleClickOutside, true);
  // Capture phase so an open dropdown wins over the editor's document-level
  // bubble-phase Escape handler.
  document.addEventListener("keydown", handleKeydown, true);
  window.addEventListener("resize", reclampIfOpen, { passive: true });
  window.addEventListener("scroll", reclampIfOpen, { passive: true, capture: true });
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleClickOutside, true);
  document.removeEventListener("keydown", handleKeydown, true);
  window.removeEventListener("resize", reclampIfOpen);
  window.removeEventListener("scroll", reclampIfOpen, true);
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

/* A dropdown is a PICKER, not a toggle: at rest it shows its current value in
   the label ("Normal", "Insert", "Tools"). It must NOT wear the format-active
   underline+accent — that idiom belongs exclusively to real on/off format
   buttons (Bold, H1). Painting it here made every value/menu dropdown read as
   a permanently-active tab (the "não parece WOW" clutter). The active value is
   communicated by displayLabel; the trigger itself stays neutral. The chosen
   item still gets the accent INSIDE the open menu. */
.dropdown-trigger.active {
  background-color: transparent;
  color: var(--toolbar-text-secondary, var(--color-text-secondary, #6b7280));
}

.dropdown-trigger.active:hover:not(:disabled) {
  background-color: var(--toolbar-hover, #f5f5f5);
  color: var(--toolbar-text, #333);
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
