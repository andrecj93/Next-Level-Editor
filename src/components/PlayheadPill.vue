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
          'is-traveling': traveling,
          'is-below': state === 'selection' && !!selectionPosition?.below,
        },
      ]"
      :style="rootStyle"
      :data-state="state"
      role="toolbar"
      aria-label="Editor toolbar"
      @mousedown.prevent
      @keydown="handleRovingKeydown"
      @focusin="handleFocusin"
    >
      <div class="playhead-pill">
        <!-- AMBIENT — slim lozenge: save-state dot + word count. The lozenge
             is a REAL button (focusable + clickable) so keyboard and pointer
             users can expand the receded chrome from the pill itself. -->
        <div
          class="playhead-layer layer-ambient"
          :class="{ 'is-active': state === 'ambient' }"
          v-bind="layerAttrs(state === 'ambient')"
        >
          <button
            type="button"
            class="playhead-ambient-btn"
            aria-label="Show toolbar"
            title="Show toolbar"
            @click="$emit('expand')"
            @focus="$emit('expand')"
          >
            <span
              class="playhead-dot"
              :class="{ 'is-saving': isSaving }"
              aria-hidden="true"
            />
            <span class="playhead-count">{{ wordCountLabel }}</span>
          </button>
          <span class="playhead-sr">{{
            isSaving ? "Saving…" : "All changes saved"
          }}</span>
        </div>

        <!-- HOME — the writing essentials: Format, inline set, lists, colors,
             "+", "⋯". Triggers here emit remember-selection on mousedown (the
             editor selection is about to be needed by a menu action). -->
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
                    :class="{ active: item.isActive?.(), disabled: isItemDisabled(item) }"
                    :disabled="isItemDisabled(item)"
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

          <!-- List toggles (bullet/numbered/indent…) — inline, right after
               the inline formatting set. -->
          <button
            v-for="action in listActions ?? []"
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

          <!-- Colors — same swatch-grid grammar as EditorToolbar's colors
               menu (colors-section / colors-swatches / colors-swatch). -->
          <div v-if="hasColors" class="playhead-menu-wrap">
            <button
              type="button"
              class="playhead-trigger playhead-trigger-icon"
              :class="{ 'is-open': openMenu === 'colors' }"
              aria-label="Colors"
              aria-haspopup="true"
              :aria-expanded="openMenu === 'colors'"
              title="Text &amp; background colors"
              @mousedown.prevent="$emit('remember-selection')"
              @click.stop="toggleMenu('colors')"
            >
              <span class="playhead-btn-icon" v-html="colorsIcon" />
            </button>
            <transition name="playhead-menu">
              <div
                v-if="openMenu === 'colors'"
                class="dropdown-menu playhead-menu playhead-colors-menu"
                role="menu"
                @click.stop
              >
                <div v-if="textColorPresets?.length" class="colors-section">
                  <div class="colors-section-label">Text color</div>
                  <div class="colors-swatches">
                    <button
                      v-for="c in textColorPresets"
                      :key="c"
                      type="button"
                      class="colors-swatch"
                      :class="{ active: sameColor(selectionTextColor, c) }"
                      :style="{ background: c }"
                      :aria-label="`Text color ${c}`"
                      :title="c"
                      @mousedown.prevent="$emit('remember-selection')"
                      @click="pickTextColor(c)"
                    />
                  </div>
                </div>
                <div v-if="highlightColorPresets?.length" class="colors-section">
                  <div class="colors-section-label">Highlight</div>
                  <div class="colors-swatches">
                    <button
                      type="button"
                      class="colors-swatch colors-swatch-none"
                      :class="{ active: noHighlightActive }"
                      aria-label="No highlight"
                      title="None"
                      @mousedown.prevent="$emit('remember-selection')"
                      @click="pickHighlightColor('transparent')"
                    />
                    <button
                      v-for="c in highlightColorPresets"
                      :key="c"
                      type="button"
                      class="colors-swatch"
                      :class="{ active: sameColor(selectionHighlightColor, c) }"
                      :style="{ background: c }"
                      :aria-label="`Highlight ${c}`"
                      :title="c"
                      @mousedown.prevent="$emit('remember-selection')"
                      @click="pickHighlightColor(c)"
                    />
                  </div>
                </div>
              </div>
            </transition>
          </div>

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
                    :class="{ active: item.isActive?.(), disabled: isItemDisabled(item) }"
                    :disabled="isItemDisabled(item)"
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

        <!-- SELECTION — the pill IS the bubble: inline formatting set.
             mousedown is prevented (focus preservation) but deliberately does
             NOT emit remember-selection: the selection is LIVE — there is
             nothing to remember, and host-side suppression flipping the state
             mid-press would kill the click (FloatingToolbar.vue's contract). -->
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
            @mousedown.prevent
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
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onUpdated,
  onBeforeUnmount,
} from "vue";
import type { ToolbarAction } from "../types/toolbar";
import { EDGE_MARGIN } from "../utils/floatingToolbarPosition";
import { sameColor, isTransparentColor } from "../utils/color";
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
 *  - Travel animates ONLY on a logical state change (state or the selection
 *    below-flip): a state watch arms `.is-traveling` for one morph duration.
 *    Geometry refreshes in the SAME state (the host re-measuring on scroll or
 *    resize) reposition instantly — the pill tracks scroll 1:1, no
 *    rubber-banding behind the document.
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
 *
 * Viewport containment (ambient/home): the anchor-derived x is clamped so the
 * ACTIVE layer's measured width stays inside the viewport (EDGE_MARGIN
 * gutter, same math as computeToolbarPosition), and y is clamped to
 * >= EDGE_MARGIN so an offscreen-top editor parks the pill at the viewport
 * top edge instead of leaving entirely. When anchorRect.bottom is provided
 * and the editor rect is fully above the viewport past a 24px grace
 * (bottom <= -24), targetPoint goes null and the existing v-if hides the
 * pill. Selection state is already clamped host-side.
 *
 * Keyboard: the ACTIVE layer's controls form a roving-tabindex composite
 * (APG toolbar pattern) — one Tab stop, ArrowLeft/ArrowRight move,
 * Home/End jump, the stop resets on state change. Open dropdown menus keep
 * their own keys (roving skips anything inside .playhead-menu).
 */

