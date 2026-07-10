<template>
  <nav
    ref="rootEl"
    :class="[
      'editor-toolbar-modern',
      {
        'is-compact': toolbarLayout === 'compact',
        'is-mini': isMini,
        'is-unfolding': isUnfolding,
        'is-folding': isFolding,
        'is-sweeping': isSweeping,
        'is-elevated': isElevated,
      },
    ]"
    role="toolbar"
    aria-label="Text formatting toolbar"
  >
    <!-- Light-sweep overlay — its OWN clipped layer (the toolbar must keep
         overflow: visible for dropdowns/tooltips, so the band can't be masked
         by the nav itself). Inert and invisible except during the one-shot
         .is-unfolding / .is-sweeping classes; beneath the buttons. -->
    <div class="toolbar-sweep-clip" aria-hidden="true">
      <div class="toolbar-sweep" />
    </div>

    <!-- Text Formatting Group -->
    <div
      class="toolbar-section-group"
      role="group"
      aria-label="Text formatting"
    >
      <!-- Format Dropdown — .format-dropdown scopes the masthead's serif
           trigger label (the class falls through ToolbarSection onto
           ToolbarDropdown's root). The trigger shows the ACTIVE block format
           name (default displayLabel behavior, no preserve-label). -->
      <ToolbarSection
        type="dropdown"
        class="format-dropdown"
        :visible="isToolbarSectionVisible('format')"
        label="Format"
        icon="<svg width=&quot;18&quot; height=&quot;18&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;><polyline points=&quot;4 7 4 4 20 4 20 7&quot;/><line x1=&quot;9&quot; x2=&quot;15&quot; y1=&quot;20&quot; y2=&quot;20&quot;/><line x1=&quot;12&quot; x2=&quot;12&quot; y1=&quot;4&quot; y2=&quot;20&quot;/></svg>"
        tooltip="Paragraph format"
        :items="formatDropdownItems"
        @remember-selection="$emit('remember-selection')"
      />

      <!-- Text Formatting (Inline Buttons) -->
      <ToolbarSection
        type="buttons"
        :visible="isToolbarSectionVisible('textFormatting')"
        :items="inlineFormatActions"
        @remember-selection="$emit('remember-selection')"
      />

      <!-- Alignment Dropdown (folded into the expand set in mini mode) -->
      <ToolbarSection
        v-show="!isMini"
        class="nle-unfold"
        :style="{ '--nle-group-i': 0 }"
        type="dropdown"
        :visible="isToolbarSectionVisible('alignment')"
        label="Align"
        icon="<svg width=&quot;18&quot; height=&quot;18&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;><line x1=&quot;21&quot; x2=&quot;3&quot; y1=&quot;6&quot; y2=&quot;6&quot;/><line x1=&quot;15&quot; x2=&quot;3&quot; y1=&quot;12&quot; y2=&quot;12&quot;/><line x1=&quot;17&quot; x2=&quot;3&quot; y1=&quot;18&quot; y2=&quot;18&quot;/></svg>"
        tooltip="Text alignment"
        :items="alignmentDropdownItems"
        @remember-selection="$emit('remember-selection')"
      />

      <!-- Lists (Inline Buttons) — trimmed to the two list toggles in mini -->
      <ToolbarSection
        type="buttons"
        :visible="isToolbarSectionVisible('lists')"
        :items="miniListActions"
        @remember-selection="$emit('remember-selection')"
      />
    </div>

    <!-- Non-essential families. The wrapper is layout-inert (display:
         contents) in the horizontal bars, so their flex layout is untouched;
         in the left-rail position (.nle-toolbar-shell[data-position="left"])
         it becomes the floating vertical panel that opens to the right of the
         rail — see the position-variant styles in NextLevelEditor.css. -->
    <div class="nle-toolbar-panel">
    <!-- Insert & Style Group -->
    <div
      v-show="!isMini"
      class="toolbar-section-group nle-unfold"
      :style="{ '--nle-group-i': 1 }"
      role="group"
      aria-label="Insert and styling"
    >
      <!-- Insert Dropdown -->
      <ToolbarSection
        type="dropdown"
        :visible="isToolbarSectionVisible('insert')"
        label="Insert"
        icon="<svg width=&quot;18&quot; height=&quot;18&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;><path d=&quot;M5 12h14&quot;/><path d=&quot;M12 5v14&quot;/></svg>"
        tooltip="Insert content"
        :items="insertDropdownItems"
        @remember-selection="$emit('remember-selection')"
      />

      <div class="toolbar-divider" />

      <!-- Colors Dropdown -->
      <div class="toolbar-dropdown">
        <button
          class="dropdown-trigger"
          :class="{ open: showColorsDropdown }"
          data-tooltip="Text & background colors"
          aria-label="Colors menu"
          aria-haspopup="true"
          :aria-expanded="showColorsDropdown"
          @mousedown.prevent="$emit('remember-selection')"
          @click.stop="$emit('toggle-colors-dropdown')"
        >
          <span class="dropdown-icon"
            ><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3s6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 6-10 6-10Z" /><path d="M5 21h14" /></svg></span>
          <span class="dropdown-label">Colors</span>
          <span class="dropdown-arrow" aria-hidden="true">▼</span>
        </button>
        <transition name="dropdown-fade">
          <div
            v-if="showColorsDropdown"
            class="dropdown-menu colors-menu"
            role="menu"
            @click.stop
          >
            <!-- Text color -->
            <div class="colors-section">
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
              <div class="colors-custom-row">
                <ColorPicker
                  :model-value="textColor"
                  label="Text Color"
                  icon="+"
                  @update:model-value="pickTextColor($event)"
                />
                <span class="colors-custom-label">Custom…</span>
              </div>
            </div>

            <!-- Highlight -->
            <div class="colors-section">
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
              <div class="colors-custom-row">
                <ColorPicker
                  :model-value="backgroundColor"
                  label="Highlight"
                  icon="+"
                  @update:model-value="pickHighlightColor($event)"
                />
                <span class="colors-custom-label">Custom…</span>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- Font Size Dropdown -->
      <ToolbarSection
        type="dropdown"
        label="Size"
        icon="<svg width=&quot;18&quot; height=&quot;18&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;><path d=&quot;M21 14h-5&quot;/><path d=&quot;M16 16v-3.5a2.5 2.5 0 0 1 5 0V16&quot;/><path d=&quot;M4.5 13h6&quot;/><path d=&quot;m3 16 4.5-9 4.5 9&quot;/></svg>"
        tooltip="Font size"
        :items="fontSizeDropdownItems"
        @remember-selection="$emit('remember-selection')"
      />
    </div>

    <!-- History & Tools Group -->
    <div
      v-show="!isMini"
      class="toolbar-section-group nle-unfold"
      :style="{ '--nle-group-i': 2 }"
      role="group"
      aria-label="History and tools"
    >
      <div class="toolbar-divider" />

      <!-- History Controls (Undo/Redo) -->
      <div class="toolbar-group" role="group" aria-label="Undo and redo">
        <button
          class="toolbar-btn-modern"
          data-tooltip="Undo (Ctrl+Z)"
          aria-label="Undo"
          :disabled="historyIndex <= 0"
          @click="$emit('undo')"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <button
          class="toolbar-btn-modern"
          data-tooltip="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
          :disabled="historyIndex >= historyLength - 1"
          @click="$emit('redo')"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>

      <!-- Tools Dropdown (menu of stateful actions — keep the static label) -->
      <ToolbarSection
        type="dropdown"
        label="Tools"
        preserve-label
        icon="<svg width=&quot;18&quot; height=&quot;18&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;><line x1=&quot;4&quot; x2=&quot;4&quot; y1=&quot;21&quot; y2=&quot;14&quot;/><line x1=&quot;4&quot; x2=&quot;4&quot; y1=&quot;10&quot; y2=&quot;3&quot;/><line x1=&quot;12&quot; x2=&quot;12&quot; y1=&quot;21&quot; y2=&quot;12&quot;/><line x1=&quot;12&quot; x2=&quot;12&quot; y1=&quot;8&quot; y2=&quot;3&quot;/><line x1=&quot;20&quot; x2=&quot;20&quot; y1=&quot;21&quot; y2=&quot;16&quot;/><line x1=&quot;20&quot; x2=&quot;20&quot; y1=&quot;12&quot; y2=&quot;3&quot;/><line x1=&quot;2&quot; x2=&quot;6&quot; y1=&quot;14&quot; y2=&quot;14&quot;/><line x1=&quot;10&quot; x2=&quot;14&quot; y1=&quot;8&quot; y2=&quot;8&quot;/><line x1=&quot;18&quot; x2=&quot;22&quot; y1=&quot;16&quot; y2=&quot;16&quot;/></svg>"
        tooltip="Productivity tools"
        :items="productivityDropdownItems"
        @remember-selection="$emit('remember-selection')"
      />

      <!-- Tool Actions (Inline Buttons) — move into "⋯ More" in compact -->
      <ToolbarSection
        v-if="toolbarLayout !== 'compact'"
        type="buttons"
        :items="toolActions"
        @remember-selection="$emit('remember-selection')"
      />
    </div>

    <!-- View & Display Controls Group -->
    <div
      v-show="!isMini"
      class="toolbar-section-group nle-unfold"
      :style="{ '--nle-group-i': 3 }"
      role="group"
      aria-label="View and display controls"
    >
      <div class="toolbar-divider" />

      <!-- View Mode Toggle with Text Labels — moves into "⋯ More" in compact -->
      <div
        v-if="toolbarLayout !== 'compact'"
        class="view-mode-group"
        role="group"
        aria-label="View mode selection"
      >
        <button
          :class="[
            'view-mode-btn',
            'with-text',
            { active: viewMode === 'editor' },
          ]"
          data-tooltip="WYSIWYG Editor - Edit with visual formatting"
          aria-label="Editor view"
          :aria-pressed="viewMode === 'editor'"
          @click="$emit('view-mode-change', 'editor')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
          <span class="btn-label">Editor</span>
        </button>
        <button
          :class="[
            'view-mode-btn',
            'with-text',
            { active: viewMode === 'code' },
          ]"
          data-tooltip="HTML Source Code - Edit raw HTML"
          aria-label="Code view"
          :aria-pressed="viewMode === 'code'"
          @click="$emit('view-mode-change', 'code')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
          <span class="btn-label">Code</span>
        </button>
        <button
          :class="[
            'view-mode-btn',
            'with-text',
            { active: viewMode === 'split' },
          ]"
          data-tooltip="Split View - Editor and code side by side"
          aria-label="Split view"
          :aria-pressed="viewMode === 'split'"
          @click="$emit('view-mode-change', 'split')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" /></svg>
          <span class="btn-label">Split</span>
        </button>
        <button
          :class="[
            'view-mode-btn',
            'with-text',
            { active: viewMode === 'preview' },
          ]"
          data-tooltip="Preview - View final output without editing"
          aria-label="Preview view"
          :aria-pressed="viewMode === 'preview'"
          @click="$emit('view-mode-change', 'preview')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
          <span class="btn-label">Preview</span>
        </button>
      </div>

      <!-- Format HTML Button (visible in code/split view) -->
      <button
        v-if="viewMode === 'code' || viewMode === 'split'"
        class="toolbar-btn-modern"
        data-tooltip="Format HTML (pretty-print)"
        aria-label="Format HTML"
        @click="$emit('format-html')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" /><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" /></svg>
      </button>

      <!-- Export (hero): all formats collapsed into one clear menu -->
      <div class="toolbar-divider" />
      <div class="export-section">
        <ToolbarSection
          type="dropdown"
          label="Export"
          preserve-label
          icon="<svg width=&quot;18&quot; height=&quot;18&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;><path d=&quot;M12 15V3&quot;/><path d=&quot;m7 10 5 5 5-5&quot;/><path d=&quot;M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4&quot;/></svg>"
          tooltip="Export document"
          :items="exportDropdownItems"
          @remember-selection="$emit('remember-selection')"
        />
      </div>

      <!-- Compact overflow — the rarely-used tools (view modes, fullscreen,
           tool actions) in one calm menu once the mini bar is expanded. Hidden
           in the collapsed mini state; revealed with the rest by the expand
           toggle. -->
      <ToolbarSection
        v-if="toolbarLayout === 'compact'"
        v-show="!isMini"
        type="dropdown"
        label="More"
        preserve-label
        icon="<svg width=&quot;18&quot; height=&quot;18&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;currentColor&quot; stroke=&quot;none&quot;><circle cx=&quot;5&quot; cy=&quot;12&quot; r=&quot;1.6&quot;/><circle cx=&quot;12&quot; cy=&quot;12&quot; r=&quot;1.6&quot;/><circle cx=&quot;19&quot; cy=&quot;12&quot; r=&quot;1.6&quot;/></svg>"
        tooltip="More tools"
        :items="compactMoreItems"
        @remember-selection="$emit('remember-selection')"
      />

      <!-- Fullscreen Toggle — moves into "⋯ More" in compact -->
      <button
        v-if="toolbarLayout !== 'compact'"
        class="toolbar-btn-modern fullscreen-toggle"
        data-tooltip="Toggle fullscreen mode"
        aria-label="Toggle fullscreen mode"
        :aria-pressed="isFullScreen"
        @click="$emit('toggle-fullscreen')"
      >
        <svg v-if="!isFullScreen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
      </button>

      <!-- Theme Toggle -->
      <button
        class="toolbar-btn-modern theme-toggle"
        data-tooltip="Toggle theme"
        aria-label="Toggle dark/light theme"
        :aria-pressed="theme === 'dark'"
        @click="$emit('toggle-theme')"
      >
        <span v-if="theme === 'dark'"
          ><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg></span>
        <span v-else
          ><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg></span>
      </button>
    </div>
    </div>

    <!-- Mini-toolbar expand / collapse — compact layout only. Collapsed shows
         just the formatting essentials; this reveals the full toolbar on tap. -->
    <button
      v-if="toolbarLayout === 'compact'"
      type="button"
      class="toolbar-btn-modern toolbar-expand-toggle"
      :class="{ 'is-open': expanded }"
      :data-tooltip="expanded ? 'Show fewer tools' : 'Show all tools'"
      :aria-label="expanded ? 'Collapse toolbar' : 'Expand toolbar'"
      :aria-expanded="expanded"
      @click="toggleExpanded"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import type { ToolbarAction } from "../types/toolbar";
