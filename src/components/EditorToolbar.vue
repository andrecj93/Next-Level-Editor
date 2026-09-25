<template>
  <nav v-if="writingMode" ref="rootEl" class="editor-toolbar-modern writing-toolbar" role="toolbar" aria-label="Text formatting toolbar" @keydown="onRovingKeydown" @focusin="onRovingFocusin">
    <div class="writing-toolbar-row">
      <div class="writing-history" role="group" aria-label="History">
        <button type="button" class="toolbar-btn-modern" aria-label="Undo" title="Undo (Ctrl+Z)" :disabled="historyIndex <= 0" @mousedown.prevent="$emit('remember-selection')" @click="$emit('undo')">↶</button>
        <button type="button" class="toolbar-btn-modern" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" :disabled="historyIndex >= historyLength - 1" @mousedown.prevent="$emit('remember-selection')" @click="$emit('redo')">↷</button>
      </div>
      <span class="writing-toolbar-divider" />
      <ToolbarSection class="writing-paragraph-format" type="dropdown" label="Format" tooltip="Paragraph style" :items="formatDropdownItems" :visible="isToolbarSectionVisible('format')" @remember-selection="$emit('remember-selection')" />
      <ToolbarSection class="writing-inline" type="buttons" :items="inlineFormatActions.filter(item => ['bold', 'italic', 'underline'].includes(item.id))" :visible="isToolbarSectionVisible('textFormatting')" @remember-selection="$emit('remember-selection')" />
      <span class="writing-toolbar-divider" />
      <ToolbarSection type="dropdown" label="Insert" preserve-label tooltip="Add a link, image, list, or other content" :items="writingInsertItems" :visible="isToolbarSectionVisible('insert')" @remember-selection="$emit('remember-selection')" />
      <button type="button" class="writing-more-format" aria-label="More formatting" title="Text style, alignment, and colors" :aria-expanded="writingFormattingOpen" @mousedown.prevent="$emit('remember-selection')" @click="toggleWritingFormatting">Style <span class="dropdown-arrow" aria-hidden="true">▾</span></button>
      <div class="writing-toolbar-spacer" />
      <ToolbarSection type="dropdown" label="Tools" preserve-label tooltip="Find, history, and document tools" :items="writingToolItems" @remember-selection="$emit('remember-selection')" />
      <ToolbarSection type="dropdown" label="View" preserve-label tooltip="Editor, source, preview, and focus" :items="writingViewItems" @remember-selection="$emit('remember-selection')" />
      <ToolbarSection class="writing-export" type="dropdown" label="Export" preserve-label tooltip="Download your document" :items="exportDropdownItems" @remember-selection="$emit('remember-selection')" />
      <button type="button" class="toolbar-btn-modern writing-theme" aria-label="Toggle dark/light theme" :aria-pressed="theme === 'dark'" title="Toggle theme" @click="$emit('toggle-theme')">◐</button>
    </div>
    <div v-if="writingFormattingOpen" class="writing-format-row" role="group" aria-label="More formatting options">
      <ToolbarSection type="buttons" native-tooltips :items="inlineFormatActions" :visible="isToolbarSectionVisible('textFormatting')" @remember-selection="$emit('remember-selection')" />
      <span class="writing-toolbar-divider" />
      <ToolbarSection type="dropdown" label="Align" preserve-label tooltip="Text alignment" :items="alignmentDropdownItems" :visible="isToolbarSectionVisible('alignment')" @remember-selection="$emit('remember-selection')" />
      <ToolbarSection type="dropdown" label="Size" preserve-label tooltip="Text size" :items="fontSizeDropdownItems" @remember-selection="$emit('remember-selection')" />
      <ToolbarSection type="buttons" native-tooltips :items="listActions" :visible="isToolbarSectionVisible('lists')" @remember-selection="$emit('remember-selection')" />
      <label class="writing-color" @mousedown="$emit('remember-selection')">Text <input type="color" aria-label="Text color" :disabled="!isToolbarSectionVisible('colors')" :value="textColor || '#333333'" @input="$emit('text-color-change', ($event.target as HTMLInputElement).value)"></label>
      <label class="writing-color" @mousedown="$emit('remember-selection')">Highlight <input type="color" aria-label="Highlight color" :disabled="!isToolbarSectionVisible('colors')" :value="backgroundColor === 'transparent' ? '#fff1a8' : backgroundColor" @input="$emit('background-color-change', ($event.target as HTMLInputElement).value)"></label>
      <button type="button" class="writing-remove-highlight" aria-label="Remove highlight" title="Remove highlight, keeping other formatting" :disabled="!isToolbarSectionVisible('colors')" @mousedown.prevent="$emit('remember-selection')" @click="pickHighlightColor('transparent')">None</button>
      <ToolbarSection type="buttons" native-tooltips :items="toolActions.filter(item => item.id === 'clear-formatting')" @remember-selection="$emit('remember-selection')" />
      <button type="button" class="toolbar-btn-modern" aria-label="Close more formatting" @mousedown.prevent="$emit('remember-selection')" @click="closeWritingFormatting">×</button>
    </div>
  </nav>
  <nav
    v-else
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
    @keydown="onRovingKeydown"
    @focusin="onRovingFocusin"
  >
    <!-- Light-sweep overlay — its OWN clipped layer (the toolbar must keep
         overflow: visible for dropdowns/tooltips, so the band can't be masked
         by the nav itself). Inert and invisible except during the one-shot
         .is-unfolding / .is-sweeping classes; beneath the buttons. -->
    <div class="toolbar-sweep-clip" aria-hidden="true">
      <div class="toolbar-sweep" />
    </div>

    <!-- History (Undo/Redo) — front-left, the universal editor convention
         (CKEditor, Word, Google Docs all lead with it). Kept out of the mini
         essentials row (hidden until the compact bar is expanded), exactly as
         before, so narrow phones never overflow. -->
    <div
      v-show="!isMini"
      class="toolbar-section-group toolbar-history-group"
      role="group"
      aria-label="History"
    >
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

      <!-- Insert Dropdown — an essential, so it stays visible even in the
           collapsed mini bar (inserting links/images/tables is a top-3 action;
           hiding it behind the expand toggle made it look like the feature
           didn't exist on small screens). The mini row trims lower-priority
           buttons at very narrow container widths instead (see the
           mini-trim container queries in NextLevelEditor.css). -->
      <ToolbarSection
        type="dropdown"
        class="insert-dropdown"
        :visible="isToolbarSectionVisible('insert')"
        label="Insert"
        preserve-label
        icon="<svg width=&quot;18&quot; height=&quot;18&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;><path d=&quot;M5 12h14&quot;/><path d=&quot;M12 5v14&quot;/></svg>"
        tooltip="Insert content"
        :items="insertDropdownItems"
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
      <!-- Colors Dropdown -->
      <div
        ref="colorsWrapRef"
        class="toolbar-dropdown"
        :class="{ 'colors-section-disabled': !isToolbarSectionVisible('colors') }"
        @focusout="onColorsFocusOut"
        @keydown.capture="onColorsKeydownCapture"
      >
        <button
          class="dropdown-trigger"
          :class="{ open: showColorsDropdown }"
          :data-tooltip="
            isToolbarSectionVisible('colors')
              ? 'Text & background colors'
              : 'Text & background colors (not available for current selection)'
          "
          aria-label="Colors"
          :aria-expanded="showColorsDropdown"
          :disabled="!isToolbarSectionVisible('colors')"
          @mousedown.prevent="$emit('remember-selection')"
          @click.stop="
            isToolbarSectionVisible('colors')
              ? $emit('toggle-colors-dropdown')
              : null
          "
        >
          <span class="dropdown-icon"
            ><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3s6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 6-10 6-10Z" /><path d="M5 21h14" /></svg></span>
          <span class="dropdown-label">Colors</span>
          <span class="dropdown-arrow" aria-hidden="true">▼</span>
        </button>
        <transition name="dropdown-fade">
          <div
            v-if="showColorsDropdown"
            ref="colorsMenuRef"
            class="dropdown-menu colors-menu"
            :style="colorsMenuLeft !== 0 ? { left: `${colorsMenuLeft}px` } : {}"
            role="group"
            aria-label="Colors"
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

    <!-- Tools Group -->
    <div
      v-show="!isMini"
      class="toolbar-section-group nle-unfold"
      :style="{ '--nle-group-i': 2 }"
      role="group"
      aria-label="Tools"
    >
      <div class="toolbar-divider" />

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

    <!-- View & Display Controls Group — pinned to the right edge in the
         comfortable bar (see .toolbar-view-group in NextLevelEditor.css) so the
         document/output controls form a stable right cluster and never shove
         the formatting buttons around. -->
    <div
      v-show="!isMini"
      class="toolbar-section-group nle-unfold toolbar-view-group"
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

      <!-- Focus mode (in-page, distraction-free) — the calm default. Fills the
           window without the OS fullscreen takeover; Escape or this button
           leaves it. Moves into "⋯ More" in compact. -->
      <button
        v-if="toolbarLayout !== 'compact'"
        class="toolbar-btn-modern focus-toggle"
        :data-tooltip="
          isFocusMode ? 'Exit focus mode (Esc)' : 'Focus mode — fill the window'
        "
        :aria-label="isFocusMode ? 'Exit focus mode' : 'Enter focus mode'"
        :aria-pressed="isFocusMode"
        @click="$emit('toggle-focus')"
      >
        <svg v-if="!isFocusMode" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" x2="14" y1="3" y2="10" /><line x1="3" x2="10" y1="21" y2="14" /></svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" x2="21" y1="10" y2="3" /><line x1="3" x2="10" y1="21" y2="14" /></svg>
      </button>

      <!-- Fullscreen Toggle (real OS fullscreen) — moves into "⋯ More" in compact -->
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
import { preserveVisibleSelection } from "../utils/caretVisibility";

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
  isFocusMode?: boolean;
  toolbarLayout?: "comfortable" | "compact";
  writingMode?: boolean;
  writingToolActions?: ToolbarAction[];
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
const writingFormattingOpen = ref(false);
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
const toggleWritingFormatting = () => {
  const editor = rootEl.value?.closest('.next-level-editor')?.querySelector<HTMLElement>('.editor-content');
  const keepPlace = preserveVisibleSelection(editor ?? null);
  writingFormattingOpen.value = !writingFormattingOpen.value;
  nextTick(keepPlace);
};
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

/**
 * Roving tabindex — the ARIA toolbar pattern the role="toolbar" announcement
 * promises: the whole masthead is ONE tab stop; ArrowLeft/ArrowRight move
 * focus between its controls (Home/End jump to the extremes) instead of ~30
 * individual Tab stops between the page and the document.
 *
 * The roving stop is tracked imperatively (tabindex attributes, no reactive
 * re-render): controls live across ToolbarSection/ToolbarDropdown children
 * and v-show'd families, so a fresh DOM query per interaction is both simpler
 * and always in sync. Controls inside open dropdown MENUS are excluded — the
 * pattern roves across top-level controls only; menus own their navigation.
 */
const ROVING_KEYS = ["ArrowLeft", "ArrowRight", "Home", "End"];
const TOOLBAR_CONTROL_SELECTOR = 'button, [href], input[type="color"]';
let rovingStop: HTMLElement | null = null;

const isRovingVisible = (el: HTMLElement, root: HTMLElement): boolean => {
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    // v-show hides via inline display; [hidden] covers the rest. (CSS-class
    // hiding is additionally caught by checkVisibility below where supported.)
    if (node.hidden || node.style.display === "none") return false;
    node = node.parentElement;
  }
  if (typeof el.checkVisibility === "function" && !el.checkVisibility()) {
    return false;
  }
  return true;
};

