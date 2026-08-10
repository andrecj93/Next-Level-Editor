<template>
  <Teleport to="body">
    <div
      v-if="showToolbar"
      ref="toolbarEl"
      class="mobile-toolbar nle-chrome"
      :class="[
        presetClass,
        {
          'toolbar-collapsed': isCollapsed,
          'theme-dark': isDark,
          'is-fullscreen': isFullscreen,
        },
      ]"
      :style="{ bottom: `${keyboardInset}px` }"
    >
    <!-- Toolbar Header -->
    <div class="toolbar-header">
      <button
        class="toolbar-toggle touch-target"
        :aria-label="isCollapsed ? 'Expand toolbar' : 'Collapse toolbar'"
        :aria-expanded="!isCollapsed"
        @click="toggleCollapse"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            v-if="isCollapsed"
            d="M5 8l5 5 5-5H5z"
          />
          <path
            v-else
            d="M5 12l5-5 5 5H5z"
          />
        </svg>
      </button>

      <div class="toolbar-title">
        {{ currentTab.label }}
      </div>

      <button
        class="toolbar-close touch-target"
        aria-label="Close toolbar"
        @click="emit('close')"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            d="M6 6l8 8m0-8l-8 8"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <!-- Tab Navigation -->
    <div
      v-show="!isCollapsed"
      class="toolbar-tabs"
      role="tablist"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="toolbar-tab touch-target"
        :class="{ 'tab-active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`panel-${tab.id}`"
        role="tab"
        @click="selectTab(tab.id)"
      >
        <span
          class="tab-icon"
          v-html="tab.icon"
        />
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div
      v-show="!isCollapsed"
      class="toolbar-content"
    >
      <!-- Format Tab -->
      <div
        v-show="activeTab === 'format'"
        id="panel-format"
        class="toolbar-panel"
        role="tabpanel"
      >
        <div class="button-group">
          <button
            v-for="action in formatActions"
            :key="action.id"
            class="toolbar-button touch-target-lg"
            :class="{ active: action.isActive?.() }"
            :aria-label="action.label"
            :title="action.label"
            @click="action.onClick"
          >
            <span v-html="action.icon" />
          </button>
        </div>
      </div>

      <!-- Insert Tab -->
      <div
        v-show="activeTab === 'insert'"
        id="panel-insert"
        class="toolbar-panel"
        role="tabpanel"
      >
        <div class="button-grid">
          <button
            v-for="action in insertActions"
            :key="action.id"
            class="toolbar-button-large touch-target-xl"
            :aria-label="action.label"
            @click="action.onClick"
          >
            <span
              class="button-icon"
              v-html="action.icon"
            />
            <span class="button-label">{{ action.label }}</span>
          </button>
        </div>
      </div>

      <!-- Blocks Tab -->
      <div
        v-show="activeTab === 'blocks'"
        id="panel-blocks"
        class="toolbar-panel"
        role="tabpanel"
      >
        <div class="block-list">
          <button
            v-for="block in blockActions"
            :key="block.id"
            class="block-button touch-target"
            :aria-label="`Convert to ${block.label}`"
            @click="block.onClick"
          >
            <span
              class="block-icon"
              v-html="block.icon"
            />
            <span class="block-label">{{ block.label }}</span>
          </button>
        </div>
      </div>

      <!-- More Tab -->
      <div
        v-show="activeTab === 'more'"
        id="panel-more"
        class="toolbar-panel"
        role="tabpanel"
      >
        <div class="more-list">
          <button
            v-for="action in moreActions"
            :key="action.id"
            class="more-button touch-target"
            :aria-label="action.label"
            @click="action.onClick"
          >
            <span
              class="more-icon"
              v-html="action.icon"
            />
            <span class="more-label">{{ action.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Haptic Feedback Indicator (for debugging) -->
      <div
        v-if="showHapticIndicator"
        class="haptic-indicator"
      >
        <div class="haptic-pulse" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useDeviceDetection } from "../composables/useDeviceDetection";
import { nextInstanceToken } from "../utils/instanceToken";

// Props
interface Props {
  visible?: boolean;
  defaultTab?: string;
  enableHaptics?: boolean;
  /** Resolves whether a format action (by id) is active at the caret. */
  isActive?: (actionId: string) => boolean;
  /**
   * The editor root this bar belongs to. Because the bar teleports to <body>
   * it cannot find its own editor by walking the DOM, so it mirrors that
   * element's `theme-dark` / `fullscreen` classes onto itself. Omit it and the
   * bar falls back to the first `.next-level-editor` on the page — right for a
   * single editor, wrong as soon as there are two.
   */
  editorRoot?: HTMLElement | null;
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  defaultTab: "format",
  enableHaptics: true,
  isActive: undefined,
  editorRoot: null,
});