import type { ToolbarConfig } from "../composables/useSmartToolbar";
import ToolbarSection from "./ToolbarSection.vue";
import ColorPicker from "./ColorPicker.vue";

interface Props {
  isToolbarSectionVisible: (section: keyof ToolbarConfig) => boolean;
  formatDropdownItems: any[];
  inlineFormatActions: ToolbarAction[];
  alignmentDropdownItems: any[];
  listActions: ToolbarAction[];
  insertDropdownItems: any[];
  showColorsDropdown: boolean;
  textColor: string;
  backgroundColor: string;
  fontSizeDropdownItems: any[];
  historyIndex: number;
  historyLength: number;
  productivityDropdownItems: any[];
  toolActions: ToolbarAction[];
  exportDropdownItems: any[];
  viewMode: "editor" | "code" | "split" | "preview";
  theme: "light" | "dark";
  isFullScreen: boolean;
  toolbarLayout?: "comfortable" | "compact";
}

const props = defineProps<Props>();

/**
 * Mini toolbar (compact layout only): the bar starts as a tight essentials-only
 * row — paragraph format, bold/italic/underline/strike, alignment and lists —
 * with an expand toggle. Everything else (insert, colours, tools, the "⋯ More"
 * overflow, export) stays one tap away but out of the way, so the writing
 * surface wins. Comfortable layout ignores this entirely.
 */