const getToolbarControls = (): HTMLElement[] =>
  Array.from(rootEl.value?.querySelectorAll<HTMLElement>(TOOLBAR_CONTROL_SELECTOR) ?? [])
    .filter(el => !el.closest(".dropdown-menu"));

const getRovingControls = (): HTMLElement[] => {
  const root = rootEl.value;
  if (!root) return [];
  return getToolbarControls().filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      isRovingVisible(el, root)
  );
};

const applyRovingTabindex = () => {
  const previousStop = rovingStop;
  const hadFocus = previousStop !== null && document.activeElement === previousStop;
  const controls = getRovingControls();
  if (!rovingStop || !controls.includes(rovingStop)) {
    rovingStop = controls[0] ?? null;
  }
  // Clear unavailable controls too. A hidden/disabled former stop must not
  // compete with the visible entry point when the layout changes again.
  for (const el of getToolbarControls()) {
    el.tabIndex = el === rovingStop ? 0 : -1;
  }
  if (hadFocus && previousStop !== rovingStop) rovingStop?.focus();
};

const onToolbarResize = () => nextTick(applyRovingTabindex);

const focusToolbar = (): boolean => {
  // Refresh synchronously: the shortcut can arrive before a resize observer
  // or a reactive layout update has repaired the old tab stop.
  applyRovingTabindex();
  if (!rovingStop) return false;
  emit("remember-selection");
  rovingStop.focus();
  return document.activeElement === rovingStop;
};

