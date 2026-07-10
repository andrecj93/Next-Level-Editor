<template>
  <teleport to="body">
    <div
      v-if="targetPoint"
      ref="rootEl"
      class="playhead"
      :class="[
        theme,
        {
          'is-settled': settled,
          'is-below': state === 'selection' && !!selectionPosition?.below,
        },
      ]"
      :style="rootStyle"
      :data-state="state"
      role="toolbar"
      aria-label="Editor toolbar"
      @mousedown.prevent
    >
      <div class="playhead-pill">
        <!-- AMBIENT — slim lozenge: save-state dot + word count. -->
        <div
          class="playhead-layer layer-ambient"
          :class="{ 'is-active': state === 'ambient' }"
          v-bind="layerAttrs(state === 'ambient')"
        >
          <span
            class="playhead-dot"
            :class="{ 'is-saving': isSaving }"
            aria-hidden="true"
          />
          <span class="playhead-sr">{{
            isSaving ? "Saving…" : "All changes saved"
          }}</span>
          <span class="playhead-count">{{ wordCountLabel }}</span>
        </div>

        <!-- HOME — the writing essentials: Format, B/I/U/S, "+", "⋯". -->
        <div
          class="playhead-layer layer-home"
          :class="{ 'is-active': state === 'home' }"
          v-bind="layerAttrs(state === 'home')"
        >
          <div class="playhead-menu-wrap">
            <button
              type="button"
              class="playhead-trigger playhead-trigger-format"
              :class="{ 'is-open': openMenu === 'format' }"
              aria-label="Paragraph format"
              aria-haspopup="true"
              :aria-expanded="openMenu === 'format'"
              title="Paragraph format"
              @mousedown.prevent="$emit('remember-selection')"
              @click.stop="toggleMenu('format')"
            >
              <span class="playhead-format-label">{{ formatLabel }}</span>
              <span class="playhead-arrow" aria-hidden="true">▼</span>
            </button>
            <transition name="playhead-menu">
              <div
                v-if="openMenu === 'format'"
                class="dropdown-menu playhead-menu"
                role="menu"
                @click.stop
              >
                <template
                  v-for="(item, index) in formatItems"
                  :key="item.id || index"
                >
                  <div v-if="item.divider" class="dropdown-divider" />
                  <button
                    v-else
                    type="button"
                    class="dropdown-item"
                    role="menuitem"
                    :class="{ active: item.isActive?.() }"
                    :aria-label="item.label"
                    @mousedown.prevent
                    @click="handleItemClick(item)"
                  >
                    <span v-if="item.icon" class="item-icon" v-html="item.icon" />
                    <span class="item-label">{{ item.label }}</span>
                    <span v-if="item.shortcut" class="item-shortcut">{{
                      item.shortcut
                    }}</span>
                  </button>
                </template>
              </div>
            </transition>
          </div>

          <span class="playhead-sep" aria-hidden="true" />

          <button
            v-for="action in inlineActions"
            :key="action.id"
            type="button"
            class="playhead-btn"
            :class="{ active: action.isActive?.() }"
            :disabled="action.isDisabled?.()"
            :aria-label="action.label"
            :aria-pressed="action.isActive ? action.isActive() : undefined"
            :title="action.tooltip"
            @mousedown.prevent="$emit('remember-selection')"
            @click="action.onClick()"
          >
            <span v-if="action.icon" class="playhead-btn-icon" v-html="action.icon" />
            <span v-else class="playhead-btn-label">{{ action.label }}</span>
          </button>

          <span class="playhead-sep" aria-hidden="true" />

          <div
            v-for="menu in trailingMenus"
            :key="menu.id"
            class="playhead-menu-wrap"
          >
            <button
              type="button"
              class="playhead-trigger playhead-trigger-icon"
              :class="{ 'is-open': openMenu === menu.id }"
              :aria-label="menu.ariaLabel"
              aria-haspopup="true"
              :aria-expanded="openMenu === menu.id"
              :title="menu.tooltip"
              @mousedown.prevent="$emit('remember-selection')"
              @click.stop="toggleMenu(menu.id)"
            >
              <span class="playhead-btn-icon" v-html="menu.icon" />
            </button>
            <transition name="playhead-menu">
              <div
                v-if="openMenu === menu.id"
                class="dropdown-menu playhead-menu"
                role="menu"
                @click.stop
              >
                <template
                  v-for="(item, index) in menu.items"
                  :key="item.id || index"
                >
                  <div v-if="item.divider" class="dropdown-divider" />
                  <button
                    v-else
                    type="button"
                    class="dropdown-item"
                    role="menuitem"
                    :class="{ active: item.isActive?.() }"
                    :aria-label="item.label"
                    @mousedown.prevent
                    @click="handleItemClick(item)"
                  >
                    <span v-if="item.icon" class="item-icon" v-html="item.icon" />
                    <span class="item-label">{{ item.label }}</span>
                    <span v-if="item.shortcut" class="item-shortcut">{{
                      item.shortcut
                    }}</span>
                  </button>
                </template>
              </div>
            </transition>
          </div>
        </div>

        <!-- SELECTION — the pill IS the bubble: inline formatting set. -->
        <div
          class="playhead-layer layer-selection"
          :class="{ 'is-active': state === 'selection' }"
          v-bind="layerAttrs(state === 'selection')"
        >
          <button
            v-for="action in inlineActions"
            :key="action.id"
            type="button"
            class="playhead-btn"
            :class="{ active: action.isActive?.() }"
            :disabled="action.isDisabled?.()"
            :aria-label="action.label"
            :aria-pressed="action.isActive ? action.isActive() : undefined"
            :title="action.tooltip"
            @mousedown.prevent="$emit('remember-selection')"
            @click="action.onClick()"
          >
            <span v-if="action.icon" class="playhead-btn-icon" v-html="action.icon" />
            <span v-else class="playhead-btn-label">{{ action.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import type { ToolbarAction } from "../types/toolbar";
import type {
  PlayheadState,
  PlayheadAnchorRect,
  PlayheadSelectionPosition,
  PlayheadMenuItem,
} from "./PlayheadPill.types";

/**
 * PLAYHEAD — the morphing-pill toolbar mode (dynamic-island grammar for a
 * writing tool). ONE floating capsule is the editor's entire chrome: it
 * absorbs the main toolbar AND the selection bubble into a single continuous
 * object that morphs between three states (ambient / home / selection).
 *
 * Purely presentational: the HOST owns the state machine (typing recede ->
 * ambient, non-collapsed selection -> selection, else home) and all geometry
 * (anchorRect for the editor root, selectionPosition via
 * computeToolbarPosition with scrollX/scrollY = 0 — the pill is fixed).
 *
 * Compositor-safe motion, by construction:
 *  - The element sits at fixed 0,0 and is positioned ENTIRELY via
 *    transform: translate3d(...). Travel between anchor and selection is a
 *    transform transition — top/left never animate (they never even change).
 *  - State size changes are a TWO-LAYER CROSSFADE: all three layers are
 *    pre-rendered, the active one is in-flow (it sizes the pill, which snaps),
 *    inactive ones are absolute + opacity 0 + scale. No width/height tweens.
 *  - NOTHING animates on mount: transitions are gated behind `.is-settled`,
 *    set only after two post-mount animation frames (same staging discipline
 *    as EditorToolbar's one-shot classes). First render is a plain opacity
 *    fade via a keyframe — no transform animation (Playwright "stable" safe).
 *  - prefers-reduced-motion: every morph/travel duration is a
 *    var(--nle-motion-morph) token, which tokens.css zeroes under reduced
 *    motion — movement collapses to the opacity crossfade.
 */

interface Props {
  /** Host-driven chrome state; the component never decides this itself. */
  state: PlayheadState;
  /**
   * Viewport rect of the editor root ({top,left,width} from
   * getBoundingClientRect). Ambient/home anchor: the pill centers over it,
   * 12px below the top edge. Host refreshes it on resize/scroll.
   */
  anchorRect: PlayheadAnchorRect | null;
  /**
   * Travel target in "selection" state (computeToolbarPosition with
   * scrollX/scrollY = 0). Null while there is no selection; if null in
   * selection state the pill stays at the anchor.
   */
  selectionPosition: PlayheadSelectionPosition | null;
  /** Active block-format name for the serif Format trigger (masthead grammar). */
  formatLabel: string;
  /** Live word count for the ambient lozenge. */
  wordCount: number;
  /** True while an auto-save is in flight — pulses the ambient dot. */
  isSaving: boolean;
  /** Inline formatting set (B/I/U/S + link) — same objects EditorToolbar uses. */
  inlineActions: ToolbarAction[];
  /** Format dropdown items (host's formatDropdownItems). */
  formatItems: PlayheadMenuItem[];
  /** Insert "+" menu items (host's insertDropdownItems). */
  insertItems: PlayheadMenuItem[];
  /** "⋯" overflow menu items. */
  overflowItems: PlayheadMenuItem[];
  /**
   * Theme passthrough for the teleported root (e.g. "theme-dark
   * nle-theme-warm") — teleporting to <body> escapes the editor's theme scope,
   * same convention as ModalsContainer.
   */
  theme?: string;
}

const props = defineProps<Props>();

defineEmits<{
  /**
   * Emitted on every trigger/button mousedown (which is prevented) so the
   * host can save the editor selection before focus would move — the same
   * contract as EditorToolbar/ToolbarDropdown.
   */
  "remember-selection": [];
}>();

/** Ambient/home vertical offset below the editor's top edge. */
const ANCHOR_TOP_OFFSET = 12;

// --- Positioning: everything through transform ------------------------------

const targetPoint = computed<{ x: number; y: number } | null>(() => {
  if (props.state === "selection" && props.selectionPosition) {
    return { x: props.selectionPosition.left, y: props.selectionPosition.top };
  }
  if (props.anchorRect) {
    return {
      x: props.anchorRect.left + props.anchorRect.width / 2,
      y: props.anchorRect.top + ANCHOR_TOP_OFFSET,
    };
  }
  return null;
});

const rootStyle = computed(() => {
  const point = targetPoint.value;
  if (!point) return undefined;
  // translate3d positions the pill; the trailing translateX(-50%) centers it
  // on the target x (both compose on the compositor — no layout work).
  return {
    transform: `translate3d(${point.x}px, ${point.y}px, 0) translateX(-50%)`,
  };
});

// --- Mount-settle guard: state transitions animate, mount never does --------

const settled = ref(false);
let settleFrame = 0;

onMounted(() => {
  // Two frames: the first paints the initial position/state, the second
  // arms the transitions — so nothing can morph or travel on mount.
  settleFrame = requestAnimationFrame(() => {
    settleFrame = requestAnimationFrame(() => {
      settled.value = true;
    });
  });
});

// --- Layer a11y: inactive layers are invisible AND unreachable --------------

/**
 * Inactive layers stay pre-rendered (the crossfade needs both sides in the
 * DOM) but must not be readable or tabbable. `inert` blocks focus in modern
 * browsers; aria-hidden + pointer-events (CSS) cover the rest.
 */
const layerAttrs = (active: boolean): Record<string, unknown> => ({
  "aria-hidden": active ? undefined : "true",
  inert: active ? undefined : "",
});

// --- Word count --------------------------------------------------------------

const wordCountLabel = computed(
  () =>
    `${props.wordCount.toLocaleString()} ${props.wordCount === 1 ? "word" : "words"}`
);

// --- Menus (Format / insert / overflow) --------------------------------------

type MenuId = "format" | "insert" | "overflow";

const openMenu = ref<MenuId | null>(null);
const rootEl = ref<HTMLElement | null>(null);

const svgIcon = (paths: string): string =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const trailingMenus = computed(() => [
  {
    id: "insert" as const,
    ariaLabel: "Insert",
    tooltip: "Insert content",
    icon: svgIcon('<path d="M5 12h14"/><path d="M12 5v14"/>'),
    items: props.insertItems,
  },
  {
    id: "overflow" as const,
    ariaLabel: "More options",
    tooltip: "More options",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    items: props.overflowItems,
  },
]);

const toggleMenu = (id: MenuId) => {
  openMenu.value = openMenu.value === id ? null : id;
};

const handleItemClick = (item: PlayheadMenuItem) => {
  item.onClick?.();
  openMenu.value = null;
};

// Leaving the state a menu lives in must not strand it open.
watch(
  () => props.state,
  () => {
    openMenu.value = null;
  }
);

// Standard menu dismissal — Escape (capture, so an open menu wins over the
// editor's own document-level Escape handling) and click-outside; the same
// conventions as ToolbarDropdown.
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Escape" || !openMenu.value) return;
  event.preventDefault();
  event.stopPropagation();
  openMenu.value = null;
};

const handleClickOutside = (event: MouseEvent) => {
  if (!openMenu.value) return;
  if (rootEl.value && !rootEl.value.contains(event.target as Node)) {
    openMenu.value = null;
  }
};

onMounted(() => {
  document.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(settleFrame);
  document.removeEventListener("keydown", handleKeydown, true);
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
/* =============================================================================
   PLAYHEAD ROOT — fixed at 0,0; positioned ONLY via transform (the travel).
   ============================================================================= */
.playhead {
  position: fixed;
  top: 0;
  left: 0;
  z-index: var(--z-index-popover, 1060);
  will-change: transform;
  /* First render: a plain opacity fade — never a transform animation. */
  animation: playhead-in var(--nle-motion-enter, 180ms)
    var(--nle-ease-out, cubic-bezier(0.05, 0.7, 0.1, 1)) both;
}

@keyframes playhead-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Travel (anchor <-> selection) is a transform transition, armed only after
   the mount has settled. Duration token zeroes under prefers-reduced-motion
   (tokens.css), so travel degrades to an instant reposition + crossfade. */
.playhead.is-settled {
  transition: transform var(--nle-motion-morph, 260ms)
    var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1));
}

/* =============================================================================
   THE PILL — the ONE glass surface. Solid raised-surface fallback first;
   glass (blur + saturate over a translucent mix of the same token) only where
   both backdrop-filter and color-mix are supported.
   ============================================================================= */
.playhead-pill {
  position: relative;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 999px;
  background: var(--color-surface-raised, #ffffff);
  border: 1px solid var(--color-divider, #e5e7eb);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
}

@supports (
    (backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px))
  )
  and (background: color-mix(in srgb, red 60%, transparent)) {
  .playhead-pill {
    background: color-mix(
      in srgb,
      var(--color-surface-raised, #ffffff) 72%,
      transparent
    );
    -webkit-backdrop-filter: blur(12px) saturate(1.4);
    backdrop-filter: blur(12px) saturate(1.4);
  }
}

/* =============================================================================
   STATE LAYERS — two-layer crossfade. The active layer is in flow (it sizes
   the pill; the size SNAPS — never tweens); inactive layers are pre-rendered,
   absolute, faded + slightly scaled, and inert.
   ============================================================================= */
.playhead-layer {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 1;
  transform: scale(1);
}

.playhead-layer:not(.is-active) {
  position: absolute;
  inset: 4px;
  justify-content: center;
  overflow: hidden;
  opacity: 0;
  transform: scale(0.92);
  pointer-events: none;
}

.playhead.is-settled .playhead-layer {
  transition: opacity var(--nle-motion-morph, 260ms)
      var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1)),
    transform var(--nle-motion-morph, 260ms)
      var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1));
}