const expanded = ref(false);
const isMini = computed(() => props.toolbarLayout === "compact" && !expanded.value);

/**
 * "Title sequence" staging — one-shot choreography classes for toolbar STATE
 * CHANGES only, never mount:
 *   - `is-unfolding`: staggered left→right reveal of the hidden families plus
 *     the light sweep, when the mini bar expands.
 *   - `is-folding`: the fast, stagger-free settle when it collapses (exits are
 *     quicker than entries — a slow collapse punishes whoever wants chrome
 *     gone).
 *   - `is-sweeping`: the light sweep alone, when the density (toolbarLayout)
 *     changes.
 * All three are set exclusively from the toggle handler / layout watcher, so
 * nothing can ever animate on initial mount — even when starting expanded.
 */
const isUnfolding = ref(false);
const isFolding = ref(false);
const isSweeping = ref(false);
// Covers the longest stagger (60ms) + enter duration with margin.
const UNFOLD_MS = 400;
const FOLD_MS = 200;
const SWEEP_MS = 450;
let unfoldTimer: ReturnType<typeof setTimeout> | undefined;
let foldTimer: ReturnType<typeof setTimeout> | undefined;
let sweepTimer: ReturnType<typeof setTimeout> | undefined;

const toggleExpanded = () => {
  expanded.value = !expanded.value;
  clearTimeout(unfoldTimer);
  clearTimeout(foldTimer);
  if (expanded.value) {
    isFolding.value = false;
    isUnfolding.value = true;
    unfoldTimer = setTimeout(() => {
      isUnfolding.value = false;
    }, UNFOLD_MS);
  } else {
    isUnfolding.value = false;
    isFolding.value = true;
    foldTimer = setTimeout(() => {
      isFolding.value = false;
    }, FOLD_MS);
  }
};