interface Props {
  /** Host-driven chrome state; the component never decides this itself. */
  state: PlayheadState;
  /**
   * Viewport rect of the editor root ({top,left,width[,bottom]} from
   * getBoundingClientRect). Ambient/home anchor: the pill centers over it,
   * 12px below the top edge — clamped into the viewport (see the containment
   * notes above). Host refreshes it on resize/scroll. Pass `bottom` so the
   * pill can hide once the editor is fully scrolled above the viewport.
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
  /**
   * Inline formatting set (the host's floating/inline actions — e.g.
   * B/I/U + link) — same objects EditorToolbar/FloatingToolbar use. Rendered
   * in BOTH the home and selection layers.
   */
  inlineActions: ToolbarAction[];
  /** Format dropdown items (host's formatDropdownItems). */
  formatItems: PlayheadMenuItem[];
  /** Insert "+" menu items (host's insertDropdownItems). */
  insertItems: PlayheadMenuItem[];
  /**
   * "⋯" overflow menu items. May contain divider entries ({divider: true},
   * rendered as hairlines) and active-state items (isActive), so the host
   * can pass sectioned content like view modes.
   */
  overflowItems: PlayheadMenuItem[];
  /**
   * Alignment items (host's alignmentDropdownItems). Rendered as the first
   * section of the "⋯" overflow, separated by a hairline.
   */
  alignmentItems?: PlayheadMenuItem[];
  /**
   * Font-size items (host's fontSizeDropdownItems). Rendered as the second
   * section of the "⋯" overflow, separated by a hairline.
   */
  sizeItems?: PlayheadMenuItem[];
  /**
   * List toggles (bullet/numbered/indent/outdent — host's listActions).
   * Rendered inline in the home layer after the inline formatting set.
   */
  listActions?: ToolbarAction[];
  /** Text-color swatches for the Colors menu (host's textColorPresets). */
  textColorPresets?: string[];
  /** Highlight swatches for the Colors menu (host's highlightColorPresets). */
  highlightColorPresets?: string[];
  /** Currently applied text color — drives the active swatch ring. */
  textColor?: string;
  /** Currently applied highlight color — drives the active swatch ring. */
  backgroundColor?: string;
  /**
   * Theme passthrough for the teleported root (e.g. "theme-dark
   * nle-theme-warm") — teleporting to <body> escapes the editor's theme scope,
   * same convention as ModalsContainer.
   */
  theme?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  /**
   * Emitted on HOME-layer trigger/button mousedown (which is prevented) so
   * the host can save the editor selection before a menu action needs it —
   * the same contract as EditorToolbar/ToolbarDropdown. The SELECTION layer
   * deliberately does NOT emit this: its selection is live, and host-side
   * suppression must never flip the pill state mid-press.
   */
  "remember-selection": [];
  /**
   * The ambient lozenge was clicked or keyboard-focused — the host should
   * restore the chrome (receded = false), expanding the pill to home.
   */
  expand: [];
  /** A text-color swatch was picked (hex or css color string). */
  "text-color-change": [color: string];
  /** A highlight swatch was picked ("transparent" clears the highlight). */
  "background-color-change": [color: string];
}>();