// Emits
const emit = defineEmits<{
  close: [];
  action: [actionId: string];
}>();

// Composables
const { showMobileToolbar } = useDeviceDetection();

// State
const isCollapsed = ref(false);
const activeTab = ref(props.defaultTab);
const showHapticIndicator = ref(false);

// Show toolbar only on mobile devices — and only when the owning editor
// instance says so (`visible` is driven by focus/last-interaction ownership
// in NextLevelEditor, so multi-editor pages never stack toolbars).
const showToolbar = computed(() => props.visible && showMobileToolbar.value);

// ---------------------------------------------------------------------------
// Bottom clearance for other fixed chrome (FABs etc.).
// While this fixed bottom bar is visible it publishes its on-screen height as
// a global CSS custom property so anything else pinned to the viewport bottom
// (comments/stats/variables FABs) can offset itself above the bar instead of
// being covered by it. Measured from the live rect — never a hardcoded guess —
// and kept fresh via ResizeObserver (tab switches change the content height)
// plus transitionend (collapse/expand animates `transform`, which observers
// don't see). Only one toolbar is VISIBLE at a time (ownership above) — but
// every editor still mounts one, and the watcher below is `immediate`, so the
// hidden instances DO reach the clear path and fought over this single global
// property until it was stamped with an owner token. #R22-M2
// ---------------------------------------------------------------------------
const toolbarEl = ref<HTMLElement | null>(null);
const CLEARANCE_PROP = "--nle-mobile-toolbar-clearance";
/**
 * The clearance is ONE global property on <html>, but every editor instance
 * mounts a MobileToolbar and the showToolbar watcher is `immediate`. A second,
 * non-owning (hidden) bar therefore ran clearClearance() at setup — and again
 * on unmount — erasing the value the VISIBLE bar had published and dropping the
 * FAB column onto it. Stamp the publisher so only it may remove the property.
 * #R22-M2
 */
const CLEARANCE_OWNER_ATTR = "data-nle-clearance-owner";
const clearanceOwnerId = nextInstanceToken("nle-mtb");
let clearanceObserver: ResizeObserver | null = null;

const updateClearance = () => {
  const el = toolbarEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  // Visible height of the bar = viewport bottom minus its (possibly
  // transform-translated, when collapsed) top edge.
  const clearance = Math.max(0, Math.round(window.innerHeight - rect.top));
  document.documentElement.setAttribute(
    CLEARANCE_OWNER_ATTR,
    clearanceOwnerId
  );
  document.documentElement.style.setProperty(CLEARANCE_PROP, `${clearance}px`);
};

const clearClearance = () => {
  clearanceObserver?.disconnect();
  clearanceObserver = null;
  // The showToolbar watcher is immediate, so this runs at setup — during SSR
  // there is no document. Nothing to clear on the server.
  if (typeof document === "undefined") return;
  // Only the instance that PUBLISHED the clearance may remove it: every editor
  // mounts a toolbar, so a hidden, non-owning one would otherwise erase the
  // visible bar's value at setup and on unmount. #R22-M2
  if (
    document.documentElement.getAttribute(CLEARANCE_OWNER_ATTR) !==
    clearanceOwnerId
  ) {
    return;
  }
  document.documentElement.removeAttribute(CLEARANCE_OWNER_ATTR);
  document.documentElement.style.removeProperty(CLEARANCE_PROP);
};

watch(
  showToolbar,
  (shown) => {
    if (!shown) {
      clearClearance();
      return;
    }
    nextTick(() => {
      const el = toolbarEl.value;
      if (!el) return;
      updateClearance();
      if (typeof ResizeObserver !== "undefined") {
        clearanceObserver = new ResizeObserver(updateClearance);
        clearanceObserver.observe(el);
      }
      el.addEventListener("transitionend", updateClearance);
    });
  },
  { immediate: true }
);