// Switching layouts (e.g. the playground toggle) always re-collapses, and the
// density change itself gets the one-shot light sweep (sweep only, no stagger).
watch(
  () => props.toolbarLayout,
  () => {
    expanded.value = false;
    clearTimeout(unfoldTimer);
    isUnfolding.value = false;
    clearTimeout(sweepTimer);
    isSweeping.value = true;
    sweepTimer = setTimeout(() => {
      isSweeping.value = false;
    }, SWEEP_MS);
  }
);

/**
 * Elevation on scroll — when document content moves beneath the sticky bar,
 * the hairline bottom border yields to a soft shadow (`is-elevated`). The
 * toolbar has no ref to the scroll container, so a document-level capture
 * listener (scroll doesn't bubble) watches for any scroll, then a
 * rAF-throttled read of the owning editor's `.editor-content` decides the
 * state. The class only toggles on real scroll events — never at mount.
 */
const rootEl = ref<HTMLElement | null>(null);
const isElevated = ref(false);
let elevationRaf = 0;

const updateElevation = () => {
  elevationRaf = 0;
  const content = rootEl.value
    ?.closest(".next-level-editor")
    ?.querySelector(".editor-content");
  isElevated.value = !!content && content.scrollTop > 0;
};

const onAnyScroll = () => {
  if (elevationRaf) return;
  elevationRaf = requestAnimationFrame(updateElevation);
};