/** Ambient/home vertical offset below the editor's top edge. */
const ANCHOR_TOP_OFFSET = 12;
/**
 * Grace past "editor fully above the viewport" before the pill hides:
 * with anchorRect.bottom provided, the pill parks at the viewport top edge
 * while bottom > -ANCHOR_EXIT_GRACE and hides (targetPoint = null) once the
 * editor has scrolled ANCHOR_EXIT_GRACE px past fully-offscreen.
 */
const ANCHOR_EXIT_GRACE = 24;

// --- Positioning: everything through transform ------------------------------

const rootEl = ref<HTMLElement | null>(null);

/**
 * Measured pill width (the ACTIVE layer sizes it) for the ambient/home x
 * clamp. Kept fresh by a ResizeObserver (state morphs resize the pill) with
 * a nextTick fallback on state change for environments without RO.
 */
const pillWidth = ref(0);

const measurePill = () => {
  pillWidth.value = rootEl.value?.offsetWidth ?? 0;
};

/**
 * Clamp the pill CENTER so its real edges stay inside the viewport with an
 * EDGE_MARGIN gutter — the same math computeToolbarPosition applies to the
 * selection state. window.innerWidth is read non-reactively: the host
 * refreshes anchorRect on every resize/scroll, which recomputes this.
 */
const clampAnchorX = (center: number): number => {
  const viewportWidth = window.innerWidth;
  const width = pillWidth.value;
  if (width + EDGE_MARGIN * 2 >= viewportWidth) return viewportWidth / 2;
  const half = width / 2;
  return Math.min(
    Math.max(center, half + EDGE_MARGIN),
    viewportWidth - half - EDGE_MARGIN
  );
};