defineExpose({ focusToolbar });

const onRovingFocusin = (event: FocusEvent) => {
  const target = (event.target as HTMLElement | null)?.closest?.(
    TOOLBAR_CONTROL_SELECTOR
  ) as HTMLElement | null;
  if (!target || target.closest(".dropdown-menu")) return;
  rovingStop = target;
  applyRovingTabindex();
};

const closeWritingFormatting = () => {
  writingFormattingOpen.value = false;
  nextTick(() => emit('return-editor'));
};

const onRovingKeydown = (event: KeyboardEvent) => {
  if (props.writingMode && event.key === 'Escape' && !(event.target as HTMLElement)?.closest('.dropdown-menu')) {
    event.preventDefault();
    event.stopPropagation();
    writingFormattingOpen.value = false;
    emit('return-editor');
    return;
  }
  if (!ROVING_KEYS.includes(event.key)) return;
  const target = event.target as HTMLElement | null;
  // Text fields and menus own their arrows. A closed native color control is
  // a toolbar control; its browser-owned picker handles keys after opening.
  if (!target || target.closest(".dropdown-menu")) return;
  if (target.matches?.('input:not([type="color"]), textarea, select')) return;
  const controls = getRovingControls();
  if (!controls.length) return;

  const current = controls.indexOf(
    (target.closest(TOOLBAR_CONTROL_SELECTOR) as HTMLElement | null) ?? target
  );
  let next: number;
  if (event.key === "Home") {
    next = 0;
  } else if (event.key === "End") {
    next = controls.length - 1;
  } else {
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const from = current === -1 ? (delta === 1 ? -1 : 0) : current;
    next = (from + delta + controls.length) % controls.length;
  }

  event.preventDefault();
  rovingStop = controls[next];
  applyRovingTabindex();
  rovingStop.focus();
};