// ---------------------------------------------------------------------------
// Keyboard avoidance (iOS/Android on-screen keyboard).
// This bar is `position: fixed; bottom: 0`. On iOS the LAYOUT viewport does not
// shrink when the soft keyboard appears — only the VISUAL viewport does — so a
// bottom-pinned fixed bar ends up stranded *behind* the keyboard, unreachable.
// Follow `window.visualViewport` and lift the bar by the keyboard inset (the
// gap between the visual viewport's bottom and the layout viewport's bottom)
// so it stays docked to the visible edge. offsetTop covers a pinch-scrolled
// visual viewport. Falls back to 0 (plain bottom:0) where the API is absent.
// ---------------------------------------------------------------------------
const keyboardInset = ref(0);
let visualViewportTarget: VisualViewport | null = null;

const updateKeyboardInset = () => {
  const vv =
    typeof window !== "undefined" ? window.visualViewport ?? null : null;
  if (!vv) {
    keyboardInset.value = 0;
    return;
  }
  keyboardInset.value = Math.max(
    0,
    Math.round(window.innerHeight - vv.height - vv.offsetTop)
  );
};

// Because the toolbar teleports to <body>, it escapes the editor's
// `.theme-dark` AND `.fullscreen` scopes. Mirror both editor-root classes
// onto our own root: theme so the global themed tokens (mapped in the
// <style> block) resolve to dark values, and fullscreen so the bar can lift
// itself above the fullscreen editor shell (see the z-index contract on
// `.mobile-toolbar.is-fullscreen`) instead of being buried under it.
const isDark = ref(false);
const isFullscreen = ref(false);
// The editor's theme-preset class (nle-theme-<preset>), mirrored onto this bar.
// A <body>-teleported node cannot resolve the preset tokens without it, so with
// a themePreset the bar rendered in the BASE palette while every other surface
// was themed. #R23-35
const presetClass = ref<string | null>(null);
let editorClassObserver: MutationObserver | null = null;

// OUR editor, not just any editor. The document-wide lookup this replaces
// matched the FIRST `.next-level-editor` on the page, so with two editors
// mounted the light one's bar rendered dark and its observer watched the other
// editor's element — its own theme/fullscreen toggles changed nothing. #R22-M3
const resolveEditorRoot = (): HTMLElement | null =>
  props.editorRoot ??
  document.querySelector<HTMLElement>(".next-level-editor");

const syncEditorClasses = () => {
  const root = resolveEditorRoot();
  isDark.value = root?.classList.contains("theme-dark") ?? false;
  isFullscreen.value = root?.classList.contains("fullscreen") ?? false;
  presetClass.value =
    Array.from(root?.classList ?? []).find((c) =>
      c.startsWith("nle-theme-")
    ) ?? null;
};

const observeEditorClasses = () => {
  editorClassObserver?.disconnect();
  editorClassObserver = null;
  const root = resolveEditorRoot();
  if (!root) return;
  editorClassObserver = new MutationObserver(syncEditorClasses);
  editorClassObserver.observe(root, {
    attributes: true,
    attributeFilter: ["class"],
  });
};

// The parent's own root ref is still null while this child mounts, so the real
// element arrives one tick LATE — re-resolve when it does, or every editor
// would permanently fall back to "first on the page".
watch(
  () => props.editorRoot,
  () => {
    syncEditorClasses();
    observeEditorClasses();
  }
);

onMounted(() => {
  syncEditorClasses();
  observeEditorClasses();

  if (typeof window !== "undefined" && window.visualViewport) {
    visualViewportTarget = window.visualViewport;
    visualViewportTarget.addEventListener("resize", updateKeyboardInset);
    visualViewportTarget.addEventListener("scroll", updateKeyboardInset);
    updateKeyboardInset();
  }
});

onUnmounted(() => {
  editorClassObserver?.disconnect();
  editorClassObserver = null;
  clearClearance();
  if (visualViewportTarget) {
    visualViewportTarget.removeEventListener("resize", updateKeyboardInset);
    visualViewportTarget.removeEventListener("scroll", updateKeyboardInset);
    visualViewportTarget = null;
  }
});

// Tabs configuration
const tabs = [
  {
    id: "format",
    label: "Format",
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><text x="2" y="15" font-weight="bold" font-size="14">B</text></svg>',
  },
  {
    id: "insert",
    label: "Insert",
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 5v10M5 10h10"/></svg>',
  },
  {
    id: "blocks",
    label: "Blocks",
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="4" width="12" height="3" rx="1"/><rect x="4" y="9" width="12" height="3" rx="1"/><rect x="4" y="14" width="12" height="3" rx="1"/></svg>',
  },
  {
    id: "more",
    label: "More",
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="5" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="15" r="1.5"/></svg>',
  },
];

