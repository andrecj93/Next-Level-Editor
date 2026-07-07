<template>
  <nav
    :class="['editor-toolbar-modern', { 'is-compact': toolbarLayout === 'compact' }]"
    role="toolbar"
    aria-label="Text formatting toolbar"
  >
    <!-- Text Formatting Group -->
    <div
      class="toolbar-section-group"
      role="group"
      aria-label="Text formatting"
    >
      <!-- Format Dropdown -->
      <ToolbarSection
        type="dropdown"
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

      <!-- Alignment Dropdown -->
      <ToolbarSection
        type="dropdown"
        :visible="isToolbarSectionVisible('alignment')"
        label="Align"
        icon="<svg width=&quot;18&quot; height=&quot;18&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;><line x1=&quot;21&quot; x2=&quot;3&quot; y1=&quot;6&quot; y2=&quot;6&quot;/><line x1=&quot;15&quot; x2=&quot;3&quot; y1=&quot;12&quot; y2=&quot;12&quot;/><line x1=&quot;17&quot; x2=&quot;3&quot; y1=&quot;18&quot; y2=&quot;18&quot;/></svg>"
        tooltip="Text alignment"
        :items="alignmentDropdownItems"
        @remember-selection="$emit('remember-selection')"
      />

      <!-- Lists (Inline Buttons) -->
      <ToolbarSection
        type="buttons"
        :visible="isToolbarSectionVisible('lists')"
        :items="listActions"
        @remember-selection="$emit('remember-selection')"
      />
    </div>

    <!-- Insert & Style Group -->
    <div
      class="toolbar-section-group"
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
                  :class="{ active: sameColor(textColor, c) }"
                  :style="{ background: c }"
                  :aria-label="`Text color ${c}`"
                  :title="c"
                  @mousedown.prevent="$emit('remember-selection')"
                  @click="$emit('text-color-change', c)"
                />
              </div>
              <div class="colors-custom-row">
                <ColorPicker
                  :model-value="textColor"
                  label="Text Color"
                  icon="+"
                  @update:model-value="$emit('text-color-change', $event)"
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
                  :class="{
                    active: !backgroundColor || backgroundColor === 'transparent',
                  }"
                  aria-label="No highlight"
                  title="None"
                  @mousedown.prevent="$emit('remember-selection')"
                  @click="$emit('background-color-change', 'transparent')"
                />
                <button
                  v-for="c in highlightColorPresets"
                  :key="c"
                  type="button"
                  class="colors-swatch"
                  :class="{ active: sameColor(backgroundColor, c) }"
                  :style="{ background: c }"
                  :aria-label="`Highlight ${c}`"
                  :title="c"
                  @mousedown.prevent="$emit('remember-selection')"
                  @click="$emit('background-color-change', c)"
                />
              </div>
              <div class="colors-custom-row">
                <ColorPicker
                  :model-value="backgroundColor"
                  label="Highlight"
                  icon="+"
                  @update:model-value="$emit('background-color-change', $event)"
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
      class="toolbar-section-group"
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
      class="toolbar-section-group"
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

      <!-- Compact overflow — the rarely-used tools in one calm menu -->
      <ToolbarSection
        v-if="toolbarLayout === 'compact'"
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
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
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
  { mode: "preview" as const, label: "Preview", paths: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>' },
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

/** Case-insensitive hex compare so an active preset is highlighted. */
const sameColor = (a: string | undefined, b: string): boolean =>
  !!a && a.toLowerCase() === b.toLowerCase();
</script>