// One tab stop from the start, and re-managed whenever density/expansion/view
// changes which controls exist or are visible (mini fold, compact "More",
// the code-view Format-HTML button, disabled undo/redo).
/**
 * The smart toolbar swaps which sections are available per context (caret in a
 * code block, an image selected, …). That can DISABLE or hide the control
 * currently holding the roving stop — and if the stop is not moved, no control
 * has tabindex=0 and Tab skips the whole toolbar, making it keyboard-
 * unreachable. `isToolbarSectionVisible` is a function prop closing over the
 * parent's reactive context, so sampling it here tracks those dependencies.
 * #r21-a11y-1
 */
const TOOLBAR_SECTIONS: readonly (keyof ToolbarConfig)[] = [
  "format",
  "textFormatting",
  "alignment",
  "lists",
  "insert",
  "colors",
  "link",
  "tools",
  "view",
  "export",
];
const sectionVisibilitySignature = () =>
  TOOLBAR_SECTIONS.map((section) =>
    props.isToolbarSectionVisible(section) ? "1" : "0"
  ).join("");

onMounted(() => {
  applyRovingTabindex();
  window.addEventListener("resize", onToolbarResize);
});
watch(
  [
    isMini,
    () => props.toolbarLayout,
    () => props.viewMode,
    () => props.historyIndex,
    () => props.historyLength,
    () => props.writingMode,
    writingFormattingOpen,
    sectionVisibilitySignature,
  ],
  () => {
    nextTick(applyRovingTabindex);
  }
);

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
  /** Deterministic close for the Colors disclosure's dismissal paths. #R24-11 */
  "close-colors-dropdown": [];
  "text-color-change": [color: string];
  "background-color-change": [color: string];
  undo: [];
  redo: [];
  "view-mode-change": [mode: "editor" | "code" | "split" | "preview"];
  "format-html": [];
  "toggle-theme": [];
  "toggle-fullscreen": [];
  "toggle-focus": [];
  "return-editor": [];
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
    id: "focus-mode",
    label: props.isFocusMode ? "Exit focus mode" : "Focus mode",
    icon: svgIcon(
      props.isFocusMode
        ? '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" x2="21" y1="10" y2="3"/><line x1="3" x2="10" y1="21" y2="14"/>'
        : '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>'
    ),
    isActive: () => Boolean(props.isFocusMode),
    onClick: () => emit("toggle-focus"),
  },
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