// Current tab data
const currentTab = computed(
  () => tabs.find((t) => t.id === activeTab.value) || tabs[0]
);

// Shared stroke icon factory — same visual language as the desktop toolbar
// (24px stroke icons), replacing the old emoji glyphs that clashed with the
// design system and rendered inconsistently across platforms.
const svgIcon = (paths: string, size = 24): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const ICON_LINK =
  '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>';

// Format actions (bold, italic, etc.)
const formatActions = [
  {
    id: "bold",
    label: "Bold",
    icon: "<strong>B</strong>",
    onClick: () => executeAction("bold"),
    isActive: () => props.isActive?.("bold") ?? false,
  },
  {
    id: "italic",
    label: "Italic",
    icon: "<em>I</em>",
    onClick: () => executeAction("italic"),
    isActive: () => props.isActive?.("italic") ?? false,
  },
  {
    id: "underline",
    label: "Underline",
    icon: "<u>U</u>",
    onClick: () => executeAction("underline"),
    isActive: () => props.isActive?.("underline") ?? false,
  },
  {
    id: "strikethrough",
    label: "Strikethrough",
    icon: "<s>S</s>",
    onClick: () => executeAction("strikethrough"),
    isActive: () => props.isActive?.("strikethrough") ?? false,
  },
  {
    id: "code",
    label: "Code",
    icon: "<code>&lt;/&gt;</code>",
    onClick: () => executeAction("code"),
    isActive: () => props.isActive?.("code") ?? false,
  },
  {
    id: "link",
    label: "Link",
    icon: svgIcon(ICON_LINK, 18),
    onClick: () => executeAction("link"),
    isActive: () => false,
  },
];

// Insert actions — full parity with the desktop Insert menu (minus Code Block,
// which lives in the Blocks tab). Every id has a matching case in
// NextLevelEditor's handleMobileAction; never add a button without one.
const insertActions = [
  {
    id: "link",
    label: "Link",
    icon: svgIcon(ICON_LINK),
    onClick: () => executeAction("link"),
  },
  {
    id: "image",
    label: "Image",
    icon: svgIcon(
      '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>'
    ),
    onClick: () => executeAction("image"),
  },
  {
    id: "file-manager",
    label: "File Manager",
    icon: svgIcon(
      '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>'
    ),
    onClick: () => executeAction("file-manager"),
  },
  {
    id: "video",
    label: "Video",
    icon: svgIcon(
      '<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>'
    ),
    onClick: () => executeAction("video"),
  },
  {
    id: "table",
    label: "Table",
    icon: svgIcon(
      '<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>'
    ),
    onClick: () => executeAction("table"),
  },
  {
    id: "hr",
    label: "Divider",
    icon: svgIcon('<path d="M5 12h14"/>'),
    onClick: () => executeAction("hr"),
  },
  {
    id: "page-break",
    label: "Page Break",
    icon: svgIcon(
      '<line x1="3" x2="21" y1="12" y2="12"/><polyline points="8 8 12 4 16 8"/><polyline points="16 16 12 20 8 16"/>'
    ),
    onClick: () => executeAction("page-break"),
  },
  {
    id: "toc",
    label: "Contents",
    icon: svgIcon(
      '<path d="M21 12h-8"/><path d="M21 6H8"/><path d="M21 18h-8"/><path d="M3 6v4c0 1.1.9 2 2 2h3"/><path d="M3 10v6c0 1.1.9 2 2 2h3"/>'
    ),
    onClick: () => executeAction("toc"),
  },
  {
    id: "emoji",
    label: "Emoji",
    icon: svgIcon(
      '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>'
    ),
    onClick: () => executeAction("emoji"),
  },
];

// Block actions (heading, list, etc.)
const blockActions = [
  {
    id: "paragraph",
    label: "Paragraph",
    icon: "¶",
    onClick: () => executeAction("paragraph"),
  },
  {
    id: "h1",
    label: "Heading 1",
    icon: "H1",
    onClick: () => executeAction("h1"),
  },
  {
    id: "h2",
    label: "Heading 2",
    icon: "H2",
    onClick: () => executeAction("h2"),
  },
  {
    id: "h3",
    label: "Heading 3",
    icon: "H3",
    onClick: () => executeAction("h3"),
  },
  {
    id: "bullet-list",
    label: "Bullet List",
    icon: "•",
    onClick: () => executeAction("bullet-list"),
  },
  {
    id: "numbered-list",
    label: "Numbered List",
    icon: "1.",
    onClick: () => executeAction("numbered-list"),
  },
  {
    id: "checklist",
    label: "Checklist",
    icon: "☑",
    onClick: () => executeAction("checklist"),
  },
  {
    id: "blockquote",
    label: "Quote",
    icon: '"',
    onClick: () => executeAction("blockquote"),
  },
  {
    id: "code-block",
    label: "Code Block",
    icon: "{  }",
    onClick: () => executeAction("code-block"),
  },
];

