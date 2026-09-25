<template>
  <teleport to="body">
    <transition name="context-menu">
      <div
        v-if="show"
        ref="menuRef"
        class="context-menu nle-chrome"
        :class="theme"
        :style="{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }"
        role="menu"
        aria-label="Context menu"
        tabindex="-1"
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
            role="separator"
          />
          <button
            v-else
            class="context-menu-item"
            role="menuitem"
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
        <p class="context-menu-hint">
          Shift + right-click for spelling and browser tools
        </p>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from "vue";
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

const menuRef = ref<HTMLElement | null>(null);
const openingScroll = new Map<EventTarget, { x: number; y: number }>();

const scrollPosition = (target: EventTarget | null) => {
  if (target === window || target === document) return { x: window.scrollX, y: window.scrollY };
  return target instanceof HTMLElement ? { x: target.scrollLeft, y: target.scrollTop } : null;
};

const settleOpeningScroll = () => {
  openingScroll.clear();
  // Opening a menu interrupts an in-flight smooth scroll, just as a native
  // context menu does. Keep the current position instead of chasing the caret.
  window.scrollTo({ left: window.scrollX, top: window.scrollY, behavior: 'instant' });
  openingScroll.set(window, scrollPosition(window)!);
  openingScroll.set(document, scrollPosition(document)!);
  let element = previouslyFocused;
  while (element) {
    const position = scrollPosition(element)!;
    if (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) {
      element.scrollTo?.({ left: position.x, top: position.y, behavior: 'instant' });
    }
    openingScroll.set(element, position);
    element = element.parentElement;
  }
};

// Focusable (enabled) menu items, in DOM order.
const getMenuItems = (): HTMLButtonElement[] =>
  menuRef.value
    ? Array.from(
        menuRef.value.querySelectorAll<HTMLButtonElement>(
          ".context-menu-item:not([disabled])"
        )
      )
    : [];

const focusItemAt = (index: number) => {
  const items = getMenuItems();
  if (items.length === 0) return;
  const wrapped = (index + items.length) % items.length;
  const item = items[wrapped];
  item.focus({ preventScroll: true });
  // Keep keyboard navigation inside the menu's own scroll area. Native focus
  // scrolling can move a short host page and immediately dismiss this menu.
  const menu = menuRef.value;
  if (menu) {
    if (item.offsetTop < menu.scrollTop) menu.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > menu.scrollTop + menu.clientHeight) {
      menu.scrollTop = item.offsetTop + item.offsetHeight - menu.clientHeight;
    }
  }
};

const handleItemClick = (item: ContextMenuItem) => {
  if (item.disabled) return;

  // Restore focus to the pre-menu element BEFORE the action runs, and
  // synchronously. The action often opens a dialog (Insert Link…), and
  // useModalDialog records document.activeElement as its restore target the
  // moment it activates. If the menu item is still focused then, that item is
  // recorded — and it unmounts on `emit("close")` below, so the dialog has
  // nothing connected to restore to and focus falls to <body> on dismiss. The
  // async restoreFocus() on the close path is too late for this. #R23-36
  const preMenuTarget = previouslyFocused;
  if (preMenuTarget?.isConnected) {
    preMenuTarget.focus({ preventScroll: true });
    previouslyFocused = null; // the close-path restore is now a no-op
  }

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
const handleDismiss = (event: Event) => {
  if (event.type === 'scroll' && event.target instanceof Node && menuRef.value?.contains(event.target)) return;
  if (event.type === 'scroll' && event.target) {
    const before = openingScroll.get(event.target);
    const current = scrollPosition(event.target);
    // A queued event from before opening must not close the new menu when
    // nothing has moved since it opened. Real subsequent scrolling still does.
    if (before && current && before.x === current.x && before.y === current.y) return;
  }
  if (props.show) {
    emit("close");
  }
};

// #31: close the menu on Escape pressed while it is open. Listening on the
// menu container keeps this scoped to the menu; a keydown anywhere in the
// document while the menu is open should still dismiss it.
const handleKeydown = (event: KeyboardEvent) => {
  if (!props.show) return;

  switch (event.key) {
    case "Escape":
      emit("close");
      break;
    // Roving focus through the menu, per the WAI-ARIA menu keyboard contract.
    case "ArrowDown": {
      event.preventDefault();
      const items = getMenuItems();
      const current = items.indexOf(
        document.activeElement as HTMLButtonElement
      );
      focusItemAt(current + 1);
      break;
    }
    case "ArrowUp": {
      event.preventDefault();
      const items = getMenuItems();
      const current = items.indexOf(
        document.activeElement as HTMLButtonElement
      );
      focusItemAt(current === -1 ? -1 : current - 1);
      break;
    }
    case "Home":
      event.preventDefault();
      focusItemAt(0);
      break;
    case "End":
      event.preventDefault();
      focusItemAt(-1);
      break;
  }
};

let openingDismissTimer: ReturnType<typeof setTimeout> | null = null;

const addDismissListeners = () => {
  document.addEventListener("keydown", handleKeydown);
  // Let the opening pointer event and its viewport adjustments settle before
  // outside dismissal. Keyboard navigation is ready as soon as the menu opens.
  openingDismissTimer = setTimeout(() => {
    openingDismissTimer = null;
    if (!props.show) return;
    document.addEventListener("click", handleDocumentClick);
    // `scroll` fires on inner scrollable elements too, so capture it.
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);
  }, 0);
};