const targetPoint = computed<{ x: number; y: number } | null>(() => {
  if (props.state === "selection" && props.selectionPosition) {
    return { x: props.selectionPosition.left, y: props.selectionPosition.top };
  }
  if (props.anchorRect) {
    // Editor fully above the viewport (plus grace): no chrome to anchor to.
    if (
      props.anchorRect.bottom !== undefined &&
      props.anchorRect.bottom <= -ANCHOR_EXIT_GRACE
    ) {
      return null;
    }
    return {
      x: clampAnchorX(props.anchorRect.left + props.anchorRect.width / 2),
      // Park at the viewport top edge instead of following the editor top
      // offscreen — mid-document writers keep their chrome.
      y: Math.max(props.anchorRect.top + ANCHOR_TOP_OFFSET, EDGE_MARGIN),
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

// --- Travel vs scroll tracking -----------------------------------------------

/**
 * The transform transition applies ONLY while `.is-traveling` — armed by a
 * LOGICAL target change (state, or the selection below-flip) for one morph
 * duration. Host-driven geometry refreshes in the same state (scroll/resize
 * following) change the transform withOUT the class, so they apply
 * instantly: no 260ms rubber-band lag behind the document. The host needs
 * no extra wiring — it just keeps refreshing geometry as it already does.
 */
const traveling = ref(false);
let travelTimer: ReturnType<typeof setTimeout> | undefined;
/** Slightly longer than --nle-motion-morph (260ms) so the ease completes. */
const TRAVEL_FALLBACK_MS = 360;

watch(
  [
    () => props.state,
    () => props.state === "selection" && !!props.selectionPosition?.below,
  ],
  () => {
    if (!settled.value) return;
    traveling.value = true;
    clearTimeout(travelTimer);
    travelTimer = setTimeout(() => {
      traveling.value = false;
    }, TRAVEL_FALLBACK_MS);
  }
);

// --- Layer a11y: inactive layers are invisible AND unreachable --------------

/**
 * Inactive layers stay pre-rendered (the crossfade needs both sides in the
 * DOM) but must not be readable or tabbable. `inert` blocks focus in modern
 * browsers; aria-hidden + pointer-events (CSS) cover the rest. The ACTIVE
 * layer carries neither — its controls (including the ambient lozenge
 * button) are real, focusable affordances.
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

// --- Menus (Format / colors / insert / overflow) -----------------------------

type MenuId = "format" | "colors" | "insert" | "overflow";

const openMenu = ref<MenuId | null>(null);

const svgIcon = (paths: string): string =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const colorsIcon = svgIcon(
  '<path d="M12 3s6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 6-10 6-10Z"/><path d="M5 21h14"/>'
);

/**
 * The "⋯" overflow supports SECTIONS: alignment and font-size items are
 * folded in ahead of the host's overflow items, separated by hairline
 * dividers (the same divider rendering the menus already have).
 */
const overflowMenuItems = computed<PlayheadMenuItem[]>(() => {
  const sections: PlayheadMenuItem[][] = [];
  if (props.alignmentItems?.length) sections.push(props.alignmentItems);
  if (props.sizeItems?.length) sections.push(props.sizeItems);
  if (props.overflowItems.length) sections.push(props.overflowItems);
  return sections.reduce<PlayheadMenuItem[]>(
    (acc, section, index) =>
      index === 0 ? [...section] : [...acc, { divider: true }, ...section],
    []
  );
});

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
    items: overflowMenuItems.value,
  },
]);

const toggleMenu = (id: MenuId) => {
  openMenu.value = openMenu.value === id ? null : id;
};

/** An item is disabled via a static `disabled` flag or an `isDisabled()` predicate. */
const isItemDisabled = (item: PlayheadMenuItem): boolean =>
  Boolean(item.disabled || item.isDisabled?.());

const handleItemClick = (item: PlayheadMenuItem) => {
  if (isItemDisabled(item)) return;
  item.onClick?.();
  openMenu.value = null;
};

// --- Colors ------------------------------------------------------------------

const hasColors = computed(
  () =>
    (props.textColorPresets?.length ?? 0) > 0 ||
    (props.highlightColorPresets?.length ?? 0) > 0
);

// Active swatch tracking. The textColor/backgroundColor props only carry the
// last CUSTOM-picked value, so — like EditorToolbar — the active swatch derives
// from the LIVE selection instead: while the colors menu is open we read the
// computed color/highlight at the selection anchor and mark the matching preset
// (hex-vs-rgb tolerant via utils/color). Reading props here left the ring stuck
// on the last applied color as the caret moved.
const selectionTextColor = ref("");
const selectionHighlightColor = ref("");

const EDITABLE_SELECTOR =
  '[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]';

const readSelectionColors = () => {
  const selection = window.getSelection?.();
  const node = selection?.anchorNode ?? null;
  const start: Element | null =
    node instanceof Element ? node : node?.parentElement ?? null;
  const editableRoot = start?.closest(EDITABLE_SELECTOR) ?? null;
  if (!start || !editableRoot) {
    selectionTextColor.value = "";
    selectionHighlightColor.value = "";
    return;
  }
  selectionTextColor.value = window.getComputedStyle(start).color || "";
  // background-color doesn't inherit — walk up to the first non-transparent
  // ancestor, stopping before the editable root (its surface isn't a highlight).
  let highlight = "";
  let el: Element | null = start;
  while (el && el !== editableRoot) {
    const bg = window.getComputedStyle(el).backgroundColor;
    if (bg && !isTransparentColor(bg)) {
      highlight = bg;
      break;
    }
    el = el.parentElement;
  }
  selectionHighlightColor.value = highlight;
};

// Track the selection only while the colors menu is open (the swatches don't
// render otherwise).
watch(
  () => openMenu.value === "colors",
  (open) => {
    document.removeEventListener("selectionchange", readSelectionColors);
    if (open) {
      readSelectionColors();
      document.addEventListener("selectionchange", readSelectionColors);
    }
  }
);

const noHighlightActive = computed(() =>
  isTransparentColor(selectionHighlightColor.value)
);

const pickTextColor = (color: string) => {
  emit("text-color-change", color);
  openMenu.value = null;
};

const pickHighlightColor = (color: string) => {
  emit("background-color-change", color);
  openMenu.value = null;
};

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

// --- Roving tabindex (APG toolbar pattern) -----------------------------------

const rovingIndex = ref(0);

/** The ACTIVE layer's toolbar-level controls (open menus own their keys). */
const rovingControls = (): HTMLButtonElement[] => {
  const activeLayer = rootEl.value?.querySelector<HTMLElement>(
    ".playhead-layer.is-active"
  );
  if (!activeLayer) return [];
  return Array.from(
    activeLayer.querySelectorAll<HTMLButtonElement>("button")
  ).filter((button) => !button.disabled && !button.closest(".playhead-menu"));
};

/**
 * One Tab stop for the whole pill: the roving control gets tabindex 0,
 * every other button (including inert layers, belt-and-braces) gets -1.
 * Re-applied after every patch — the template deliberately does not bind
 * tabindex, so re-keyed v-for nodes are corrected here.
 */
function applyRoving() {
  const root = rootEl.value;
  if (!root) return;
  const controls = rovingControls();
  if (rovingIndex.value >= controls.length) {
    rovingIndex.value = Math.max(0, controls.length - 1);
  }
  const activeControl = controls[rovingIndex.value] ?? null;
  const all = Array.from(
    root.querySelectorAll<HTMLButtonElement>(".playhead-layer button")
  ).filter((button) => !button.closest(".playhead-menu"));
  for (const button of all) {
    button.tabIndex = button === activeControl ? 0 : -1;
  }
}

const handleRovingKeydown = (event: KeyboardEvent) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest(".playhead-menu")) return;
  const controls = rovingControls();
  if (!controls.length) return;
  const current = controls.indexOf(target as HTMLButtonElement);
  let next = current >= 0 ? current : rovingIndex.value;
  if (event.key === "ArrowRight") next = (next + 1) % controls.length;
  else if (event.key === "ArrowLeft")
    next = (next - 1 + controls.length) % controls.length;
  else if (event.key === "Home") next = 0;
  else next = controls.length - 1;
  event.preventDefault();
  rovingIndex.value = next;
  applyRoving();
  controls[next].focus();
};