// More actions (settings, export, etc.)
const moreActions = [
  {
    id: "undo",
    label: "Undo",
    icon: svgIcon('<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>'),
    onClick: () => executeAction("undo"),
  },
  {
    id: "redo",
    label: "Redo",
    icon: svgIcon('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>'),
    onClick: () => executeAction("redo"),
  },
  {
    id: "find",
    label: "Find & Replace",
    icon: svgIcon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
    onClick: () => executeAction("find"),
  },
  // NOTE: "shortcuts" (Keyboard Shortcuts), "export" and "settings" are
  // intentionally not offered — NextLevelEditor's handleMobileAction has no
  // handler for them yet, so the buttons (one even badged "New") silently did
  // nothing. Restore them here once mobile-friendly handlers exist.
];

// Methods
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  triggerHaptic("light");
};

const selectTab = (tabId: string) => {
  activeTab.value = tabId;
  triggerHaptic("light");
};

const executeAction = (actionId: string) => {
  emit("action", actionId);
  triggerHaptic("medium");
};

const triggerHaptic = (intensity: "light" | "medium" | "heavy" = "light") => {
  if (!props.enableHaptics) return;
  if (!("vibrate" in navigator)) return;

  const patterns = {
    light: 10,
    medium: 20,
    heavy: 50,
  };

  try {
    navigator.vibrate(patterns[intensity]);

    // Show visual indicator
    showHapticIndicator.value = true;
    setTimeout(() => {
      showHapticIndicator.value = false;
    }, patterns[intensity] + 100);
  } catch (error) {
    console.debug("Haptic feedback failed:", error);
  }
};
</script>

<style scoped>
/* ============================================
   Mobile Toolbar Container
   ============================================ */