const removeDismissListeners = () => {
  if (openingDismissTimer !== null) {
    clearTimeout(openingDismissTimer);
    openingDismissTimer = null;
  }
  document.removeEventListener("click", handleDocumentClick);
  window.removeEventListener("scroll", handleDismiss, true);
  window.removeEventListener("resize", handleDismiss);
  document.removeEventListener("keydown", handleKeydown);
};

// The element focused before the menu opened. Focus moves INTO the menu on
// open, so without restoring it on dismiss document.activeElement is left on
// <body>: the next Tab restarts at the top of the host page and the user loses
// their caret. (This menu does not use useModalDialog, which handles the same
// concern for the real dialogs.) #r21-a11y-2
let previouslyFocused: HTMLElement | null = null;

const restoreFocus = () => {
  const target = previouslyFocused;
  previouslyFocused = null;
  if (!target || !target.isConnected) return;
  // Only hand focus back if nobody else has taken it. The usual dismissal IS a
  // click on another control: that control takes focus first and the
  // document-click listener then closes the menu, so restoring unconditionally
  // yanked focus off whatever the user just clicked. Restore when focus is
  // still inside the menu (Escape / activating an item) or has fallen to
  // <body>. #r22-2
  const active = document.activeElement;
  const insideMenu = menuRef.value?.contains(active as Node) ?? false;
  if (active && active !== document.body && !insideMenu) return;
  nextTick(() => target.focus({ preventScroll: true }));
};

watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      previouslyFocused =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      settleOpeningScroll();
      addDismissListeners();
      // Move focus into the menu so keyboard/screen-reader users can operate it.
      nextTick(() => focusItemAt(0));
    } else {
      removeDismissListeners();
      openingScroll.clear();
      restoreFocus();
    }
  }
);

// Ensure listeners are removed if the component is unmounted while the menu is
// still open (the watch only removes them on close), and that focus is handed
// back on that path too.
onBeforeUnmount(() => {
  removeDismissListeners();
  openingScroll.clear();
  restoreFocus();
});
</script>

<style scoped>
.context-menu {
  position: fixed;
  min-width: 200px;
  max-width: calc(100vw - 16px);
  max-height: calc(100dvh - 16px);
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
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
  color: var(--color-text-secondary);
  font-family: "Courier New", monospace;
}

.context-menu-divider {
  height: 1px;
  background: var(--color-border);
  margin: 4px 8px;
}

.context-menu-hint {
  max-width: 230px;
  margin: 4px 8px;
  padding: 8px 4px 4px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

@media (pointer: coarse) {
  .context-menu-hint { display: none; }
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

.context-menu-leave-active {
  pointer-events: none;
}
</style>
