<template>
  <div class="editor-toolbar-pro editor-toolbar-modern">
    <!-- Formatting Section -->
    <div class="toolbar-section">
      <div class="section-label">Format</div>
      <div class="section-content">
        <!-- Format Dropdown -->
        <ToolbarSection
          type="dropdown"
          :visible="isToolbarSectionVisible('format')"
          label="Style"
          icon='<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h12v1H2V9zm0 3h8v1H2v-1z"/></svg>'
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
          icon='<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v1H2V2zm0 3h12v1H2V5zm0 3h12v1H2V8zm0 3h12v1H2v-1z"/></svg>'
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
    </div>

    <div class="toolbar-separator" />

    <!-- Style Section -->
    <div class="toolbar-section">
      <div class="section-label">Style</div>
      <div class="section-content">
        <!-- Colors Dropdown -->
        <div class="toolbar-dropdown">
          <button
            class="dropdown-trigger-pro dropdown-trigger"
            :class="{ open: showColorsDropdown }"
            data-tooltip="Text & background colors"
            @mousedown.prevent="$emit('remember-selection')"
            @click.stop="$emit('toggle-colors-dropdown')"
          >
            <span class="dropdown-icon"
              ><svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path
                  d="M8 1l6 6-3 3-6-6 3-3zm-1 7l-5 5a1 1 0 0 0 0 1.5 1 1 0 0 0 1.5 0l5-5-1.5-1.5z"
                />
                <circle cx="13" cy="13" r="2" /></svg
            ></span>
            <span class="dropdown-label">Colors</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <transition name="dropdown-slide">
            <div
              v-if="showColorsDropdown"
              class="dropdown-menu-pro colors-menu"
              @click.stop
            >
              <div class="color-picker-wrapper">
                <ColorPicker
                  :model-value="textColor"
                  label="Text Color"
                  icon="A"
                  @update:model-value="$emit('text-color-change', $event)"
                />
              </div>
              <div class="color-picker-wrapper">
                <ColorPicker
                  :model-value="backgroundColor"
                  label="Highlight"
                  icon="◼"
                  @update:model-value="$emit('background-color-change', $event)"
                />
              </div>
            </div>
          </transition>
        </div>

        <!-- Font Size Dropdown -->
        <ToolbarSection
          type="dropdown"
          label="Size"
          icon='<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h6v2H6v8H4V4H2V2zm6 4h6v2h-2v6h-2V8h-2V6z"/></svg>'
          tooltip="Font size"
          :items="fontSizeDropdownItems"
          @remember-selection="$emit('remember-selection')"
        />
      </div>
    </div>

    <div class="toolbar-separator" />

    <!-- Insert Section -->
    <div class="toolbar-section">
      <div class="section-label">Insert</div>
      <div class="section-content">
        <!-- Insert Dropdown -->
        <ToolbarSection
          type="dropdown"
          :visible="isToolbarSectionVisible('insert')"
          label="Content"
          icon='<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3v5H3v1h5v5h1V9h5V8H9V3H8z"/></svg>'
          tooltip="Insert content"
          :items="insertDropdownItems"
          @remember-selection="$emit('remember-selection')"
        />

        <!-- Tools Dropdown -->
        <ToolbarSection
          type="dropdown"
          label="Tools"
          icon='<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 1h6v1H2v13h12V9h1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5zm8 0l5.5 5.5-1 1L12 6v4h-1V6L9.5 7.5l-1-1L14 1h-5z"/></svg>'
          tooltip="Productivity tools"
          :items="productivityDropdownItems"
          @remember-selection="$emit('remember-selection')"
        />

        <!-- Tool Actions (Inline Buttons) -->
        <ToolbarSection
          type="buttons"
          :items="toolActions"
          @remember-selection="$emit('remember-selection')"
        />
      </div>
    </div>

    <div class="toolbar-separator" />

    <!-- History Section -->
    <div class="toolbar-section">
      <div class="section-label">History</div>
      <div class="section-content">
        <div class="toolbar-group-pro toolbar-group">
          <button
            class="toolbar-btn-pro toolbar-btn-modern"
            data-tooltip="Undo (Ctrl+Z)"
            aria-label="Undo"
            :disabled="historyIndex <= 0"
            @click="$emit('undo')"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path
                d="M8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM3 8a5 5 0 0 1 8-4l-3 3h4V3l-1.5 1.5A6 6 0 1 0 14 8h-1a5 5 0 0 1-5 5"
              />
            </svg>
          </button>
          <button
            class="toolbar-btn-pro toolbar-btn-modern"
            data-tooltip="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
            :disabled="historyIndex >= historyLength - 1"
            @click="$emit('redo')"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path
                d="M8 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm5 5a5 5 0 0 0-8-4l3 3H4V3l1.5 1.5A6 6 0 1 1 2 8h1a5 5 0 0 0 5 5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="toolbar-flex-spacer" />

    <!-- View Controls Section -->
    <div class="toolbar-section toolbar-section-end">
      <div class="section-label">View</div>
      <div class="section-content">
        <!-- View Mode Toggle with Text Labels -->
        <div class="view-mode-group-pro view-mode-group">
          <button
            :class="[
              'view-mode-btn-pro',
              'view-mode-btn',
              'with-text',
              { active: viewMode === 'editor' },
            ]"
            data-tooltip="WYSIWYG Editor - Edit with visual formatting"
            aria-label="Editor view"
            @click="$emit('view-mode-change', 'editor')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path
                d="M12.146 1.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-4 2a.5.5 0 0 1-.65-.65l2-4a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zM12.5 5.207L10.207 2.914 3 10.121V11h.879l7.621-5.793z"
              />
            </svg>
            <span class="btn-label">Editor</span>
          </button>
          <button
            :class="[
              'view-mode-btn-pro',
              'view-mode-btn',
              'with-text',
              { active: viewMode === 'code' },
            ]"
            data-tooltip="HTML Source Code - Edit raw HTML"
            aria-label="Code view"
            @click="$emit('view-mode-change', 'code')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5 3l-3 5 3 5V3zm6 0v10l3-5-3-5z" />
            </svg>
            <span class="btn-label">Code</span>
          </button>
          <button
            :class="[
              'view-mode-btn-pro',
              'view-mode-btn',
              'with-text',
              { active: viewMode === 'split' },
            ]"
            data-tooltip="Split View - Editor and code side by side"
            aria-label="Split view"
            @click="$emit('view-mode-change', 'split')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path
                d="M1 2h6v12H1V2zm1 1v10h4V3H2zm7-1h6v12H9V2zm1 1v10h4V3h-4z"
              />
            </svg>
            <span class="btn-label">Split</span>
          </button>
          <button
            :class="[
              'view-mode-btn-pro',
              'view-mode-btn',
              'with-text',
              { active: viewMode === 'preview' },
            ]"
            data-tooltip="Preview - View final output without editing"
            aria-label="Preview view"
            @click="$emit('view-mode-change', 'preview')"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="2" />
              <path
                d="M8 3C4 3 1 8 1 8s3 5 7 5 7-5 7-5-3-5-7-5zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
              />
            </svg>
            <span class="btn-label">Preview</span>
          </button>
        </div>

        <!-- Format HTML Button (visible in code/split view) -->
        <button
          v-if="viewMode === 'code' || viewMode === 'split'"
          class="toolbar-btn-pro toolbar-btn-modern toolbar-btn-accent"
          data-tooltip="Format HTML (pretty-print)"
          aria-label="Format HTML"
          @click="$emit('format-html')"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M8 2l1 1-1 1-1-1 1-1zm-3 3l1 1-1 1-1-1 1-1zm6 0l1 1-1 1-1-1 1-1zM5 8l1 1-1 1-1-1 1-1zm6 0l1 1-1 1-1-1 1-1zM8 11l1 1-1 1-1-1 1-1z"
            />
          </svg>
        </button>

        <!-- Theme Toggle -->
        <button
          class="toolbar-btn-pro toolbar-btn-modern theme-toggle-pro theme-toggle"
          data-tooltip="Toggle theme"
          aria-label="Toggle dark/light theme"
          @click="$emit('toggle-theme')"
        >
          <transition name="theme-icon-fade" mode="out-in">
            <svg
              v-if="theme === 'dark'"
              key="sun"
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <circle cx="8" cy="8" r="3" />
              <path
                d="M8 1v2M8 13v2M15 8h-2M3 8H1M13 3l-1.5 1.5M4.5 11.5L3 13M13 13l-1.5-1.5M4.5 4.5L3 3"
              />
            </svg>
            <svg
              v-else
              key="moon"
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 1a7 7 0 1 0 5 11.9A7 7 0 0 1 8 1z" />
            </svg>
          </transition>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  viewMode: "editor" | "code" | "split" | "preview";
  theme: "light" | "dark";
}

defineProps<Props>();

defineEmits<{
  "remember-selection": [];
  "toggle-colors-dropdown": [];
  "text-color-change": [color: string];
  "background-color-change": [color: string];
  undo: [];
  redo: [];
  "view-mode-change": [mode: "editor" | "code" | "split" | "preview"];
  "format-html": [];
  "toggle-theme": [];
}>();
</script>