const writingInsertItems = computed(() => [
  ...props.listActions.filter(item => ['bullet-list', 'numbered-list'].includes(item.id)).map(item => ({ ...item, isDisabled: () => !props.isToolbarSectionVisible('lists') || Boolean(item.isDisabled?.()) })),
  { divider: true },
  ...props.insertDropdownItems,
]);
const writingToolItems = computed(() => [
  ...props.toolActions, ...(props.writingToolActions ?? []), { divider: true },
  { id: 'writing-undo', label: 'Undo', shortcut: 'Ctrl+Z', isDisabled: () => props.historyIndex <= 0, onClick: () => emit('undo') },
  { id: 'writing-redo', label: 'Redo', shortcut: 'Ctrl+Shift+Z', isDisabled: () => props.historyIndex >= props.historyLength - 1, onClick: () => emit('redo') },
  { divider: true }, ...props.productivityDropdownItems,
]);
const writingViewItems = computed(() => [
  ...compactMoreItems.value.filter(item => !props.toolActions.includes(item as ToolbarAction)),
  { divider: true },
  { id: 'writing-theme', label: props.theme === 'dark' ? 'Light appearance' : 'Dark appearance', onClick: () => emit('toggle-theme') },
  ...(props.viewMode === 'code' || props.viewMode === 'split' ? [{ id: 'writing-format-html', label: 'Format HTML', onClick: () => emit('format-html') }] : []),
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

// Viewport clamping for the hand-rolled Colors menu. Unlike the other
// dropdowns it does not go through ToolbarDropdown (its content is custom
// swatch sections, not a flat item list), so it needs its own copy of the
// clamp: left-aligned to the trigger, the ~244px menu overflowed the right
// edge at mid widths (~600–800px). Measured on open, applied via `left`.
const colorsMenuRef = ref<HTMLElement | null>(null);
const colorsMenuLeft = ref(0);
const colorsWrapRef = ref<HTMLElement | null>(null);

// --- Colors disclosure dismissal (#R24-11) ----------------------------------
// Parity with the ToolbarDropdown menus around it: without these, the panel
// stayed open UNDER a newly opened dropdown (their triggers stop click
// propagation, so the document CLICK closer never fired), floated orphaned
// when ArrowLeft/Right roved focus away, and a global-Escape close dropped
// focus to <body> from a focused swatch.

const closeColors = () => emit("close-colors-dropdown");

const onColorsOutsidePointerdown = (event: Event) => {
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (colorsWrapRef.value?.contains(target)) return;
  closeColors();
};

/**
 * True while a pick handler is mid-emit. Applying a color makes the HOST
 * focus the editor (performWithSelection → ensureEditorFocus), which blurs
 * the focused picker control — a focusout whose relatedTarget is genuinely
 * outside the wrap. That is the APPLY working, not the user leaving: without
 * this guard the custom picker died after one adjustment and keyboard Enter
 * on a swatch closed the stay-open panel. #R25-12
 */
let applyingColor = false;

const onColorsFocusOut = (event: FocusEvent) => {
  if (!props.showColorsDropdown) return;
  if (applyingColor) return;
  const next = event.relatedTarget as Node | null;
  // No relatedTarget = a press on something non-focusable (the vendor
  // saturation canvas, a label) or the window losing focus — not a
  // dismissal. Real outside presses are the pointerdown closer's job. #R25-13
  if (!next) return;
  if (colorsWrapRef.value?.contains(next)) return;
  closeColors();
};

const onColorsKeydownCapture = (event: KeyboardEvent) => {
  if (event.key !== "Escape" || !props.showColorsDropdown) return;
  event.preventDefault();
  event.stopPropagation();
  closeColors();
  // Fresh query on the next tick: the patch that closes the panel can replace
  // the trigger node, and focus() on a disconnected element is a silent no-op
  // (the PlayheadPill #R24-9 landmine).
  void nextTick(() =>
    colorsWrapRef.value
      ?.querySelector<HTMLElement>('button[aria-label="Colors"]')
      ?.focus()
  );
};

const clampColorsMenu = () => {
  const menu = colorsMenuRef.value;
  if (!menu) return;
  const margin = 8;
  colorsMenuLeft.value = 0;
  const r = menu.getBoundingClientRect();
  let shift = 0;
  if (r.right > window.innerWidth - margin) {
    shift = window.innerWidth - margin - r.right;
  }
  if (r.left + shift < margin) {
    shift = margin - r.left;
  }
  colorsMenuLeft.value = Math.round(shift);
};

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
    // Runs immediately at setup, so it executes during SSR where there is no
    // document. The selection listeners are client-only anyway.
    if (typeof document === "undefined") return;
    document.removeEventListener("selectionchange", readSelectionColors);
    // Capture phase: a ToolbarDropdown trigger's @click.stop cannot hide the
    // pointerdown from us, so opening another menu closes this panel. #R24-11
    document.removeEventListener("pointerdown", onColorsOutsidePointerdown, true);
    if (open) {
      readSelectionColors();
      document.addEventListener("selectionchange", readSelectionColors);
      document.addEventListener("pointerdown", onColorsOutsidePointerdown, true);
      nextTick(clampColorsMenu);
    } else {
      colorsMenuLeft.value = 0;
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  window.removeEventListener("resize", onToolbarResize);
  document.removeEventListener("selectionchange", readSelectionColors);
  document.removeEventListener("pointerdown", onColorsOutsidePointerdown, true);
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
  applyingColor = true;
  try {
    emit("text-color-change", color);
  } finally {
    applyingColor = false;
  }
  nextTick(readSelectionColors);
};

const pickHighlightColor = (color: string) => {
  applyingColor = true;
  try {
    emit("background-color-change", color);
  } finally {
    applyingColor = false;
  }
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

<style scoped>
/* The Colors dropdown is hand-rolled (not a ToolbarSection), so it needs its
   own disabled treatment to match the other sections when the smart toolbar
   marks `colors` unavailable (code/image contexts). Mirrors
   ToolbarSection's .toolbar-section-disabled. */
.colors-section-disabled {
  opacity: 0.4;
  pointer-events: none;
}
</style>