/** Focus landing on a control (Tab, click) becomes the roving stop. */
const handleFocusin = (event: FocusEvent) => {
  const controls = rovingControls();
  const index = controls.indexOf(event.target as HTMLButtonElement);
  if (index >= 0 && index !== rovingIndex.value) {
    rovingIndex.value = index;
    applyRoving();
  }
};

// Leaving the state a menu lives in must not strand it open; the roving
// tab stop also resets to the new active layer's first control.
watch(
  () => props.state,
  () => {
    openMenu.value = null;
    rovingIndex.value = 0;
    nextTick(applyRoving);
  }
);

// --- Lifecycle ----------------------------------------------------------------

let pillResizeObserver: ResizeObserver | null = null;

// The root is v-if'd on targetPoint: (re)wire measurement + roving whenever
// the element (re)appears. flush: "post" — the DOM must exist.
watch(
  rootEl,
  (el) => {
    pillResizeObserver?.disconnect();
    if (el) {
      measurePill();
      pillResizeObserver?.observe(el);
      applyRoving();
    }
  },
  { flush: "post" }
);

// State morphs resize the pill; re-measure once the new layer is in flow
// (fallback for environments without ResizeObserver).
watch(
  () => props.state,
  () => {
    nextTick(measurePill);
  }
);

onMounted(() => {
  if (typeof ResizeObserver !== "undefined") {
    pillResizeObserver = new ResizeObserver(() => measurePill());
  }
  if (rootEl.value) {
    measurePill();
    pillResizeObserver?.observe(rootEl.value);
    applyRoving();
  }
  document.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("click", handleClickOutside);
});