.mobile-toolbar {
  /* This root is teleported to <body>, so it no longer inherits the
     editor-scoped toolbar/editor vars. Map every local var to a GLOBAL themed
     token from tokens.css instead: those live on :root (so the teleported node
     still inherits them) and flip under the .theme-dark class we mirror onto
     this root, keeping the whole toolbar theme-correct. */
  --toolbar-bg: var(--color-surface-raised); /* chrome (header/tabs) surface */
  --toolbar-border: var(--color-border);
  --toolbar-header-bg: var(--secondary-bg);
  --toolbar-tabs-bg: var(--secondary-bg);
  --toolbar-content-bg: var(--color-surface); /* content surface */
  --tab-active-bg: var(--color-surface); /* active tab connects to content surface */
  --button-bg: var(--color-surface);
  --button-border: var(--color-border);
  --text-primary: var(--color-text);
  --text-secondary: var(--color-text-secondary);

  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--toolbar-bg, #ffffff);
  border-top: 1px solid var(--toolbar-border, #e5e7eb);
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.1);
  /* Below modal overlays (z-index 1000) so a dialog — e.g. the file manager —
     is never covered by this persistent bottom bar; still above page content. */
  z-index: 900;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 60vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Fullscreen: the editor root becomes a fixed overlay at z-index 9999
   (.next-level-editor.fullscreen in styles/NextLevelEditor.css), which would
   bury this z-900 bar entirely. The `is-fullscreen` class is mirrored from
   the editor root by the same MutationObserver as the theme classes.
   Stacking contract in fullscreen: dialog overlays 10050 > this bar 10001 >
   floating panels 10000 > fullscreen shell 9999 > FABs 9998 — the bar must
   beat the shell (or mobile fullscreen has zero formatting chrome), while
   every real dialog still wins. */
.mobile-toolbar.is-fullscreen {
  z-index: 10001;
}

.toolbar-collapsed {
  transform: translateY(calc(100% - 56px));
}

/* ============================================
   Toolbar Header
   ============================================ */

.toolbar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  min-height: 56px;
  background: var(--toolbar-header-bg, #f9fafb);
  border-bottom: 1px solid var(--toolbar-border, #e5e7eb);
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  flex: 1;
  text-align: center;
}

.toolbar-toggle,
.toolbar-close {
  background: none;
  border: none;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.toolbar-toggle:active,
.toolbar-close:active {
  background: var(--button-active-bg, #e5e7eb);
  transform: scale(0.95);
}

/* ============================================
   Tab Navigation
   ============================================ */

.toolbar-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: var(--toolbar-tabs-bg, #f9fafb);
  overflow-x: auto;
  scrollbar-width: none;
}

.toolbar-tabs::-webkit-scrollbar {
  display: none;
}

.toolbar-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  transition: all 0.2s;
  padding: 8px 12px;
}

/* Filled accent pill: an explicit background keeps the label at >=4.5:1 (WCAG
   AA) regardless of theme — a light accent-on-surface pill fails AA in both
   light (~3.7:1) and dark (~4.0:1). White on primary-600 is ~5.2:1. */
.toolbar-tab.tab-active {
  background: var(--color-primary-600, #2563eb);
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
}

.toolbar-tab.tab-active .tab-label {
  font-weight: 600;
}

.tab-icon {
  font-size: 20px;
}

.tab-label {
  font-size: 12px;
  font-weight: 500;
}

/* ============================================
   Toolbar Content
   ============================================ */

.toolbar-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: var(--toolbar-content-bg, #ffffff);
}

.toolbar-panel {
  min-height: 100%;
}

/* Format Panel */
.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.toolbar-button {
  background: var(--button-bg, #f3f4f6);
  border: 1px solid var(--button-border, #e5e7eb);
  border-radius: 8px;
  color: var(--text-primary, #1f2937);
  cursor: pointer;
  font-size: 18px;
  font-weight: 600;
  transition: all 0.2s;
}

.toolbar-button.active {
  background: var(--button-active-bg, #2563eb);
  color: #ffffff;
  border-color: var(--button-active-border, #1e40af);
}

.toolbar-button:active {
  transform: scale(0.95);
}

/* Insert Panel */
.button-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.toolbar-button-large {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: var(--button-bg, #f3f4f6);
  border: 1px solid var(--button-border, #e5e7eb);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-button-large:active {
  transform: scale(0.97);
  background: var(--button-active-bg, #e5e7eb);
}

.button-icon {
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary, #1f2937);
}

.button-icon :deep(svg),
.more-icon :deep(svg) {
  display: inline-block;
  vertical-align: middle;
}

.button-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #1f2937);
}

/* Blocks Panel */
.block-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.block-button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--button-bg, #f3f4f6);
  border: 1px solid var(--button-border, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.block-button:active {
  transform: scale(0.98);
  background: var(--button-active-bg, #e5e7eb);
}

.block-icon {
  font-size: 24px;
  font-weight: bold;
  min-width: 32px;
  text-align: center;
}

.block-label {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary, #1f2937);
}

/* More Panel */
.more-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.more-button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.more-button:active {
  background: var(--button-active-bg, #f3f4f6);
}

.more-icon {
  font-size: 24px;
  min-width: 32px;
  text-align: center;
}

.more-label {
  flex: 1;
  font-size: 16px;
  color: var(--text-primary, #1f2937);
}

/* ============================================
   Haptic Indicator (Debug)
   ============================================ */

.haptic-indicator {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10000;
}

.haptic-pulse {
  width: 80px;
  height: 80px;
  background: rgba(74, 144, 226, 0.3);
  border-radius: 50%;
  animation: pulse 0.3s ease-out;
}

@keyframes pulse {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

/* ============================================
   Safe Area Support (iOS notch/island)
   ============================================ */

@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .mobile-toolbar {
    padding-bottom: env(safe-area-inset-bottom);
  }
}

/* Reduced-motion: this bar is teleported to <body>, so it escapes the
   editor-scoped prefers-reduced-motion guards in NextLevelEditor.css. Zero out
   the collapse/expand slide, the button press scaling and the haptic pulse for
   users who ask for less motion. */
@media (prefers-reduced-motion: reduce) {
  .mobile-toolbar,
  .toolbar-toggle,
  .toolbar-close,
  .toolbar-tab,
  .toolbar-button,
  .toolbar-button-large,
  .block-button,
  .more-button {
    transition: none !important;
  }

  .toolbar-toggle:active,
  .toolbar-close:active,
  .toolbar-button:active,
  .toolbar-button-large:active,
  .block-button:active {
    transform: none !important;
  }

  .haptic-pulse {
    animation: none !important;
  }
}
</style>