/* --- Ambient: slim save-dot + word-count lozenge --------------------------- */
.layer-ambient {
  gap: 8px;
  padding: 3px 12px;
  min-height: 24px;
}

.playhead-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--color-success, #10b981);
}

.playhead-dot.is-saving {
  background: var(--toolbar-accent, var(--color-primary, #3b82f6));
  animation: playhead-pulse 1.1s var(--ease-in-out, ease-in-out) infinite;
}

@keyframes playhead-pulse {
  50% {
    opacity: 0.35;
  }
}

.playhead-count {
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--toolbar-text-secondary, var(--color-text-secondary, #6b7280));
}

/* Visually-hidden save-state text for screen readers. */
.playhead-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* --- Shared controls: ghost buttons, 36px targets, radius-full ------------- */
.playhead-btn,
.playhead-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 36px;
  min-height: 36px;
  padding: 0 8px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--toolbar-text-secondary, var(--color-text-secondary, #6b7280));
  font-size: 14px;
  cursor: pointer;
  transition: background-color var(--nle-motion-quick, 120ms)
      var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1)),
    color var(--nle-motion-quick, 120ms)
      var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1));
}

.playhead-btn:hover:not(:disabled),
.playhead-trigger:hover:not(:disabled),
.playhead-trigger.is-open {
  background-color: var(--toolbar-hover, rgba(0, 0, 0, 0.05));
  color: var(--toolbar-text, var(--color-text, #1f2937));
}

.playhead-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.playhead-btn:focus-visible,
.playhead-trigger:focus-visible {
  outline: 2px solid var(--toolbar-accent, var(--color-primary, #3b82f6));
  outline-offset: 2px;
}

/* Active formatting: accent INK + the masthead's 2px underline mark (the
   background-image bar, so background-color stays free for hover). */
.playhead-btn.active {
  color: var(--toolbar-accent, var(--color-primary, #3b82f6));
  background-image: linear-gradient(
    var(--toolbar-accent, var(--color-primary, #3b82f6)),
    var(--toolbar-accent, var(--color-primary, #3b82f6))
  );
  background-repeat: no-repeat;
  background-size: 60% 2px;
  background-position: center calc(100% - 4px);
}

.playhead-btn.active:hover:not(:disabled) {
  color: var(--toolbar-accent, var(--color-primary, #3b82f6));
}

.playhead-btn-icon,
.playhead-btn-icon :deep(svg) {
  display: inline-flex;
  line-height: 1;
}

.playhead-btn-label {
  white-space: nowrap;
}

/* Format trigger — the masthead's serif nameplate grammar. */
.playhead-trigger-format {
  padding: 0 11px;
}

.playhead-format-label {
  font-family: var(--nle-font-serif, Georgia, serif);
  font-size: 14px;
  font-weight: 400;
  letter-spacing: normal;
  white-space: nowrap;
  color: var(--toolbar-text, var(--color-text, #1f2937));
}

.playhead-arrow {
  font-size: 9px;
  opacity: 0.5;
  transition: transform var(--nle-motion-quick, 120ms)
    var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1));
}

.playhead-trigger.is-open .playhead-arrow {
  transform: rotate(180deg);
}

/* Hairline separators between control families. */
.playhead-sep {
  width: 1px;
  height: 18px;
  margin: 0 4px;
  flex-shrink: 0;
  background: var(--color-divider, #e5e7eb);
}

/* =============================================================================
   MENUS — standard dropdown surfaces (NOT glass; the pill is the one glass
   surface). Same material conventions as ToolbarDropdown's .dropdown-menu.
   ============================================================================= */
.playhead-menu-wrap {
  position: relative;
  display: inline-flex;
}

.playhead-menu {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 200px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px 0;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-divider, #e5e7eb);
  border-radius: var(--radius-lg, 8px);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
  z-index: var(--z-index-dropdown, 1000);
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

.dropdown-item:hover {
  background: var(--toolbar-hover, #f5f5f5);
}

.dropdown-item.active {
  background: var(--toolbar-hover, #e8f0fe);
  color: var(--toolbar-accent, #4285f4);
  font-weight: 500;
}

.item-icon {
  width: 20px;
  flex-shrink: 0;
  display: inline-flex;
  justify-content: center;
}

.item-label {
  flex: 1;
  white-space: nowrap;
}

.item-shortcut {
  font-size: 12px;
  opacity: 0.6;
  margin-left: auto;
  flex-shrink: 0;
}

.dropdown-divider {
  height: 1px;
  background: var(--color-divider, #e5e7eb);
  margin: 4px 0;
}

/* Menu enter/exit — enter decelerates in, exit accelerates away and is
   faster (motion tokens; see tokens.css). Base transform is the centering
   translateX, so the motion delta is translateY only. */
.playhead-menu-enter-active {
  transition: opacity var(--nle-motion-enter, 180ms)
      var(--nle-ease-out, cubic-bezier(0.05, 0.7, 0.1, 1)),
    transform var(--nle-motion-enter, 180ms)
      var(--nle-ease-out, cubic-bezier(0.05, 0.7, 0.1, 1));
}

.playhead-menu-leave-active {
  transition: opacity var(--nle-motion-exit, 140ms)
      var(--nle-ease-in, cubic-bezier(0.3, 0, 0.8, 0.15)),
    transform var(--nle-motion-exit, 140ms)
      var(--nle-ease-in, cubic-bezier(0.3, 0, 0.8, 0.15));
}

.playhead-menu-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

.playhead-menu-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

/* =============================================================================
   REDUCED MOTION — durations already collapse via the motion tokens; the
   infinite dot pulse is the one animation tokens can't reach.
   ============================================================================= */
@media (prefers-reduced-motion: reduce) {
  .playhead-dot.is-saving {
    animation: none;
    opacity: 0.6;
  }
}
</style>