onMounted(() => {
  document.addEventListener("scroll", onAnyScroll, {
    capture: true,
    passive: true,
  });
});

// Mini = essentials only: keep just the two list toggles inline;
// indent/outdent live behind the expand toggle. The collapsed row is
// nowrap with visible overflow, so the full four-button list set pushed the
// `margin-left:auto` expand toggle past the edge on 320-360px phones —
// clipping the one affordance that reveals everything else.
const miniListActions = computed(() =>
  isMini.value
    ? props.listActions.filter(
        (a) => a.id === "bullet-list" || a.id === "numbered-list"
      )
    : props.listActions
);

const emit = defineEmits<{
  "remember-selection": [];
  "toggle-colors-dropdown": [];
  "text-color-change": [color: string];
  "background-color-change": [color: string];
  undo: [];
  redo: [];
  "view-mode-change": [mode: "editor" | "code" | "split" | "preview"];
  "format-html": [];
  "toggle-theme": [];
  "toggle-fullscreen": [];
}>();

/**
 * Compact overflow ("⋯ More"): the rarely-used tools that stay inline in the
 * comfortable layout — the view-mode switch, View-HTML, Find and Fullscreen —
 * collapse into a single menu so the compact bar reads as core writing tools.
 */
const svgIcon = (paths: string): string =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const VIEW_MODES = [
  { mode: "editor" as const, label: "Editor view", paths: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
  { mode: "code" as const, label: "Code view", paths: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>' },
  { mode: "split" as const, label: "Split view", paths: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>' },
  { mode: "preview" as const, label: "Preview view", paths: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>' },
];

const compactMoreItems = computed(() => [
  ...props.toolActions,
  { divider: true },
  ...VIEW_MODES.map((v) => ({
    id: `view-${v.mode}`,
    label: v.label,
    icon: svgIcon(v.paths),
    isActive: () => props.viewMode === v.mode,
    onClick: () => emit("view-mode-change", v.mode),
  })),
  { divider: true },
  {
    id: "fullscreen",
    label: props.isFullScreen ? "Exit fullscreen" : "Fullscreen",
    icon: svgIcon(
      props.isFullScreen
        ? '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>'
        : '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>'
    ),
    onClick: () => emit("toggle-fullscreen"),
  },
]);

// Curated quick-pick palettes for the Colors menu (custom picker still available).
const textColorPresets = [
  "#000000",
  "#374151",
  "#6b7280",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ffffff",
];
const highlightColorPresets = [
  "#fde047",
  "#fca5a5",
  "#fdba74",
  "#86efac",
  "#5eead4",
  "#93c5fd",
  "#c4b5fd",
  "#f9a8d4",
];

// --- Active swatch tracking --------------------------------------------------
// The textColor/backgroundColor props only carry the last custom-picked values
// (they are never written back when a color is applied), so the active swatch
// indicators derive from the actual selection instead: while the Colors menu is
// open we read the computed color / highlight at the selection anchor (scoped
// to the contenteditable root) and mark the matching preset.

const selectionTextColor = ref("");
const selectionHighlightColor = ref("");

const EDITABLE_SELECTOR =
  '[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]';

/** Fully transparent computed background values (i.e. "no highlight"). */
const isTransparent = (value: string): boolean => {
  const parsed = parseColor(value);
  return !parsed || parsed === "transparent";
};

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

  // background-color doesn't inherit, so walk up to the first non-transparent
  // ancestor. Stop before the editable root itself — the editor surface's own
  // background is not a text highlight.
  let highlight = "";
  let el: Element | null = start;
  while (el && el !== editableRoot) {
    const bg = window.getComputedStyle(el).backgroundColor;
    if (bg && !isTransparent(bg)) {
      highlight = bg;
      break;
    }
    el = el.parentElement;
  }
  selectionHighlightColor.value = highlight;
};

// Track the selection only while the menu is open (the swatches don't render
// otherwise). `immediate` covers a menu that is already open at mount.
watch(
  () => props.showColorsDropdown,
  (open) => {
    document.removeEventListener("selectionchange", readSelectionColors);
    if (open) {
      readSelectionColors();
      document.addEventListener("selectionchange", readSelectionColors);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  document.removeEventListener("selectionchange", readSelectionColors);
  document.removeEventListener("scroll", onAnyScroll, { capture: true });
  if (elevationRaf) cancelAnimationFrame(elevationRaf);
  clearTimeout(unfoldTimer);
  clearTimeout(foldTimer);
  clearTimeout(sweepTimer);
});

// The host applies the color synchronously during the emit (via the remembered
// selection), so re-reading on the next tick marks the freshly applied swatch
// even if no selectionchange fires.
const pickTextColor = (color: string) => {
  emit("text-color-change", color);
  nextTick(readSelectionColors);
};

const pickHighlightColor = (color: string) => {
  emit("background-color-change", color);
  nextTick(readSelectionColors);
};

const noHighlightActive = computed(() =>
  isTransparent(selectionHighlightColor.value)
);

/**
 * Normalize a CSS color to a comparable "r,g,b" key: presets are hex while
 * computed styles report rgb()/rgba(), so a plain string compare never matches.
 */
function parseColor(value: string | undefined | null): string {
  if (!value) return "";
  const v = value.trim().toLowerCase();
  if (v === "transparent") return "transparent";
  const hexMatch = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex.replace(/./g, (ch) => ch + ch);
    const num = parseInt(hex, 16);
    return `${(num >> 16) & 255},${(num >> 8) & 255},${num & 255}`;
  }
  const rgbMatch = v.match(
    /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/
  );
  if (rgbMatch) {
    const alpha = rgbMatch[4];
    if (alpha !== undefined && parseFloat(alpha) === 0) return "transparent";
    return `${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]}`;
  }
  // Named colors and anything else: compare the normalized string as-is.
  return v;
}

/** Whether a selection color matches a preset (hex vs rgb() tolerant). */
const sameColor = (a: string | undefined, b: string): boolean => {
  const parsed = parseColor(a);
  return !!parsed && parsed !== "transparent" && parsed === parseColor(b);
};
</script>