// Items/disabled flips re-render buttons without tabindex bindings — keep
// the roving contract true after every patch (imperative, no reactive loop).
onUpdated(() => {
  applyRoving();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(settleFrame);
  clearTimeout(travelTimer);
  pillResizeObserver?.disconnect();
  document.removeEventListener("keydown", handleKeydown, true);
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("selectionchange", readSelectionColors);
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
  /* Stacking contract: dialogs 10050 > pill 10001 > panels/sidebars 10000 >
     fullscreen shell 9999 > FABs 9998. The pill is primary chrome — it must
     paint above panels, FABs and the fullscreen shell, and only modal
     overlays may cover it. */
  z-index: var(--nle-z-playhead, 10001);
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

/* Travel (anchor <-> selection) is a transform transition, armed only while
   `.is-traveling` — set by a LOGICAL state change for one morph duration.
   Scroll/resize geometry refreshes reposition WITHOUT the class, i.e.
   instantly: the pill must track the document 1:1, never rubber-band behind
   it. Duration token zeroes under prefers-reduced-motion (tokens.css), so
   travel degrades to an instant reposition + crossfade. */
.playhead.is-settled.is-traveling {
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

/* --- Ambient: slim save-dot + word-count lozenge — a REAL button ----------- */
.layer-ambient {
  min-height: 24px;
}

.playhead-ambient-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  padding: 3px 12px;
  border: none;
  border-radius: 999px;
  background: transparent;
  font: inherit;
  cursor: pointer;
}

/* Keep the lozenge visually slim but give the CONTROL a 36px effective
   target: an invisible hit-area extension (24px lozenge + 2×6px). */
.playhead-ambient-btn::before {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: 999px;
}

.playhead-ambient-btn:focus-visible {
  outline: 2px solid var(--toolbar-accent, var(--color-primary, #3b82f6));
  outline-offset: 2px;
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

/* --- Colors menu — the same swatch-grid grammar as EditorToolbar's, styled
   here because the pill teleports to <body> and must be self-sufficient. --- */
.playhead-colors-menu {
  min-width: 244px;
  padding: 12px;
}

.colors-section + .colors-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-divider, #e5e7eb);
}

.colors-section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--toolbar-text-secondary, var(--color-text-secondary, #6b7280));
  margin-bottom: 9px;
}

.colors-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.colors-swatch {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  padding: 0;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.14);
  cursor: pointer;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3);
  transition: transform var(--nle-motion-quick, 120ms)
      var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1)),
    box-shadow var(--nle-motion-quick, 120ms)
      var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1));
}

.playhead.theme-dark .colors-swatch {
  border-color: rgba(255, 255, 255, 0.18);
}

.colors-swatch:hover {
  transform: scale(1.16);
}

.colors-swatch.active {
  box-shadow: 0 0 0 2px var(--toolbar-accent, var(--color-primary, #3b82f6)),
    0 0 0 3px var(--color-surface-raised, #ffffff);
}

.colors-swatch-none {
  position: relative;
  background: var(--color-surface-raised, #ffffff);
}

.colors-swatch-none::after {
  content: "";
  position: absolute;
  inset: 2px;
  border-radius: 4px;
  background: linear-gradient(
    to top right,
    transparent 43%,
    #ef4444 43%,
    #ef4444 57%,
    transparent 57%
  );
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
   infinite dot pulse and the swatch hover-scale are the animations tokens
   can't reach.
   ============================================================================= */
@media (prefers-reduced-motion: reduce) {
  .playhead-dot.is-saving {
    animation: none;
    opacity: 0.6;
  }

  .colors-swatch:hover {
    transform: none;
  }
}
</style>
