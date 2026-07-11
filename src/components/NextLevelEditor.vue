<template>
  <div
    ref="rootEl"
    :class="[
      'next-level-editor',
      themeClass,
      themePresetClass,
      {
        fullscreen: isFullScreen,
        'is-full-width': isFullWidth,
        'is-resizing': isResizing,
      },
    ]"
    :style="[editorStyles, isFullScreen ? {} : resizeStyles]"
    :data-toolbar-position="
      effectiveToolbarPosition !== 'top' && !isPillMode
        ? effectiveToolbarPosition
        : undefined
    "
  >
    <!-- Accessibility: Skip Links -->
    <SkipLinks
      :main-target-id="mainLandmarkId"
      :toolbar-target-id="toolbarLandmarkId"
      :footer-target-id="footerLandmarkId"
    />

    <!-- Accessibility: ARIA Live Regions -->
    <AriaLiveRegion />

    <!-- Editor Toolbar. The shell div is the @container query context: a
         container query can never style the query container itself, so
         container-type lives here (not on the toolbar) for the auto-compact
         rules to actually match .editor-toolbar-modern. The shell also owns
         the sticky positioning the toolbar previously had — sticky inside a
         tight wrapper would otherwise pin to the wrapper's own bounds. -->
    <div
      v-if="showToolbar && !readonly && !isPillMode"
      ref="toolbarShellEl"
      class="nle-toolbar-shell"
      :data-adaptive="effectiveAdaptiveChrome"
      :data-receded="chromeReceded || undefined"
      :data-position="
        effectiveToolbarPosition !== 'top' && effectiveToolbarPosition !== 'zen'
          ? effectiveToolbarPosition
          : undefined
      "
    >
    <EditorToolbar
      :id="toolbarLandmarkId"
      :is-toolbar-section-visible="isToolbarSectionVisible"
      :format-dropdown-items="formatDropdownItems"
      :inline-format-actions="inlineFormatActions"
      :alignment-dropdown-items="alignmentDropdownItems"
      :list-actions="listActions"
      :insert-dropdown-items="insertDropdownItems"
      :show-colors-dropdown="showColorsDropdown"
      :text-color="textColor"
      :background-color="backgroundColor"
      :font-size-dropdown-items="fontSizeDropdownItems"
      :history-index="historyIndex"
      :history-length="history.length"
      :productivity-dropdown-items="productivityDropdownItems"
      :tool-actions="toolActions"
      :export-dropdown-items="exportDropdownItems"
      :view-mode="viewMode"
      :theme="theme"
      :is-full-screen="isFullScreen"
      :toolbar-layout="effectiveToolbarLayout"
      @remember-selection="rememberSelectionFromToolbar"
      @toggle-colors-dropdown="showColorsDropdown = !showColorsDropdown"
      @text-color-change="handleTextColor"
      @background-color-change="handleBackgroundColor"
      @undo="undo"
      @redo="redo"
      @view-mode-change="(mode) => (viewMode = mode)"
      @format-html="formatHtmlCode"
      @toggle-theme="toggleTheme"
      @toggle-fullscreen="toggleFullScreen"
    />
    <!-- Letterbox band — the toolbar's while-you-write form: three quiet
         signals in place of the buttons. Click (or any pointer intent /
         Escape / toolbar focus) restores the full toolbar. -->
    <div
      v-if="effectiveAdaptiveChrome === 'letterbox'"
      class="nle-letterbox"
      :title="'Click to show the toolbar'"
      @click="restoreChrome"
    >
      <span class="nle-letterbox-format">{{ letterboxFormatLabel }}</span>
      <span class="nle-letterbox-filament" aria-hidden="true">
        <span
          class="nle-letterbox-filament-fill"
          :style="{ width: `${Math.round(letterboxProgress * 100)}%` }"
        />
      </span>
      <span
        class="nle-letterbox-save"
        :class="{ 'is-pulsing': letterboxSavePulse }"
        aria-hidden="true"
      />
      <span class="nle-letterbox-count">{{ wordCount }} words</span>
    </div>
    </div>

    <CommandMenu
      :show="showCommandMenu"
      :position="commandMenuPosition"
      :options="commandOptions"
      :selected-index="commandSelectedIndex"
      @select="handleCommandOption"
    />

    <!-- Editor and Preview Panels -->
    <EditorPanels
      :id="mainLandmarkId"
      ref="editorPanelsRef"
      :view-mode="viewMode"
      :editable="!readonly"
      :placeholder="placeholder"
      :code-content="codeContent"
      :html-content="htmlContent"
      :split-right-mode="splitRightMode"
      @input="onInput"
      @paste="onPaste"
      @blur="onBlur"
      @focus="onFocus"
      @mousedown="onEditorMousedown"
      @mouseup="onMouseUp"
      @contextmenu="handleContextMenu"
      @code-input="onCodeInput"
      @code-blur="onCodeBlur"
      @split-right-mode-change="handleSplitRightModeChange"
      @split-editor-input="onSplitEditorInput"
    />

    <!-- Word Count Footer. Hidden while the toolbar docks at the bottom —
         two stacked bottom bands duplicated the word count (the dock's
         letterbox band carries it while writing). -->
    <EditorFooter
      v-if="effectiveToolbarPosition !== 'bottom'"
      :id="footerLandmarkId"
      :word-count="wordCount"
      :character-count="characterCount"
      :full-width="isFullWidth"
      @toggle-full-width="toggleFullWidth"
    />

    <!-- Corner resize grip: drag (or focus + arrow keys) to size the editor so
         more text is visible. Hidden in fullscreen (fixed inset) and pill mode
         (no docked chrome). Double-click resets to the authored size. -->
    <button
      v-if="!isFullScreen && !isPillMode"
      class="nle-resize-grip"
      type="button"
      aria-label="Resize editor (drag, or use arrow keys)"
      title="Drag to resize · double-click to reset"
      @pointerdown="onResizeGripPointerdown"
      @keydown="onResizeGripKeydown"
      @dblclick="resetEditorSize"
    >
      <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path
          d="M11 5 5 11M11 9l-2 2"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          fill="none"
        />
      </svg>
    </button>

    <!-- Floating Toolbar -->
    <!-- Selection toolbar (bubble over selected text) — never in readonly,
         and suppressed while the mobile bottom toolbar owns the screen:
         two stacked formatting surfaces on a phone is duplicated, cramped
         UI (the bottom bar already carries the same actions). -->
    <FloatingToolbar
      :show="
        showFloatingToolbar && !readonly && !mobileBarOnScreen && !isPillMode
      "
      :actions="floatingActions"
    />

    <!-- Playhead pill (toolbarMode="pill"): the ONE floating capsule that is
         the editor's entire chrome — it morphs between ambient / home /
         selection states and travels to the selection. Replaces both the
         docked toolbar and the selection bubble while active. -->
    <PlayheadPill
      v-if="isPillMode"
      :state="pillState"
      :anchor-rect="pillAnchorRect"
      :selection-position="pillSelectionPosition"
      :format-label="letterboxFormatLabel"
      :word-count="wordCount"
      :is-saving="isSaving || letterboxSavePulse"
      :inline-actions="floatingActions"
      :format-items="formatDropdownItems"
      :insert-items="insertDropdownItems"
      :overflow-items="pillOverflowItems"
      :alignment-items="alignmentDropdownItems"
      :size-items="fontSizeDropdownItems"
      :list-actions="listActions"
      :text-color-presets="pillTextColorPresets"
      :highlight-color-presets="pillHighlightColorPresets"
      :text-color="textColor"
      :background-color="backgroundColor"
      :theme="teleportThemeClass"
      @remember-selection="rememberSelectionBase"
      @expand="restoreChrome"
      @text-color-change="handleTextColor"
      @background-color-change="handleBackgroundColor"
    />

    <!-- Mobile bottom toolbar (self-hides on non-touch/desktop; off in
         readonly). Because it teleports to <body>, `visible` is driven by
         focus/last-interaction ownership: only the instance the user is
         working in shows a toolbar, so multi-editor pages never stack N
         identical fixed bars. -->
    <MobileToolbar
      :visible="mobileToolbarVisible && !readonly"
      :is-active="mobileIsActive"
      @action="handleMobileAction"
      @close="mobileToolbarClosed = true"
    />

    <!-- History Timeline panel (toggled from the Tools dropdown) -->
    <div v-if="showHistoryTimeline" class="history-timeline-panel">
      <HistoryTimeline
        :history="timelineEntries"
        :current-index="historyIndex"
        :can-go-back="historyIndex > 0"
        :can-go-forward="historyIndex < history.length - 1"
        :has-history="history.length > 0"
        :history-size="history.length"
        :timeline-progress="timelineProgress"
        @go-to-entry="jumpToHistory"
        @go-back="undo"
        @go-forward="redo"
        @go-to-first="jumpToHistory(0)"
        @go-to-latest="jumpToHistory(history.length - 1)"
        @clear="clearHistory"
        @export="handleExportHistory"
      />
    </div>

    <!-- Context Menu -->
    <ContextMenu
      :show="showContextMenu"
      :position="contextMenuPosition"
      :items="contextMenuItems"
      :theme="teleportThemeClass"
      @close="closeContextMenu"
    />

    <!-- Modals Container -->
    <ModalsContainer
      :theme="teleportThemeClass"
      :show-table-modal="showTableModal"
      :show-find-replace-modal="showFindReplaceModal"
      :show-code-block-modal="showCodeBlockModal"
      :show-table-designer="showTableDesigner"
      :show-table-properties-modal="showTablePropertiesModal"
      :show-emoji-picker="showEmojiPicker"
      :show-link-modal="showLinkModal"
      :show-image-upload-modal="showImageUploadModal"
      :show-embed-modal="showEmbedModal"
      :show-file-manager-modal="showFileManagerModal"
      :show-template-modal="showTemplateModal"
      :show-html-code-modal="showHtmlCodeModal"
      :show-command-palette="showCommandPalette"
      :show-toast="showToast"
      :is-saving="isSaving"
      :editor-content="editorContent?.innerHTML || ''"
      :table-designer-position="tableDesignerPosition"
      :table-properties-mode="tablePropertiesMode"
      :initial-cell-props="initialCellProps"
      :initial-table-props="initialTableProps"
      :formatted-html-content="
        formatHtml(htmlContent || editorContent?.innerHTML || '')
      "
      :command-palette-commands="commandPaletteCommands"
      :last-saved="lastSaved"
      :toast-message="toastMessage"
      :toast-type="toastType"
      @close-table-modal="closeTableModal"
      @insert-table="handleInsertTable"
      @close-find-replace-modal="closeFindReplaceModal"
      @find="handleFind"
      @replace="handleReplace"
      @replace-all="handleReplaceAll"
      @close-code-block-modal="closeCodeBlockModal"
      @insert-code-block="handleInsertCodeBlock"
      @add-row-above="handleAddRowAbove"
      @add-row-below="handleAddRowBelow"
      @add-column-left="handleAddColumnLeft"
      @add-column-right="handleAddColumnRight"
      @remove-row="handleRemoveRow"
      @remove-column="handleRemoveColumn"
      @cell-properties="handleCellProperties"
      @table-properties="handleTableProperties"
      @delete-table="handleDeleteTable"
      @close-table-properties-modal="closeTablePropertiesModal"
      @apply-table-properties="handleApplyTableProperties"
      @close-emoji-picker="showEmojiPicker = false"
      @insert-emoji="handleInsertEmoji"
      @close-link-modal="closeLinkModal"
      @insert-link="handleInsertLink"
      @close-image-upload-modal="closeImageUploadModal"
      @insert-image="handleInsertImage"
      @close-embed-modal="closeEmbedModal"
      @insert-embed="handleInsertEmbed"
      @close-file-manager-modal="closeFileManagerModal"
      @insert-file="handleInsertFile"
      @close-template-modal="closeTemplateModal"
      @select-template="handleSelectTemplate"
      @close-html-code-modal="closeHtmlCodeModal"
      @close-command-palette="closeCommandPalette"
      @execute-command="handleCommandExecute"
    />

    <!-- Writing Stats Panel (opt-in feature) -->
    <WritingStatsPanel
      v-if="showWritingStats && writingAssistant && showWritingStatsPanel"
      :stats="writingAssistant.stats.value"
      :readability="writingAssistant.readability.value"
      :sentence-analysis="writingAssistant.sentenceAnalysis.value"
      :word-analysis="writingAssistant.wordAnalysis.value"
      :issues="writingAssistant.issues.value"
      :seo="writingAssistant.seo.value"
      @close="showWritingStatsPanel = false"
    />

    <!-- Comments Sidebar (opt-in feature) -->
    <CommentsSidebar
      v-if="enableComments && comments"
      :threads="comments.threads.value"
      :active-thread-id="comments.activeThread.value?.id ?? null"
      :is-open="showCommentsSidebar"
      :mention-search="mentionSearch"
      @close="showCommentsSidebar = false"
      @select-thread="handleSelectThread"
      @resolve-thread="handleResolveThread"
      @reopen-thread="handleReopenThread"
      @delete-thread="handleDeleteThread"
      @add-reply="handleAddReply"
      @create-comment="handleCreateComment"
    />

    <!-- Comment Modal (opt-in feature) -->
    <CommentModal
      v-if="enableComments && comments"
      :is-open="showCommentModal"
      :selected-text="selectedTextForComment"
      :mention-search="mentionSearch"
      @submit="handleCommentSubmit"
      @cancel="handleCommentCancel"
    />

    <!-- Variable Autocomplete (opt-in feature) -->
    <VariableAutocomplete
      v-if="enableVariables && variablesComposable"
      ref="variableAutocompleteRef"
      :variables="variablesComposable.variables.value"
      :categories="variablesComposable.categories.value"
      :query="variableAutocompleteQuery"
      :is-open="showVariableAutocomplete"
      :position="variableAutocompletePosition"
      @select="handleVariableSelect"
      @close="closeVariableAutocomplete"
    />

    <!-- Comments Toggle FAB (opt-in feature) -->
    <Transition name="fab-fade">
      <button
        v-if="enableComments && !showCommentsSidebar && comments"
        class="comments-toggle-fab"
        aria-label="Open comments"
        title="Open comments"
        @click="showCommentsSidebar = true"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span
          v-if="comments.threads.value.some((t) => t.status === 'open')"
          class="comments-toggle-badge"
        >
          {{ comments.threads.value.filter((t) => t.status === "open").length }}
        </span>
      </button>
    </Transition>

    <!-- Writing Stats Toggle FAB (opt-in feature) -->
    <Transition name="fab-fade">
      <button
        v-if="showWritingStats && writingAssistant"
        class="writing-stats-toggle-fab"
        aria-label="Toggle writing statistics"
        :title="
          showWritingStatsPanel
            ? 'Hide writing statistics'
            : 'Show writing statistics'
        "
        @click="showWritingStatsPanel = !showWritingStatsPanel"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 3v18h18M7 16l4-6 4 4 4-7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </Transition>

    <!-- Variables Toggle FAB (opt-in feature) -->
    <Transition name="fab-fade">
      <button
        v-if="enableVariables && variablesComposable"
        class="variables-toggle-fab"
        :style="{
          bottom: `calc(${variablesFabBottom}px + var(--nle-mobile-toolbar-clearance, 0px) + var(--nle-bottom-dock-clearance, 0px))`,
        }"
        aria-label="Toggle variables panel"
        :aria-expanded="showVariablesPanel"
        :title="showVariablesPanel ? 'Hide variables' : 'Show variables'"
        @click="showVariablesPanel = !showVariablesPanel"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 4C7.5 4 7 5 7 6.5V9c0 1.5-1 2.3-2.2 2.6v.8C6 12.7 7 13.5 7 15v2.5C7 19 7.5 20 9 20M15 4c1.5 0 2 1 2 2.5V9c0 1.5 1 2.3 2.2 2.6v.8C18 12.7 17 13.5 17 15v2.5c0 1.5-.5 2.5-2 2.5"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </Transition>

    <!-- Variables Panel (opt-in feature): browse all template variables with
         their current values and insert one at the caret with a click. -->
    <Transition name="fab-fade">
      <div
        v-if="enableVariables && variablesComposable && showVariablesPanel"
        class="variables-panel"
        :style="{
          bottom: `calc(${variablesFabBottom + 64}px + var(--nle-mobile-toolbar-clearance, 0px) + var(--nle-bottom-dock-clearance, 0px))`,
        }"
        role="dialog"
        aria-label="Template variables"
      >
        <div class="variables-panel-header">
          <span class="variables-panel-title">Variables</span>
          <button
            class="variables-panel-close"
            aria-label="Close variables panel"
            @click="showVariablesPanel = false"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
        <div class="variables-panel-list">
          <template
            v-for="category in variablesComposable.categories.value"
            :key="category.id"
          >
            <div
              v-if="
                variablesComposable.getVariablesByCategory(category.id).length
              "
              class="variables-panel-category"
            >
              {{ category.name }}
            </div>
            <button
              v-for="variable in variablesComposable.getVariablesByCategory(
                category.id
              )"
              :key="variable.id"
              class="variables-panel-item"
              :title="variable.description"
              @mousedown.prevent
              @click="handlePanelInsert(variable)"
            >
              <span class="variables-panel-item-name">{{
                variable.name
              }}</span>
              <span class="variables-panel-item-value">{{
                variable.value
              }}</span>
            </button>
          </template>
          <template v-if="uncategorizedVariables.length">
            <div class="variables-panel-category">Other</div>
            <button
              v-for="variable in uncategorizedVariables"
              :key="variable.id"
              class="variables-panel-item"
              :title="variable.description"
              @mousedown.prevent
              @click="handlePanelInsert(variable)"
            >
              <span class="variables-panel-item-name">{{
                variable.name
              }}</span>
              <span class="variables-panel-item-value">{{
                variable.value
              }}</span>
            </button>
          </template>
        </div>
        <div class="variables-panel-footer">
          Click a variable to insert it at the cursor
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  toRef,
  unref,
  nextTick,
  onMounted,
  onUnmounted,
  watch,
  watchEffect,
  useId,
} from "vue";

import {
  applyTextAlignment,
  applyTextColor,
  applyBackgroundColor,
  applyFontSize,
} from "../utils/commands";
import { smoothScrollIntoView } from "../utils/scroll";
import {
  checklistItemForCheckboxClick,
  toggleChecklistItem,
} from "../utils/checklist";
import { clampMenuToViewport } from "../utils/menuPosition";
import { getCaretDocumentProgress } from "../utils/caretProgress";
import {
  computeToolbarPosition,
  ESTIMATED_WIDTH as PILL_ESTIMATED_WIDTH,
} from "../utils/floatingToolbarPosition";
import PlayheadPill from "./PlayheadPill.vue";
import type {
  PlayheadState,
  PlayheadAnchorRect,
  PlayheadSelectionPosition,
} from "./PlayheadPill.types";
import { useChromeRecede } from "../composables/useChromeRecede";
import { selectionTick } from "../composables/useActiveStates";
import { useDeviceDetection } from "../composables/useDeviceDetection";
import { useTheme } from "../composables/useTheme";
import { useAutoSave } from "../composables/useAutoSave";
import { useSmartToolbar } from "../composables/useSmartToolbar";
import { useEditorContent } from "../composables/useEditorContent";
import { useKeyboardShortcuts } from "../composables/useKeyboardShortcuts";
import { useAccessibility } from "../composables/useAccessibility";
import { useEditorSetup } from "../composables/useEditorSetup";
import { useToolbarItems } from "../composables/useToolbarItems";
import { editorThemeClass } from "../composables/useEditorThemes";
import { useActiveStates } from "../composables/useActiveStates";
import { useSelection } from "../composables/useSelection";
import { useModals } from "../composables/useModals";
import { useFormattingActions } from "../composables/useFormattingActions";
import { useInsertActions } from "../composables/useInsertActions";
import { useContextMenu } from "../composables/useContextMenu";
import { useViewMode } from "../composables/useViewMode";
import { useFloatingToolbar } from "../composables/useFloatingToolbar";
import { useEditorUIState } from "../composables/useEditorUIState";
import { useTableActions } from "../composables/useTableActions";
import { useExportActions } from "../composables/useExportActions";
import { useCommandPaletteCommands } from "../composables/useCommandPaletteCommands";
import { useFindReplace } from "../composables/useFindReplace";
import { useEditorComputed } from "../composables/useEditorComputed";
import { useEditorResize } from "../composables/useEditorResize";
import { useSpellCheck } from "../composables/useSpellCheck";
import { useTemplateManager } from "../composables/useTemplateManager";
import { useEditorEvents } from "../composables/useEditorEvents";
import { useFormattingHandlers } from "../composables/useFormattingHandlers";
import { hasFormatCopied } from "../utils/formatPainter";
import { formatHtml } from "../utils/export";
import { useCommandPalette } from "../composables/useCommandPalette";
import { useSlashCommands } from "../composables/useSlashCommands";
import FloatingToolbar from "./FloatingToolbar.vue";
import MobileToolbar from "./MobileToolbar.vue";
import HistoryTimeline from "./HistoryTimeline.vue";
import ContextMenu from "./ContextMenu.vue";
import ModalsContainer from "./ModalsContainer.vue";
import EditorToolbar from "./EditorToolbar.vue";
import EditorPanels from "./EditorPanels.vue";
import EditorFooter from "./EditorFooter.vue";
import CommandMenu from "./CommandMenu.vue";
import SkipLinks from "./SkipLinks.vue";
import AriaLiveRegion from "./AriaLiveRegion.vue";
import WritingStatsPanel from "./WritingStatsPanel.vue";
import CommentsSidebar from "./CommentsSidebar.vue";
import CommentModal from "./CommentModal.vue";
import VariableAutocomplete from "./VariableAutocomplete.vue";
import { useWritingAssistant } from "../composables/useWritingAssistant";
import { useComments } from "../composables/useComments";
import { useVariables, type Variable } from "../composables/useVariables";
import { useSmartAutocomplete } from "../composables/useSmartAutocomplete";
import type { NextLevelEditorProps } from "./NextLevelEditor.types";

interface Emits {
  (e: "update:modelValue", value: string): void;
  (e: "focus"): void;
  (e: "blur"): void;
}

const props = withDefaults(defineProps<NextLevelEditorProps>(), {
  modelValue: "",
  placeholder: "Start typing...",
  width: undefined,
  height: undefined,
  showWritingStats: false,
  enableComments: false,
  mentionSearch: undefined,
  themePreset: "default",
  toolbarLayout: "comfortable",
  adaptiveChrome: "letterbox",
  toolbarPosition: "top",
  toolbarMode: "bar",
  readonly: false,
  showToolbar: true,
  defaultViewMode: "editor",
  autofocus: false,
});

const emit = defineEmits<Emits>();

// Whole-editor theme preset → root class (composes with the light/dark class).
const themePresetClass = computed(() => editorThemeClass(props.themePreset));

// Teleported chrome (modals, context menu) renders outside the editor root,
// so it must carry BOTH the light/dark class AND the theme-preset class —
// the preset token files key off the preset class, and without it a Warm or
// Midnight editor opened slate/white dialogs. (themeClass is defined by
// useEditorComputed below; computeds are lazy so the forward reference is
// safe by first render.)
const teleportThemeClass = computed(() =>
  [themeClass.value, themePresetClass.value].filter(Boolean).join(" ")
);

// Per-instance landmark ids for the accessibility skip links. Derived from a
// unique base (useId) so the skip-link targets never collide with the host
// page or with a second editor instance on the same page.
const landmarkBaseId = useId();
const toolbarLandmarkId = `${landmarkBaseId}-toolbar`;
const mainLandmarkId = `${landmarkBaseId}-main`;
const footerLandmarkId = `${landmarkBaseId}-footer`;

const editorPanelsRef = ref<InstanceType<typeof EditorPanels> | null>(null);

// This instance's root element — the ownership scope for document-level
// listeners (e.g. the selection toolbar's selectionchange handling).
const rootEl = ref<HTMLElement | null>(null);

// Auto-compact: the CSS @container fallback can only restyle the bar — it
// cannot flip EditorToolbar's mini/expand JS state, so on a default
// 'comfortable' phone the intended mini → expand → ⋯More flow never
// activated. Observe the toolbar shell's width and derive the layout;
// the @container block stays as the no-JS fallback with matching styles.
const toolbarShellEl = ref<HTMLElement | null>(null);
const toolbarShellWidth = ref(Number.POSITIVE_INFINITY);
const toolbarShellHeight = ref(0);
let toolbarShellObserver: ResizeObserver | null = null;
watch(toolbarShellEl, (el) => {
  toolbarShellObserver?.disconnect();
  toolbarShellObserver = null;
  if (el && typeof ResizeObserver !== "undefined") {
    toolbarShellObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      // Defer the reactive write out of the observer's delivery cycle: the
      // layout flip it triggers (mini <-> full) resizes the shell in the same
      // frame, which otherwise raises the window-level "ResizeObserver loop
      // completed with undelivered notifications" error in WebKit/Blink.
      if (rect && rect.width !== toolbarShellWidth.value) {
        requestAnimationFrame(() => {
          toolbarShellWidth.value = rect.width;
        });
      }
      if (rect && rect.height !== toolbarShellHeight.value) {
        requestAnimationFrame(() => {
          toolbarShellHeight.value = rect.height;
        });
      }
    });
    toolbarShellObserver.observe(el);
  }
});
onUnmounted(() => {
  toolbarShellObserver?.disconnect();
  toolbarShellObserver = null;
});

// Root width drives the toolbarPosition fallback. The SHELL width cannot:
// in left-rail mode the shell is a ~48px column, which would read as
// "phone" forever. Same deferred-write pattern as the shell observer.
const rootWidth = ref(Number.POSITIVE_INFINITY);
let rootObserver: ResizeObserver | null = null;
watch(rootEl, (el) => {
  rootObserver?.disconnect();
  rootObserver = null;
  if (el && typeof ResizeObserver !== "undefined") {
    rootObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width != null && width !== rootWidth.value) {
        requestAnimationFrame(() => {
          rootWidth.value = width;
        });
      }
    });
    rootObserver.observe(el);
  }
});
onUnmounted(() => {
  rootObserver?.disconnect();
  rootObserver = null;
});

// Every non-top position is a desktop arrangement. Fall back to the classic
// top bar below the breakpoint AND whenever the device says the mobile
// bottom toolbar owns the screen — the two breakpoints differ (root 640px vs
// device 768px), and between them a bottom dock and the mobile bar would
// both claim the bottom edge. (deviceShowsMobileToolbar is declared later
// in setup; computeds are lazy, so the forward reference is safe.)
const effectiveToolbarPosition = computed(() =>
  rootWidth.value <= 640 || deviceShowsMobileToolbar.value
    ? "top"
    : props.toolbarPosition
);

// Playhead: one floating capsule replaces both the docked toolbar and the
// selection bubble. Desktop-only (bar below the breakpoint / when the mobile
// bar owns the screen); while active, toolbarPosition/adaptiveChrome are
// inert — the pill has its own grammar. The pill needs an editable WYSIWYG
// surface: in code/preview views the docked bar returns (it carries the
// view-mode switch, which the pill deliberately doesn't).
const effectiveToolbarMode = computed(() =>
  rootWidth.value <= 640 || deviceShowsMobileToolbar.value
    ? "bar"
    : props.toolbarMode
);
const isPillMode = computed(
  () =>
    effectiveToolbarMode.value === "pill" &&
    props.showToolbar &&
    !props.readonly &&
    (viewMode.value === "editor" || viewMode.value === "split")
);
const isZen = computed(() => effectiveToolbarPosition.value === "zen");

// Bottom-dock clearance: like the MobileToolbar, the desktop dock publishes
// its measured on-screen height so the FAB column and bottom-anchored
// panels rise above it instead of being buried under a full-width z-9999
// bar (the audit's "dock swallows the FABs").
watchEffect(() => {
  const el = rootEl.value;
  if (!el) return;
  const clearance =
    effectiveToolbarPosition.value === "bottom" && !isPillMode.value
      ? `${Math.round(toolbarShellHeight.value)}px`
      : "0px";
  el.style.setProperty("--nle-bottom-dock-clearance", clearance);
});
// Zen IS the letterbox, permanently — it overrides adaptiveChrome="off".
const effectiveAdaptiveChrome = computed(() =>
  isZen.value ? "letterbox" : props.adaptiveChrome
);

// Same 640px breakpoint as the @container rule in NextLevelEditor.css.
// The left rail always runs the compact/mini mechanics — collapsed rail =
// mini essentials, expand = the floating panel of everything else.
const effectiveToolbarLayout = computed(() =>
  props.toolbarLayout === "compact" ||
  effectiveToolbarPosition.value === "left" ||
  toolbarShellWidth.value <= 640
    ? "compact"
    : props.toolbarLayout
);

// View-mode state is declared early so the active-editable computed below can
// close over it (the refs are passed into useViewMode further down). Starts in
// the caller's preferred view.
const viewMode = ref<"editor" | "code" | "split" | "preview">(
  props.defaultViewMode
);
const splitRightMode = ref<"preview" | "editor">("preview");

// The ACTIVE editable surface. In split view with the right pane in editor
// mode, the visible surface is splitEditorRef — the classic editorRef is a
// display:none div there, and a hidden element cannot host a selection, so
// every toolbar/formatting action silently no-opped in that mode. [#23]
const editorContent = computed(() => {
  const panels = editorPanelsRef.value;
  if (!panels) return null;
  if (viewMode.value === "split" && splitRightMode.value === "editor") {
    return panels.splitEditorRef || panels.editorRef || null;
  }
  return panels.editorRef || null;
});

// Smart autocomplete engine (markdown shortcuts, URL/email auto-link, curly
// quotes, smart punctuation). Invoked from the wrapped onInput below. [#1]
const { handleInput: handleSmartAutocomplete } =
  useSmartAutocomplete(editorContent);

// Selection management using composable
const { rememberSelection: rememberSelectionBase, performWithSelection } =
  useSelection(editorContent);

// Extend rememberSelection to hide floating toolbar
const rememberSelection = () => {
  rememberSelectionBase();
  // Hide floating toolbar when interacting with main toolbar to prevent pointer event interference
  showFloatingToolbar.value = false;
};

// Main-toolbar mousedown handler: SUPPRESS the bubble (not just hide it), so a
// later selectionchange can't re-show it on top of an open dropdown menu where
// it would intercept clicks on the menu items. Suppression lifts on the next
// editor interaction (mouseup/focus). Kept separate from rememberSelection,
// which is also invoked internally on editor focus/blur.
const rememberSelectionFromToolbar = () => {
  rememberSelectionBase();
  suppressFloatingToolbar();
};

// Theme and UI state using composable
const { theme, toggleTheme: toggleThemeComposable } = useTheme();

// Accessibility (WCAG AAA). Capture announce() — it writes to the shared
// aria-live queue that the rendered <AriaLiveRegion> reads, so calling it here
// speaks feedback to screen readers. Previously the return was discarded and
// no editor action produced any spoken feedback. [a11y]
const { announce } = useAccessibility();

// Writing Assistant (opt-in feature) - local state for toggle
const showWritingStatsPanel = ref(false);

// History Timeline panel visibility (toggled from the Tools dropdown). [#14]
const showHistoryTimeline = ref(false);
const writingAssistant = props.showWritingStats ? useWritingAssistant() : null;

// Comments System (opt-in feature)
const comments = props.enableComments
  ? useComments({
      editorElement: editorContent as any,
      currentUser: {
        id: "current-user",
        name: "Current User",
        color: "#3b82f6",
      },
      // Route @mention lookups through the host-supplied provider. [#4]
      onMentionTriggered: props.mentionSearch
        ? async (query: string) => props.mentionSearch!(query)
        : undefined,
    })
  : (null as ReturnType<typeof useComments> | null);

// Comments UI state
const showCommentsSidebar = ref(false);
const showCommentModal = ref(false);
const selectedTextForComment = ref("");

// Variables System (opt-in feature)
const variablesComposable = props.enableVariables ? useVariables() : null;

// Variable autocomplete state
const variableAutocompleteRef = ref<InstanceType<
  typeof VariableAutocomplete
> | null>(null);
const showVariableAutocomplete = ref(false);
const variableAutocompleteQuery = ref("");
const variableAutocompletePosition = ref({ top: 0, left: 0 });

// Variables panel (FAB-toggled browse & insert surface)
const showVariablesPanel = ref(false);

// Stack the variables FAB above whichever of the comments/stats FABs are
// enabled so the FAB column has no gaps regardless of feature flags.
const variablesFabBottom = computed(() => {
  let bottom = 28;
  if (props.enableComments) bottom += 68;
  if (props.showWritingStats) bottom += 68;
  return bottom;
});

// Variables without a category (or with an unknown one) still need a home in
// the panel — they render under a trailing "Other" group.
const uncategorizedVariables = computed(() => {
  if (!variablesComposable) return [];
  const knownCategories = new Set(
    variablesComposable.categories.value.map((c) => c.id)
  );
  return variablesComposable.variables.value.filter(
    (v) => !v.category || !knownCategories.has(v.category)
  );
});

// Auto-save
const { isSaving, lastSaved, triggerAutoSave } = useAutoSave(
  async (content: string, version: number) => {
    // With a host-provided saveHandler the "Saved" signal is TRUTHFUL: it
    // asserts real persistence and reports real failures. Without one, the
    // v-model emission IS the handoff — the host owns the content the moment
    // it is emitted — and the signal keeps its historical meaning.
    if (props.saveHandler) {
      try {
        const ok = await props.saveHandler(content);
        return { success: ok !== false, serverVersion: version + 1 };
      } catch {
        return { success: false, serverVersion: version };
      }
    }
    emit("update:modelValue", content);
    return { success: true, serverVersion: version + 1 };
  },
  { delay: 2000 } // 2 second delay
);

// Editor Content Management (replaces inline sanitization, history, and content sync)
const {
  htmlContent,
  codeContent,
  history,
  historyIndex,
  isApplyingHistory,
  applySanitizedContent,
  captureAndEmit: captureSnapshot,
  undo,
  redo,
  jumpToHistory,
  clearHistory,
  sanitizeHtml,
} = useEditorContent({
  editorContent,
  modelValue: toRef(props, "modelValue"),
  onUpdate: (value) => emit("update:modelValue", value),
  triggerAutoSave,
});

// History Timeline adapters: map the live undo/redo history (the single source
// of truth) onto the HistoryTimeline component's entry shape. [#14]
const timelineEntries = computed(() =>
  history.value.map((entry) => ({
    id: entry.id,
    content: entry.preview,
    timestamp: entry.timestamp,
  }))
);
const timelineProgress = computed(() =>
  history.value.length > 1
    ? (historyIndex.value / (history.value.length - 1)) * 100
    : 100
);

// Download the full history as JSON (History Timeline "Export").
function handleExportHistory() {
  const payload = JSON.stringify(history.value, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "editor-history.json";
  link.click();
  URL.revokeObjectURL(url);
}

// Editor computed properties and watchers using composable
const { themeClass, editorStyles, wordCount, characterCount } =
  useEditorComputed({
    theme,
    width: toRef(props, "width"),
    height: toRef(props, "height"),
    modelValue: toRef(props, "modelValue"),
    editorContent,
    htmlContent,
    isApplyingHistory,
    applySanitizedContent,
    captureSnapshot,
    triggerAutoSave,
  });

// Corner resize grip: lets the user drag/arrow the editor larger to see more
// text. Its size overrides the width/height props once the user interacts.
const {
  resizeStyles,
  isResizing,
  beginResize,
  onHandleKeydown: onResizeHandleKeydown,
  resetSize: resetEditorSize,
} = useEditorResize();
const onResizeGripPointerdown = (event: PointerEvent) =>
  beginResize(event, rootEl.value);
const onResizeGripKeydown = (event: KeyboardEvent) =>
  onResizeHandleKeydown(event, rootEl.value);

// Content width: default is the readable centered column (~820px measure, as in
// Google Docs / Notion / Medium). "Full width" expands it to fill the editor —
// the Notion-style escape hatch for users who want to use all the space.
const isFullWidth = ref(false);
const toggleFullWidth = () => {
  isFullWidth.value = !isFullWidth.value;
};

// Command Palette
const { showCommandPalette, closeCommandPalette, addToRecent } =
  useCommandPalette();

// Smart Toolbar
const {
  updateContext: updateToolbarContext,
  isVisible: isToolbarSectionVisible,
} = useSmartToolbar();

// View mode management using composable. The viewMode ref itself is declared
// near the top (before the active-editable computed); this wires the mode-
// switch content synchronization around it.
useViewMode({
  editorContent,
  htmlContent,
  codeContent,
  viewModeRef: viewMode,
});

// Modal management using composable - pass rememberSelection to save cursor position
const {
  showLinkModal,
  showImageUploadModal,
  showEmbedModal,
  showFileManagerModal,
  showEmojiPicker,
  showTemplateModal,
  showHtmlCodeModal,
  showFindReplaceModal,
  showCodeBlockModal,
  showTableModal,
  showTableDesigner,
  showTablePropertiesModal,
  showShortcutHelpModal,
  openLinkModal,
  closeLinkModal,
  openImageUploadModal,
  closeImageUploadModal,
  openEmbedModal,
  closeEmbedModal,
  openFileManagerModal,
  closeFileManagerModal,
  openTemplateModal,
  closeTemplateModal,
  openHtmlCodeModal,
  closeHtmlCodeModal,
  openTableModal,
  closeTableModal,
  openTablePropertiesModal,
  closeTablePropertiesModal,
  openFindReplaceModal,
  closeFindReplaceModal,
  openCodeBlockModal,
  closeCodeBlockModal,
  toggleEmojiPicker,
} = useModals({ rememberSelection });

// Editor UI State using composable
const {
  isFullScreen,
  fontSize,
  spellCheckEnabled,
  formatPainterActive,
  textColor,
  backgroundColor,
  showColorsDropdown,
  showToast,
  toastMessage,
  toastType,
  showToastNotification,
  toggleFullScreen,
} = useEditorUIState({ duration: 3000 });

// A visible toast is also user-facing feedback that screen-reader users must
// hear. `notify` fires both so every "Table inserted", "Copied", etc. is
// spoken. Passed to the composables below in place of the bare toast fn.
const notify = (message: string, type?: "success" | "error") => {
  showToastNotification(message, type);
  announce(message, { priority: type === "error" ? "assertive" : "polite" });
};

// Table state
const currentTable = ref<HTMLTableElement | null>(null);
const currentCell = ref<HTMLTableCellElement | null>(null);
const tableDesignerPosition = ref({ x: 0, y: 0 });
const tablePropertiesMode = ref<"cell" | "table" | "both">("both");
const initialCellProps = ref({});
const initialTableProps = ref({});

// Formatting actions using composable
const {
  handleTextAlignment,
  handleTextColor: handleTextColorBase,
  handleBackgroundColor: handleBackgroundColorBase,
  handleFontSize,
  handleCopyFormat,
  handlePasteFormat: handlePasteFormatBase,
} = useFormattingActions(
  editorContent,
  fontSize,
  captureSnapshot,
  applyTextAlignment,
  applyTextColor,
  applyBackgroundColor,
  applyFontSize,
  performWithSelection
);

// Formatting Handlers - Using useFormattingHandlers composable
const {
  handleInlineAction,
  handleBlockAction,
  handleListAction,
  handleTextColor,
  handleBackgroundColor,
  handlePasteFormat,
} = useFormattingHandlers({
  performWithSelection,
  captureSnapshot,
  handleTextColorBase,
  handleBackgroundColorBase,
  handlePasteFormatBase,
  showColorsDropdown,
  formatPainterActive,
  textColor,
  backgroundColor,
});

// Context menu composable - needs to be after handleInlineAction, insertLink, insertImage are available
// Will be initialized after those dependencies are defined

// Insert actions - Defined after composable initialization

// Clear formatting function (for future cleanup toolbar)
// const clearFormatting = () => {
//   performWithSelection((root) => clearFormattingUtil(root))
// }

const toggleTheme = () => {
  toggleThemeComposable();
};

// Spell check using composable
const { enableSpellCheck, handleToggleSpellCheck } = useSpellCheck({
  editorContent,
  spellCheckEnabled,
});

// Template manager using composable
const { handleSelectTemplate } = useTemplateManager({
  editorContent,
  captureSnapshot,
});

// Table actions using composable
const {
  handleAddRowAbove,
  handleAddRowBelow,
  handleAddColumnLeft,
  handleAddColumnRight,
  handleRemoveRow,
  handleRemoveColumn,
  handleDeleteTable,
  handleCellProperties,
  handleTableProperties,
  handleApplyTableProperties,
} = useTableActions({
  currentTable,
  currentCell,
  showTableDesigner,
  showTablePropertiesModal,
  openTablePropertiesModal,
  initialCellProps,
  initialTableProps,
  tablePropertiesMode,
  onUpdate: () =>
    emit("update:modelValue", editorContent.value?.innerHTML || ""),
});

// Find & Replace using composable
const { handleFind, handleReplace, handleReplaceAll } = useFindReplace({
  editorContent,
  captureSnapshot,
});

// Code block actions - Now using composable

// Insert actions using composable
const {
  insertLink,
  handleInsertLink,
  insertImage,
  handleInsertImage,
  handleInsertEmbed,
  handleInsertFile,
  handleInsertEmoji,
  handleInsertPageBreak,
  handleInsertTOC,
  handleInsertHR,
  handleInsertChecklist,
  handleInsertTable,
  handleInsertCodeBlock,
} = useInsertActions({
  editorContent,
  performWithSelection,
  captureSnapshot,
  showToast: notify,
  openLinkModal,
  openImageUploadModal,
  closeImageUploadModal,
  closeEmbedModal,
  closeFileManagerModal: () => {
    showFileManagerModal.value = false;
  },
  closeEmojiPicker: toggleEmojiPicker,
});

// Context menu using composable
const {
  showContextMenu,
  contextMenuPosition,
  contextMenuItems,
  handleContextMenu,
  closeContextMenu,
} = useContextMenu({
  editorContent,
  handleInlineAction,
  insertLink,
  insertImage,
  rememberSelection,
  showTableDesigner,
  currentTable,
  currentCell,
  tableDesignerPosition,
  captureSnapshot,
  emitUpdate: (value: string) => emit("update:modelValue", value),
});

// Export actions using composable. The toolbar's "Format HTML" button is only
// shown in code/split views, where the code textarea is the editing surface —
// so it's wired to formatHtmlCode (which pretty-prints codeContent), not to
// handleFormatHtml (which only touches the hidden WYSIWYG div and left the
// visible textarea unchanged).
const {
  handleExportHtml,
  handleExportMarkdown,
  handleExportPdf,
  handleExportWord,
  formatHtmlCode,
} = useExportActions({
  editorContent,
  htmlContent,
  codeContent,
  showToast: notify,
  updateCodeContent: (content: string) => {
    codeContent.value = content;
    // Run the same sync flow as typing in the code editor (onCodeInput):
    // mirror into the WYSIWYG surface + reactive model and capture an undo
    // snapshot, so the reformat is visible, consistent, and undoable.
    if (editorContent.value) {
      editorContent.value.innerHTML = content;
      htmlContent.value = content;
    }
    // In split view with the right pane in editor mode, editorContent
    // resolves to the split editor — keep the hidden main editor mirrored
    // too (same as onSplitEditorInput) so mode switches preserve content.
    const hidden = editorPanelsRef.value?.editorRef;
    if (hidden && hidden !== editorContent.value) {
      hidden.innerHTML = content;
    }
    captureSnapshot();
  },
  captureSnapshot,
});

// Emoji picker actions - Now using composable

// Full screen actions - Now using composable

// Floating toolbar management - Now using composable

// Active state detection using composable
const { isInlineActionActive, isBlockActionActive, isListActionActive } =
  useActiveStates(editorContent);

// Floating toolbar management using composable
const {
  showFloatingToolbar,
  floatingToolbarTimer,
  updateFloatingToolbar,
  suppressFloatingToolbar,
  unsuppressFloatingToolbar,
  floatingActions,
} = useFloatingToolbar({
  handleInlineAction,
  isInlineActionActive,
  insertLink,
  isAddingComment: comments?.isAddingComment,
  enableComments: props.enableComments,
  onAddComment: handleCreateComment,
  // Ownership scope for the selection toolbar: only selections inside this
  // instance's root may show its bubble (selectionchange is document-global).
  editorRoot: rootEl,
});

// Toolbar Items - Using useToolbarItems composable
const {
  formatDropdownItems,
  inlineFormatActions,
  alignmentDropdownItems,
  fontSizeDropdownItems,
  listActions,
  insertDropdownItems,
  toolActions,
  exportDropdownItems,
  productivityDropdownItems,
} = useToolbarItems({
  editorContent,
  fontSize,
  handleBlockAction,
  handleInlineAction,
  handleListAction,
  handleTextAlignment,
  handleFontSize,
  handleInsertHR,
  handleInsertPageBreak,
  handleInsertTOC,
  isBlockActionActive,
  isInlineActionActive,
  isListActionActive,
  insertLink,
  insertImage,
  openFileManagerModal,
  openEmbedModal,
  openTableModal,
  openCodeBlockModal,
  openHtmlCodeModal,
  openFindReplaceModal: () => {
    showFindReplaceModal.value = true;
  },
  openTemplateModal,
  toggleEmojiPicker: () => {
    showEmojiPicker.value = !showEmojiPicker.value;
  },
  handleToggleSpellCheck,
  handleExportHtml,
  handleExportMarkdown,
  handleExportPdf,
  handleExportWord,
  handleCopyFormat,
  handlePasteFormat,
  hasFormatCopied,
  spellCheckEnabled,
  captureSnapshot,
  toggleHistoryTimeline: () => {
    showHistoryTimeline.value = !showHistoryTimeline.value;
  },
});

// Command Palette Commands using composable
const { commands: commandPaletteCommands } = useCommandPaletteCommands({
  handleInlineAction,
  handleBlockAction,
  handleListAction,
  insertLink,
  insertImage,
  openTableModal,
  openCodeBlockModal,
  toggleEmojiPicker,
  handleInsertHR,
  handleInsertPageBreak,
  handleInsertTOC,
  openFindReplaceModal,
  handleCopyFormat,
  openTemplateModal,
  handleToggleSpellCheck,
  toggleTheme,
  toggleFullScreen,
  handleExportHtml,
  handleExportMarkdown,
  handleExportPdf,
  handleExportWord,
  undo,
  redo,
});

// Handle command execution
function handleCommandExecute(command: any) {
  addToRecent(command.id);
  command.action();
}

// ---------------------------------------------------------------------------
// Mobile toolbar ownership.
// MobileToolbar teleports to <body> and (via useDeviceDetection) renders on
// every narrow viewport — so a page with several editors used to stack one
// identical fixed bottom bar PER instance. Same multi-instance family as the
// selection bubble, fixed with the same idea as useFloatingToolbar's
// `editorRoot` check: document-level events are scoped to THIS instance's
// root, and only the instance owning the last focus/interaction shows its
// toolbar. Before any interaction (e.g. while browsing the demo home page)
// no instance owns it and no toolbar shows.
// ---------------------------------------------------------------------------
const ownsMobileToolbar = ref(false);
// The toolbar's Close (X) hides it until this editor is focused/tapped again.
const mobileToolbarClosed = ref(false);
const mobileToolbarVisible = computed(
  () => ownsMobileToolbar.value && !mobileToolbarClosed.value
);

// Whether the mobile bottom bar is actually ON SCREEN: ownership alone isn't
// enough — MobileToolbar also self-gates on device detection, so on desktop
// `mobileToolbarVisible` can be true while nothing renders. The selection
// bubble must only be suppressed when the bar is really showing.
const { showMobileToolbar: deviceShowsMobileToolbar } = useDeviceDetection();
const mobileBarOnScreen = computed(
  () => mobileToolbarVisible.value && deviceShowsMobileToolbar.value
);

const updateMobileToolbarOwnership = (event: Event) => {
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (rootEl.value?.contains(target)) {
    // Interaction inside this editor claims ownership (and re-opens a
    // toolbar previously dismissed with the X).
    ownsMobileToolbar.value = true;
    mobileToolbarClosed.value = false;
    return;
  }
  const el = target instanceof Element ? target : target.parentElement;
  // The mobile toolbar itself is teleported to <body>: using it must not
  // release ownership (only the owning instance's toolbar is rendered).
  if (el?.closest(".mobile-toolbar")) return;
  // Anything else — another editor instance (which claims for itself) or
  // plain page content — releases ownership, hiding this toolbar.
  ownsMobileToolbar.value = false;
};

onMounted(() => {
  // Capture phase so stopPropagation inside widgets can't desync ownership.
  document.addEventListener("pointerdown", updateMobileToolbarOwnership, true);
  document.addEventListener("focusin", updateMobileToolbarOwnership, true);

  // autofocus: place the caret in the editing surface on mount so the user can
  // type immediately. Meaningless (and skipped) when readonly.
  if (props.autofocus && !props.readonly) {
    nextTick(() => {
      const surface = editorContent.value;
      if (surface) {
        surface.focus();
        // Collapse the caret to the end of existing content.
        const selection = globalThis.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(surface);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    });
  }
});

onUnmounted(() => {
  document.removeEventListener(
    "pointerdown",
    updateMobileToolbarOwnership,
    true
  );
  document.removeEventListener("focusin", updateMobileToolbarOwnership, true);
});

// Dispatch MobileToolbar button actions to the real editor handlers. Previously
// the mobile toolbar was never rendered and its buttons emitted a bare action id
// that nothing listened for, so every button was a no-op. [#6/#45]
function handleMobileAction(actionId: string) {
  switch (actionId) {
    case "bold":
      handleInlineAction("strong");
      break;
    case "italic":
      handleInlineAction("em");
      break;
    case "underline":
      handleInlineAction("u");
      break;
    case "strikethrough":
      handleInlineAction("s");
      break;
    case "code":
      handleInlineAction("code");
      break;
    case "blockquote":
      handleBlockAction("blockquote");
      break;
    case "checklist":
      handleInsertChecklist();
      break;
    case "paragraph":
      handleBlockAction("p");
      break;
    case "h1":
    case "h2":
    case "h3":
      handleBlockAction(actionId);
      break;
    case "bullet-list":
      handleListAction("ul");
      break;
    case "numbered-list":
      handleListAction("ol");
      break;
    case "link":
      insertLink();
      break;
    case "image":
      insertImage();
      break;
    case "table":
      openTableModal();
      break;
    case "code-block":
      openCodeBlockModal();
      break;
    case "file-manager":
      openFileManagerModal();
      break;
    case "video":
      openEmbedModal();
      break;
    case "hr":
      handleInsertHR();
      break;
    case "page-break":
      handleInsertPageBreak();
      break;
    case "toc":
      handleInsertTOC();
      break;
    case "emoji":
      toggleEmojiPicker();
      break;
    case "find":
      openFindReplaceModal();
      break;
    case "undo":
      undo();
      break;
    case "redo":
      redo();
      break;
    default:
      // Every button MobileToolbar ships is wired above. checklist / export /
      // settings / shortcuts were removed from the toolbar until they get
      // real handlers — add their cases here when reinstating the buttons.
      break;
  }
}

// Resolve the active state for MobileToolbar format buttons so they highlight
// like the desktop toolbar (reactive via useActiveStates' selectionTick). [#16]
function mobileIsActive(actionId: string): boolean {
  switch (actionId) {
    case "bold":
      return isInlineActionActive("strong");
    case "italic":
      return isInlineActionActive("em");
    case "underline":
      return isInlineActionActive("u");
    case "strikethrough":
      return isInlineActionActive("s");
    case "code":
      return isInlineActionActive("code");
    default:
      return false;
  }
}

// Command menu (Slash commands) - Using useSlashCommands composable
const {
  showCommandMenu,
  commandMenuPosition,
  commandOptions,
  selectedIndex: commandSelectedIndex,
  openCommandMenu,
  handleCommandOption,
  handleMenuKeydown: handleSlashMenuKeydown,
  handleDocumentClick,
  handleEscape,
} = useSlashCommands({
  handleInlineAction,
  handleBlockAction,
  handleListAction,
  insertLink,
  insertImage,
  openTableModal,
  openCodeBlockModal,
  handleInsertHR,
  performWithSelection,
  showToast: notify,
});

// Context menu - Now using composable

// Editor Events - Using useEditorEvents composable
const {
  onInput: onInputBase,
  onFocus: onFocusBase,
  onBlur,
  onMouseUp: onMouseUpBase,
  onSelectionChange,
  onCodeInput: onCodeInputBase,
  onCodeBlur,
} = useEditorEvents({
  editorContent,
  codeContent,
  htmlContent,
  captureSnapshot,
  updateFloatingToolbar,
  updateToolbarContext,
  rememberSelection,
  showFloatingToolbar,
  showTableDesigner,
  currentTable,
  currentCell,
  tableDesignerPosition,
  emit,
});

// Editor interaction lifts the floating-toolbar suppression set by toolbar
// mousedown (see rememberSelectionFromToolbar).
const onFocus = () => {
  unsuppressFloatingToolbar();
  onFocusBase();
};
const onMouseUp = () => {
  unsuppressFloatingToolbar();
  onMouseUpBase();
};

// Clicking a checklist item's checkbox gutter toggles its checked state. Handled
// on mousedown so preventDefault stops the caret from jumping into the gutter;
// the toggle mutates data-checked in place and captures a history snapshot so it
// persists (undoable) and round-trips through the sanitizer.
const onEditorMousedown = (event: MouseEvent) => {
  if (props.readonly) return;
  const li = checklistItemForCheckboxClick(event.target, event.clientX);
  if (!li) return;
  event.preventDefault();
  toggleChecklistItem(li);
  captureSnapshot();
};

// Wrap onInput to include variable detection and wrapping
// Paste: the browser drops the clipboard's raw HTML straight into the
// contenteditable, and sanitizeHtml would otherwise only clean the string we
// EMIT — never the live editing surface. Intercept rich-HTML pastes, run them
// through the same allowlist sanitizer, and insert the cleaned markup so no
// untrusted element (event handlers, exotic tags, mso cruft) ever lands in the
// editor. Plain-text pastes carry no markup, so the browser default is fine.
const onPaste = (event: ClipboardEvent) => {
  if (props.readonly) return;
  const clipboard = event.clipboardData;
  if (!clipboard) return;
  const html = clipboard.getData("text/html");
  if (!html) return;

  event.preventDefault();
  const clean = sanitizeHtml(html);
  document.execCommand("insertHTML", false, clean);
  // execCommand fires `input`, which runs the capture/emit + re-sanitize pass.
};

const onInput = (event?: Event) => {
  // IME guard: while a composition is live the browser fires input events
  // (inputType "insertCompositionText"); running the mutating passes below
  // (autocomplete's deleteContents/addRange, variable wrapping, model sync)
  // would tear down the IME buffer and displace the caret. Skip entirely —
  // EditorPanels re-emits `input` on compositionend (that event carries no
  // isComposing flag), so the deferred pass runs once when the IME commits.
  if ((event as InputEvent | undefined)?.isComposing) {
    return;
  }

  // (Placeholder recovery for <br>/<p><br></p> residues is handled purely in
  // CSS via :has() — see NextLevelEditor.css. A JS innerHTML-wipe here would
  // also destroy the paragraph that Enter legitimately seeds in an empty
  // document, yanking the caret.)

  // Smart autocomplete (markdown shortcuts, URL/email auto-link, curly quotes,
  // "--"/"..." punctuation) — only on WYSIWYG surfaces, never in code view.
  // Runs BEFORE onInputBase so the converted DOM is what gets synced to
  // v-model. Re-entrancy is handled inside the composable (isApplying guard).
  if (viewMode.value === "editor" || viewMode.value === "split") {
    handleSmartAutocomplete();
  }

  // Wrap completed variable tokens BEFORE the capture+sanitize+emit pass so
  // the emitted model already contains the pill. Wrapping after the emit made
  // the v-model round-trip see a DOM (with pill) that differed from the model
  // (without pill), rewriting innerHTML — and destroying the caret — one tick
  // later. The wrap itself is caret-preserving and idempotent.
  if (variablesComposable && editorContent.value) {
    variablesComposable.wrapVariablesInContent(editorContent.value);
  }

  onInputBase();

  // Detect variable syntax for autocomplete
  if (props.enableVariables) {
    detectVariableSyntax();
  }

  // Update writing statistics
  if (writingAssistant && editorContent.value) {
    writingAssistant.analyze(editorContent.value.innerHTML);
  }
};

// Wrap onCodeInput to sync with split editor in editor mode
const onCodeInput = (event: Event) => {
  onCodeInputBase(event);

  // If split view is active with editor mode on right, sync the split editor.
  // With the active-editable computed, editorContent already IS the split
  // editor in that mode (onCodeInputBase wrote into it) — only copy when they
  // are distinct elements.
  if (viewMode.value === "split" && splitRightMode.value === "editor") {
    nextTick(() => {
      const splitEl = editorPanelsRef.value?.splitEditorRef;
      if (splitEl && editorContent.value && splitEl !== editorContent.value) {
        splitEl.innerHTML = editorContent.value.innerHTML;
      }
    });
  }
};

// Handle split view right panel mode change
function handleSplitRightModeChange(mode: "preview" | "editor") {
  splitRightMode.value = mode;
  // Populate the split editor when switching to editor mode. Read from the
  // reactive htmlContent (single source of truth) with the hidden editor as a
  // fallback — after the mode flips, editorContent already resolves to the
  // split editor itself, so copying from editorContent would be a no-op self
  // copy that left the pane empty.
  if (mode === "editor") {
    nextTick(() => {
      const panels = editorPanelsRef.value;
      const splitEl = panels?.splitEditorRef;
      if (!splitEl) return;
      const source = htmlContent.value || panels?.editorRef?.innerHTML || "";
      if (splitEl.innerHTML !== source) {
        splitEl.innerHTML = source;
      }
    });
  }
}

// Handle split editor input - run the shared capture+sanitize+emit pipeline
// (editorContent resolves to the split editor here) and keep the hidden main
// editor mirrored so switching modes preserves content.
function onSplitEditorInput(event: Event) {
  const target = event.target as HTMLElement;
  const hidden = editorPanelsRef.value?.editorRef;
  if (hidden && hidden !== target) {
    hidden.innerHTML = target.innerHTML;
  }
  codeContent.value = formatHtml(target.innerHTML);
  captureSnapshot();
}

// Keep the visible split editor in sync with content changes that do not
// originate from typing in it (undo/redo, template insertion, external v-model
// updates). Guarded so it never clobbers the caret while the user is editing
// the split pane. [#24]
watch(htmlContent, (newHtml) => {
  if (viewMode.value !== "split" || splitRightMode.value !== "editor") return;
  const splitEl = editorPanelsRef.value?.splitEditorRef;
  if (
    splitEl &&
    document.activeElement !== splitEl &&
    splitEl.innerHTML !== newHtml
  ) {
    splitEl.innerHTML = newHtml;
  }
});

// Keyboard Shortcuts - Using useKeyboardShortcuts composable
const { handleKeydown } = useKeyboardShortcuts({
  editorContent,
  onInput,
  onCaptureSnapshot: captureSnapshot,
  undo,
  redo,
  openCommandMenu,
  insertLink,
  openFindReplaceModal: () => {
    showFindReplaceModal.value = true;
  },
  handleInlineAction,
  handleBlockAction,
  handleSlashMenuKeydown,
});

// Editor keydown: the variable autocomplete (when open) claims
// Arrow/Enter/Tab/Escape first — the same priority carve-out the slash menu
// has inside useKeyboardShortcuts — so Enter inserts the highlighted variable
// instead of a new paragraph.
function onEditorKeydown(event: KeyboardEvent) {
  if (variableAutocompleteRef.value?.handleEditorKeydown(event)) return;
  handleKeydown(event);
}

// Comments handlers
function handleSelectThread(threadId: string) {
  if (!comments) return;
  comments.setActiveThread(threadId);

  const thread = comments.threads.value.find((t) => t.id === threadId);
  if (thread?.highlightElement) {
    // Add temporary pulse highlight
    thread.highlightElement.classList.add("comment-highlight-pulse");

    smoothScrollIntoView(thread.highlightElement, {
      behavior: "smooth",
      block: "center",
    });

    // Remove pulse after animation
    setTimeout(() => {
      thread.highlightElement?.classList.remove("comment-highlight-pulse");
    }, 2000);
  }
}

function handleResolveThread(threadId: string) {
  if (!comments) return;
  comments.resolveThread(threadId);
}

function handleReopenThread(threadId: string) {
  if (!comments) return;
  comments.reopenThread(threadId);
}

function handleDeleteThread(threadId: string) {
  if (!comments) return;
  comments.deleteThread(threadId);
}

function handleAddReply(threadId: string, content: string, mentions: string[]) {
  if (!comments) return;
  const reply = comments.addReply(threadId, content, mentions);
  if (reply) {
    showToastNotification("Reply added successfully", "success");
  }
}

function handleCreateComment() {
  if (!comments) return;

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    showToastNotification("Please select text to comment on", "error");
    return;
  }

  // Capture the selection using the comments composable
  const captured = comments.startAddComment();
  if (!captured) {
    showToastNotification("Failed to capture selection", "error");
    return;
  }

  // Store the selected text for display in modal
  selectedTextForComment.value = selection.toString();

  // Show the comment modal
  showCommentModal.value = true;
}

function handleCommentSubmit(content: string, mentions: string[]) {
  if (!comments) return;

  // Add the thread with the captured selection
  const thread = comments.addThread(content, mentions);

  if (thread) {
    showToastNotification("Comment added successfully", "success");
    // Ensure sidebar is visible to show the new comment
    showCommentsSidebar.value = true;
  } else {
    showToastNotification("Failed to add comment", "error");
  }

  // Close the modal
  showCommentModal.value = false;
  selectedTextForComment.value = "";
}

function handleCommentCancel() {
  if (!comments) return;

  // Clear the selection capture
  comments.clearSelection();

  // Close the modal
  showCommentModal.value = false;
  selectedTextForComment.value = "";
}

// Variable handlers
function detectVariableSyntax() {
  if (!variablesComposable || !editorContent.value) return;

  const detection = variablesComposable.detectVariableAtCursor(
    editorContent.value
  );

  if (detection?.isInVariable) {
    // Show autocomplete
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // The dropdown is position: fixed, so viewport coordinates are used
      // as-is — adding scrollY here pushed it below the viewport whenever
      // the host page was scrolled. Clamp into the usable viewport (below
      // the main toolbar, above the mobile toolbar, inside the horizontal
      // bounds) exactly like the slash menu — an unclamped caret rect put
      // the 320px box off-screen right on phones and its lower rows under
      // the fixed mobile toolbar, where taps never landed.
      variableAutocompletePosition.value = clampMenuToViewport(
        rect.bottom + 5,
        rect.left,
        { estimatedWidth: 320, estimatedHeight: 400 }
      );

      variableAutocompleteQuery.value = detection.query;
      showVariableAutocomplete.value = true;
    }
  } else {
    showVariableAutocomplete.value = false;
  }
}

function handleVariableSelect(variable: any) {
  if (!variablesComposable || !editorContent.value) return;

  // Remove the {{ and partial text
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const node = range.startContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    const cursorPos = range.startOffset;
    const textBefore = text.substring(0, cursorPos);
    const lastOpenBrace = textBefore.lastIndexOf("{{");

    if (lastOpenBrace !== -1) {
      // Delete from {{ to cursor
      const deleteRange = document.createRange();
      deleteRange.setStart(node, lastOpenBrace);
      deleteRange.setEnd(node, cursorPos);
      deleteRange.deleteContents();

      // Insert variable
      variablesComposable.insertVariable(editorContent.value, variable.name);
    }
  }

  showVariableAutocomplete.value = false;

  // Trigger input event
  if (editorContent.value) {
    onInput();
  }
}

function closeVariableAutocomplete() {
  showVariableAutocomplete.value = false;
}

// Insert a variable from the variables panel. The panel items use
// @mousedown.prevent so the editor selection survives the click; if the caret
// was never placed in the editor, the pill is appended at the end instead.
function handlePanelInsert(variable: Variable) {
  if (!variablesComposable || !editorContent.value) return;
  const editor = editorContent.value;
  const selection = window.getSelection();
  const range =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  if (!range || !editor.contains(range.startContainer)) {
    const endRange = document.createRange();
    endRange.selectNodeContents(editor);
    endRange.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(endRange);
  }

  // insertVariable dispatches a bubbling "input" event, so the normal
  // capture/sanitize/emit pipeline runs without extra plumbing here.
  variablesComposable.insertVariable(editor, variable.name);
}

// Dismiss the top-most open overlay (modal / context menu / designer /
// dropdown). Returns true if something was closed so callers can stop.
function closeTopMostOverlay(): boolean {
  if (showContextMenu.value) {
    closeContextMenu();
    return true;
  }
  if (showTableDesigner.value) {
    showTableDesigner.value = false;
    return true;
  }
  if (showColorsDropdown.value) {
    showColorsDropdown.value = false;
    return true;
  }
  if (showHistoryTimeline.value) {
    showHistoryTimeline.value = false;
    return true;
  }
  if (showVariablesPanel.value) {
    showVariablesPanel.value = false;
    return true;
  }
  // The writing-stats panel becomes a bottom sheet on mobile that can cover its
  // own toggle FAB, so Escape must be able to dismiss it (it also has an
  // explicit close button). The comments sidebar is intentionally NOT here:
  // it hosts reply inputs, and closing it on Escape mid-reply would be hostile.
  if (showWritingStatsPanel.value) {
    showWritingStatsPanel.value = false;
    return true;
  }
  if (showEmojiPicker.value) {
    showEmojiPicker.value = false;
    return true;
  }
  if (showTableModal.value) {
    closeTableModal();
    return true;
  }
  if (showTablePropertiesModal.value) {
    closeTablePropertiesModal();
    return true;
  }
  if (showCodeBlockModal.value) {
    closeCodeBlockModal();
    return true;
  }
  if (showImageUploadModal.value) {
    closeImageUploadModal();
    return true;
  }
  if (showEmbedModal.value) {
    closeEmbedModal();
    return true;
  }
  if (showFileManagerModal.value) {
    closeFileManagerModal();
    return true;
  }
  if (showTemplateModal.value) {
    closeTemplateModal();
    return true;
  }
  if (showHtmlCodeModal.value) {
    closeHtmlCodeModal();
    return true;
  }
  if (showFindReplaceModal.value) {
    closeFindReplaceModal();
    return true;
  }
  return false;
}

// Application-level Escape handler: dismiss the top-most open overlay first,
// then fall through to the slash-command menu handler.
function handleGlobalEscape(event: KeyboardEvent) {
  if (event.key === "Escape" && closeTopMostOverlay()) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  handleEscape(event);
}

// Application-level document click: close the (hand-rolled) Colors dropdown on
// any outside click, then run the slash-command document handler. Clicks inside
// the trigger/menu are stopped via @click.stop and never reach here.
function handleGlobalDocumentClick(event: MouseEvent) {
  if (showColorsDropdown.value) {
    showColorsDropdown.value = false;
  }
  // Variable autocomplete only re-evaluates on input, so a click elsewhere
  // (which fires no input event) left it open with stale suggestions. Mirror
  // the slash menu's outside-click dismissal.
  if (
    showVariableAutocomplete.value &&
    !(event.target as HTMLElement | null)?.closest(".variable-autocomplete")
  ) {
    showVariableAutocomplete.value = false;
  }
  handleDocumentClick(event);
}

// Writing Assistant: analyze the initial content on mount and whenever the
// content is replaced externally (v-model). Previously the stats were only
// computed inside onInput, so they stayed empty for pre-existing content until
// the user typed a character.
if (writingAssistant) {
  const analyzeCurrentContent = () => {
    writingAssistant?.analyze(
      editorContent.value?.innerHTML ?? props.modelValue ?? ""
    );
  };
  onMounted(() => nextTick(analyzeCurrentContent));
  watch(
    () => props.modelValue,
    (value) => {
      // Only react to external updates (the editor's own edits already run
      // analyze via onInput and don't change props.modelValue synchronously).
      if (editorContent.value && value !== editorContent.value.innerHTML) {
        nextTick(analyzeCurrentContent);
      }
    }
  );
}

// Editor Setup and Cleanup - Using useEditorSetup composable
useEditorSetup({
  editorContent,
  codeContent,
  floatingToolbarTimer,
  modelValue: props.modelValue,
  applySanitizedContent,
  captureSnapshot,
  handleKeydown: onEditorKeydown,
  enableSpellCheck,
  handleDocumentClick: handleGlobalDocumentClick,
  handleEscape: handleGlobalEscape,
  onSelectionChange,
});

// ---------------------------------------------------------------------------
// Cinematic adaptive chrome ("Letterbox") — typing dissolves the toolbar into
// a quiet ambient band; intent (pointer, selection, Escape, toolbar focus)
// brings it back instantly. Declared LAST in setup: useChromeRecede watches
// `suppressed` with flush:"sync", so every flag it reads must already exist.
// ---------------------------------------------------------------------------

// Never recede while any overlay owns the screen — receding under an open
// menu/dialog would yank its anchor away.
const chromeSuppressed = computed(
  () =>
    showColorsDropdown.value ||
    showCommandMenu.value ||
    showVariableAutocomplete.value ||
    showHistoryTimeline.value ||
    showFloatingToolbar.value ||
    showVariablesPanel.value ||
    showLinkModal.value ||
    showImageUploadModal.value ||
    showEmbedModal.value ||
    showFileManagerModal.value ||
    showEmojiPicker.value ||
    showTemplateModal.value ||
    showHtmlCodeModal.value ||
    showFindReplaceModal.value ||
    showCodeBlockModal.value ||
    showTableModal.value ||
    showTableDesigner.value ||
    showTablePropertiesModal.value ||
    showShortcutHelpModal.value ||
    // The audit's suppression gaps: typing in the command palette's search,
    // a comment (modal or sidebar reply), or with the context menu / stats
    // panel open must never dissolve the chrome underneath the overlay.
    showCommandPalette.value ||
    showCommentModal.value ||
    showCommentsSidebar.value ||
    showWritingStatsPanel.value ||
    showContextMenu.value
);

// Desktop-only, and only when the main toolbar is actually rendered. Reuses
// the auto-compact breakpoint: below it the MobileToolbar owns the phone.
// The left rail has no letterbox either — its chrome is already marginal.
// In PILL mode the recede state machine stays on regardless of
// adaptiveChrome: it is what drives the pill's ambient contraction.
const adaptiveChromeEnabled = computed(
  () =>
    props.showToolbar &&
    !props.readonly &&
    viewMode.value !== "code" &&
    (isPillMode.value ||
      (effectiveAdaptiveChrome.value !== "off" &&
        effectiveToolbarPosition.value !== "left" &&
        toolbarShellWidth.value > 640))
);

const { receded: chromeReceded, restore: restoreChrome } = useChromeRecede({
  root: rootEl,
  enabled: adaptiveChromeEnabled,
  suppressed: chromeSuppressed,
  // Point-in-time check at the moment the recede timer fires: toolbar
  // dropdowns (and the pill's menus) manage their open state internally,
  // with no reactive flag to include in chromeSuppressed — the chrome must
  // never dissolve under a menu the user is reading.
  blockWhen: () =>
    !!rootEl.value?.querySelector(".dropdown-menu") ||
    !!document.querySelector(".playhead .dropdown-menu"),
});

// Zen ("Estúdio"): the letterbox IS the toolbar. Receded from the very first
// paint (set synchronously in setup, so there is no mount transition), and
// any restore is only a PEEK — a few seconds after intent brought the full
// toolbar out, it tucks itself away again unless the pointer is parked on it
// or an overlay is open.
if (props.toolbarPosition === "zen") {
  chromeReceded.value = true;
}
let zenTuckTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleZenTuck = () => {
  if (zenTuckTimer) clearTimeout(zenTuckTimer);
  zenTuckTimer = setTimeout(() => {
    if (!isZen.value || chromeReceded.value) return;
    // Never tuck when the adaptive chrome is disabled (code view, sub-640px,
    // readonly) — zen must not smuggle the letterbox past those gates. And
    // never tuck under a keyboard user: :hover only sees the pointer, so
    // also hold while focus lives inside the shell.
    if (!adaptiveChromeEnabled.value) return;
    const shell = toolbarShellEl.value;
    const focusInside =
      shell != null &&
      document.activeElement instanceof Node &&
      shell.contains(document.activeElement);
    if (chromeSuppressed.value || shell?.matches(":hover") || focusInside) {
      scheduleZenTuck();
      return;
    }
    chromeReceded.value = true;
  }, 2500);
};
watch([chromeReceded, isZen], ([receded, zen], [, wasZen]) => {
  // Entering zen at runtime (e.g. the playground select) recedes NOW —
  // the mode switch should read as an immediate scene change, not wait
  // out a tuck cycle.
  if (zen && !wasZen) {
    chromeReceded.value = true;
    return;
  }
  if (zen && !receded) {
    scheduleZenTuck();
  } else if (zenTuckTimer) {
    clearTimeout(zenTuckTimer);
    zenTuckTimer = null;
  }
});
onUnmounted(() => {
  if (zenTuckTimer) clearTimeout(zenTuckTimer);
});

// ---------------------------------------------------------------------------
// Playhead pill wiring. The pill is presentational — the HOST owns the state
// machine and geometry: selection wins (the pill IS the bubble), ambient
// while the chrome-recede state machine says "you're writing", home at rest.
// ---------------------------------------------------------------------------
const pillState = computed<PlayheadState>(() => {
  if (showFloatingToolbar.value) return "selection";
  if (chromeReceded.value) return "ambient";
  return "home";
});

// Anchor: the editor root's viewport rect (the pill is position: fixed, so
// it must refresh on window resize AND any scroll).
const pillAnchorRect = ref<PlayheadAnchorRect | null>(null);
const updatePillAnchor = () => {
  if (!isPillMode.value || !rootEl.value) {
    pillAnchorRect.value = null;
    return;
  }
  const r = rootEl.value.getBoundingClientRect();
  // `bottom` lets the pill hide once the editor is FULLY scrolled offscreen
  // (it parks at the viewport top edge until then — never chrome for a
  // document you can't see).
  pillAnchorRect.value = {
    top: r.top,
    left: r.left,
    width: r.width,
    bottom: r.bottom,
  };
};

// Selection travel target — the bubble's clamp/flip math, in VIEWPORT
// coordinates (scrollX/Y zero: fixed positioning, unlike the absolute
// FloatingToolbar).
const pillSelectionPosition = ref<PlayheadSelectionPosition | null>(null);
const updatePillSelection = () => {
  if (!isPillMode.value || pillState.value !== "selection") {
    pillSelectionPosition.value = null;
    return;
  }
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    pillSelectionPosition.value = null;
    return;
  }
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    pillSelectionPosition.value = null;
    return;
  }
  // Width from the REAL selection layer (n 36px buttons + 2px gaps + 10px
  // padding) instead of the bubble's generic 240px estimate — the
  // over-estimate parked near-edge selections short of their true clamp.
  const actionCount = unref(floatingActions)?.length ?? 5;
  const selectionLayerWidth = Math.max(
    actionCount * 36 + Math.max(actionCount - 1, 0) * 2 + 10,
    PILL_ESTIMATED_WIDTH / 2
  );
  const pos = computeToolbarPosition({
    rect: {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
    },
    toolbarWidth: selectionLayerWidth,
    viewportWidth: window.innerWidth,
    scrollX: 0,
    scrollY: 0,
  });
  pillSelectionPosition.value = {
    top: pos.top,
    left: pos.left,
    below: pos.below,
  };
};

const refreshPillGeometry = () => {
  updatePillAnchor();
  updatePillSelection();
};
onMounted(() => {
  window.addEventListener("resize", refreshPillGeometry);
  window.addEventListener("scroll", refreshPillGeometry, true);
  document.addEventListener("selectionchange", updatePillSelection);
  // A consumer that mounts with toolbar-mode="pill" STATICALLY never flips
  // isPillMode and never scrolls before writing — without this seed the
  // anchor stays null and the entire chrome is absent until first
  // interaction (the audit's "no pill on initial mount").
  nextTick(refreshPillGeometry);
});
onUnmounted(() => {
  window.removeEventListener("resize", refreshPillGeometry);
  window.removeEventListener("scroll", refreshPillGeometry, true);
  document.removeEventListener("selectionchange", updatePillSelection);
});
watch([isPillMode, pillState], () => nextTick(refreshPillGeometry));
// The editor can move/resize without any window resize or scroll (panels
// opening, content growing, host layout changes) — the root ResizeObserver
// already tracks that; ride its reactive width to re-anchor the pill.
watch(rootWidth, () => {
  if (isPillMode.value) nextTick(refreshPillGeometry);
});

// The pill's "⋯" carries the long tail: productivity tools + export.
// The pill's "⋯" carries every capability that has no inline home in the
// capsule — the audit's reachability sweep: undo/redo, the tool actions
// (Find & Replace, View HTML, Clear Formatting), the view-mode switch,
// fullscreen + theme, then productivity and export. Sections are hairline
// dividers.
const PILL_VIEW_MODES = [
  { mode: "editor", label: "Editor view" },
  { mode: "code", label: "Code view" },
  { mode: "split", label: "Split view" },
  { mode: "preview", label: "Preview view" },
] as const;
const pillOverflowItems = computed(() => [
  {
    id: "pill-undo",
    label: "Undo",
    isDisabled: () => historyIndex.value <= 0,
    onClick: undo,
  },
  {
    id: "pill-redo",
    label: "Redo",
    isDisabled: () => historyIndex.value >= history.value.length - 1,
    onClick: redo,
  },
  { divider: true },
  ...unref(toolActions),
  { divider: true },
  ...PILL_VIEW_MODES.map((v) => ({
    id: `pill-view-${v.mode}`,
    label: v.label,
    isActive: () => viewMode.value === v.mode,
    onClick: () => {
      viewMode.value = v.mode;
    },
  })),
  { divider: true },
  {
    id: "pill-theme",
    label: "Toggle theme",
    onClick: toggleTheme,
  },
  {
    id: "pill-fullscreen",
    label: "Fullscreen",
    isActive: () => isFullScreen.value,
    onClick: toggleFullScreen,
  },
  { divider: true },
  ...unref(productivityDropdownItems),
  ...unref(exportDropdownItems),
]);

// Same curated quick-pick palettes the masthead's Colors menu uses.
const pillTextColorPresets = [
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
const pillHighlightColorPresets = [
  "#fde047",
  "#fca5a5",
  "#fdba74",
  "#86efac",
  "#5eead4",
  "#93c5fd",
  "#c4b5fd",
  "#f9a8d4",
];

// The letterbox band's three signals (hard cap — it must never become a
// dashboard): current block format, document-position filament, save + count.
const BLOCK_FORMAT_LABELS: Record<string, string> = {
  P: "Paragraph",
  H1: "Heading 1",
  H2: "Heading 2",
  H3: "Heading 3",
  H4: "Heading 4",
  H5: "Heading 5",
  H6: "Heading 6",
  BLOCKQUOTE: "Quote",
  PRE: "Code",
  LI: "List",
  // Structural stops — the walk-up must not skip past a table cell or a
  // figure and mislabel the position as a bare "Paragraph".
  TD: "Table",
  TH: "Table",
  FIGURE: "Figure",
  FIGCAPTION: "Figure",
};
// The last in-editor label survives clicks outside the editor (band clicks,
// FABs, the host page) — snapping back to "Paragraph" on every outside
// click made the band flicker lies.
let lastFormatLabel = "Paragraph";
const letterboxFormatLabel = computed(() => {
  void selectionTick.value;
  const root = editorContent.value;
  const selection =
    typeof window !== "undefined" ? window.getSelection() : null;
  const anchor = selection?.anchorNode ?? null;
  if (!root || !anchor || !root.contains(anchor)) return lastFormatLabel;
  let el: HTMLElement | null =
    anchor.nodeType === Node.ELEMENT_NODE
      ? (anchor as HTMLElement)
      : anchor.parentElement;
  while (el && el !== root) {
    const label = BLOCK_FORMAT_LABELS[el.tagName];
    if (label) {
      lastFormatLabel = label;
      return label;
    }
    el = el.parentElement;
  }
  lastFormatLabel = "Paragraph";
  return "Paragraph";
});

// Playhead filament: the caret's position through the document, throttled —
// selectionchange fires on every keystroke and the value only needs to feel
// alive, not be frame-perfect.
const letterboxProgress = ref(0);
let progressLastUpdate = 0;
let progressTrailing: ReturnType<typeof setTimeout> | null = null;
const readLetterboxProgress = () => {
  const root = editorContent.value;
  if (!root) return;
  const progress = getCaretDocumentProgress(root);
  if (progress != null) letterboxProgress.value = progress;
};
const updateLetterboxProgress = () => {
  if (
    !adaptiveChromeEnabled.value ||
    effectiveAdaptiveChrome.value !== "letterbox"
  ) {
    return;
  }
  const now = Date.now();
  if (now - progressLastUpdate < 150) {
    // Leading-edge-only throttling permanently dropped the LAST caret
    // position of a burst — schedule one trailing read so the filament
    // always settles on the truth.
    if (!progressTrailing) {
      progressTrailing = setTimeout(() => {
        progressTrailing = null;
        progressLastUpdate = Date.now();
        readLetterboxProgress();
      }, 160);
    }
    return;
  }
  progressLastUpdate = now;
  readLetterboxProgress();
};
onUnmounted(() => {
  if (progressTrailing) clearTimeout(progressTrailing);
});
// Content replacement (undo/redo/history jump) moves the caret without a
// reliable selectionchange — refresh the filament off the history index.
watch(historyIndex, () => nextTick(readLetterboxProgress));
onMounted(() =>
  document.addEventListener("selectionchange", updateLetterboxProgress)
);
onUnmounted(() =>
  document.removeEventListener("selectionchange", updateLetterboxProgress)
);

// Auto-save pulse: one soft beat on the band's dot per completed save — the
// band's single use of accent (accent-as-signal).
const letterboxSavePulse = ref(false);
let savePulseTimer: ReturnType<typeof setTimeout> | null = null;
watch(lastSaved, () => {
  letterboxSavePulse.value = true;
  if (savePulseTimer) clearTimeout(savePulseTimer);
  savePulseTimer = setTimeout(() => {
    letterboxSavePulse.value = false;
  }, 1200);
});
onUnmounted(() => {
  if (savePulseTimer) clearTimeout(savePulseTimer);
});
</script>

<style src="../styles/NextLevelEditor.css"></style>
<style src="../styles/editor-variables.css"></style>
<style src="../styles/gap-fallback.css"></style>

<style scoped>
/* History Timeline floating panel (toggled from the Tools dropdown) */
.history-timeline-panel {
  position: fixed;
  top: 140px;
  right: 32px;
  width: 360px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  /* Open panels sit ABOVE the toolbar shell (9999): a bottom-anchored
     panel can reach into the sticky toolbar's zone, and its items must not
     lose clicks to the bar. FABs stay at 9998 (below the shell); dialog
     overlays (10050) still top everything. */
  z-index: 10000;
  border-radius: 14px;
  box-shadow: 0 20px 48px -12px rgba(0, 0, 0, 0.28),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  background: var(--editor-bg, #ffffff);
}

/* FAB Transition */
.fab-fade-enter-active,
.fab-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-fade-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

.fab-fade-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

/* Comments / Stats / Variables FABs — refined surface controls, one shared
   material (no gradient blobs). Sized as a matched set; icon is currentColor. */
.comments-toggle-fab,
.writing-stats-toggle-fab,
.variables-toggle-fab {
  position: fixed;
  right: 28px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface-raised);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px -4px rgba(15, 23, 42, 0.16),
    0 1px 3px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.25s ease, background 0.2s ease, color 0.2s ease,
    border-color 0.2s ease, bottom 0.25s ease;
  z-index: 9998;
}

.theme-dark .comments-toggle-fab,
.theme-dark .writing-stats-toggle-fab,
.theme-dark .variables-toggle-fab {
  box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

/* The whole fixed FAB column lifts above the mobile bottom toolbar while it
   is open: MobileToolbar publishes its measured on-screen height as
   --nle-mobile-toolbar-clearance on <html> (0 when hidden), so the offset is
   keyed on actual toolbar state — not a viewport guess — and the FABs never
   cover (or get covered by) the bar despite their higher z-index. */

/* Comments = the primary action: accent icon + a quiet accent ring. */
.comments-toggle-fab {
  bottom: calc(28px + var(--nle-mobile-toolbar-clearance, 0px) + var(--nle-bottom-dock-clearance, 0px));
  width: 56px;
  height: 56px;
  color: var(--toolbar-accent);
  border-color: var(--toolbar-accent);
}

/* Stats = secondary: a calm neutral icon until hovered. */
.writing-stats-toggle-fab {
  bottom: calc(96px + var(--nle-mobile-toolbar-clearance, 0px) + var(--nle-bottom-dock-clearance, 0px));
  width: 52px;
  height: 52px;
  color: var(--color-text-secondary);
}

/* Variables = secondary too; its `bottom` is computed inline so the FAB
   column stays gapless whichever feature flags are on. */
.variables-toggle-fab {
  width: 52px;
  height: 52px;
  color: var(--color-text-secondary);
}

.comments-toggle-fab:hover,
.writing-stats-toggle-fab:hover,
.variables-toggle-fab:hover {
  transform: translateY(-3px);
  background: var(--color-surface-overlay);
  color: var(--toolbar-accent);
  border-color: var(--toolbar-accent);
  box-shadow: 0 14px 34px -10px rgba(15, 23, 42, 0.26),
    0 2px 6px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.theme-dark .comments-toggle-fab:hover,
.theme-dark .writing-stats-toggle-fab:hover,
.theme-dark .variables-toggle-fab:hover {
  box-shadow: 0 14px 34px -10px rgba(0, 0, 0, 0.6),
    0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.comments-toggle-fab:active,
.writing-stats-toggle-fab:active,
.variables-toggle-fab:active {
  transform: translateY(-1px) scale(0.96);
}

.comments-toggle-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  background: var(--toolbar-accent);
  color: #fff;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px var(--color-surface-raised);
}

@media (prefers-reduced-motion: reduce) {
  .comments-toggle-fab,
  .writing-stats-toggle-fab,
  .variables-toggle-fab {
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }
  .comments-toggle-fab:hover,
  .writing-stats-toggle-fab:hover,
  .variables-toggle-fab:hover,
  .comments-toggle-fab:active,
  .writing-stats-toggle-fab:active,
  .variables-toggle-fab:active {
    transform: none;
  }
}

/* Variables panel — floating browse & insert surface anchored to its FAB.
   Same material as the other floating panels: raised surface, neutral
   shadow, accent used only as a signal. */
.variables-panel {
  position: fixed;
  right: 28px;
  width: 320px;
  max-height: 420px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 20px 48px -12px rgba(0, 0, 0, 0.28),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  /* Open panels sit ABOVE the toolbar shell (9999): a bottom-anchored
     panel can reach into the sticky toolbar's zone, and its items must not
     lose clicks to the bar. FABs stay at 9998 (below the shell); dialog
     overlays (10050) still top everything. */
  z-index: 10000;
}

.variables-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.variables-panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.variables-panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.variables-panel-close:hover {
  background: var(--color-surface-overlay);
  color: var(--color-text);
}

.variables-panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.variables-panel-category {
  padding: 10px 10px 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.variables-panel-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 7px 10px;
  background: transparent;
  border: none;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.variables-panel-item:hover,
.variables-panel-item:focus-visible {
  background: var(--color-surface-overlay);
}

.variables-panel-item-name {
  font-family: "Courier New", Consolas, Monaco, monospace;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--toolbar-accent);
  white-space: nowrap;
}

.variables-panel-item-value {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.variables-panel-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--color-border);
  font-size: 11px;
  color: var(--color-text-secondary);
}

/* Comment Highlight Pulse */
:deep(.comment-highlight-pulse) {
  animation: commentPulse 2s ease-in-out;
  position: relative;
}

@keyframes commentPulse {
  0%,
  100% {
    background-color: transparent;
    box-shadow: none;
  }
  50% {
    background-color: rgba(59, 130, 246, 0.2);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
    border-radius: 4px;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .comments-toggle-fab {
    bottom: calc(20px + var(--nle-mobile-toolbar-clearance, 0px) + var(--nle-bottom-dock-clearance, 0px));
    right: 20px;
    width: 56px;
    height: 56px;
  }
}

/* On narrow screens the fixed 320px panel could grow taller than the viewport
   and clip its own top off-screen, stranding the first category (its items
   can't be scrolled into the visible area). Reflow it into a bottom sheet that
   spans the width with margins and is capped to a safe fraction of the
   viewport, so every variable stays reachable via the list's internal scroll.
   The `bottom` is set inline, so the mobile override needs !important. */
@media (max-width: 640px) {
  /* Same clip class as the variables panel: fixed 360px at right:32px puts
     the history panel's left edge at -17px on a 375px phone, cutting off
     entry markers and nav buttons with no way to scroll them into view. */
  .history-timeline-panel {
    left: 12px;
    right: 12px;
    width: auto;
    max-height: calc(100vh - 160px - var(--nle-mobile-toolbar-clearance, 0px));
  }

  .variables-panel {
    left: 12px;
    right: 12px;
    width: auto;
    max-height: 70vh;
    bottom: calc(16px + var(--nle-mobile-toolbar-clearance, 0px)) !important;
  }
}

/* ---------------------------------------------------------------------------
   Toolbar position layouts. The root carries data-toolbar-position (mirroring
   effectiveToolbarPosition — absent for "top"); the shell carries
   data-position for the toolbar's own form (styled in NextLevelEditor.css).
   This block only PLACES the shell; below 640px the attribute disappears and
   the classic top layout returns untouched.
--------------------------------------------------------------------------- */

/* Margem: a slim rail absolutely placed in the left padding — the content
   simply flows in the reserved gutter, so no child needs individual offsets. */
.next-level-editor[data-toolbar-position="left"] {
  padding-left: 48px;
}

.next-level-editor[data-toolbar-position="left"] .nle-toolbar-shell {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 48px;
  z-index: 20;
}

/* Baseline: the shell docks under the page. Flex column keeps source order
   for everything else; sticky bottom pins the dock while the editor is in
   view. Menus/tooltips open upward via the shell's data-position styles. */
.next-level-editor[data-toolbar-position="bottom"] {
  display: flex;
  flex-direction: column;
}

.next-level-editor[data-toolbar-position="bottom"] .nle-toolbar-shell {
  order: 99;
  position: sticky;
  bottom: 0;
  top: auto;
}

/* ---------------------------------------------------------------------------
   Cinematic adaptive chrome. Two stacked layers in the toolbar shell (which is
   position: sticky, i.e. a containing block): the toolbar itself and the
   letterbox band. All choreography is opacity-only inside RESERVED space —
   the shell's height never changes, so the text below never reflows. Recede
   is slow and beneath notice (gentle ease); return is near-instant (ease-out).
   Durations come from the --nle-motion tokens, which prefers-reduced-motion
   already collapses to plain quick crossfades.
--------------------------------------------------------------------------- */
.nle-toolbar-shell[data-adaptive] :deep(.editor-toolbar-modern) {
  transition: opacity var(--nle-motion-return, 160ms)
    var(--nle-ease-out, cubic-bezier(0.05, 0.7, 0.1, 1));
}

.nle-toolbar-shell[data-adaptive][data-receded] :deep(.editor-toolbar-modern) {
  transition: opacity var(--nle-motion-recede, 450ms)
    var(--nle-ease-gentle, cubic-bezier(0.4, 0, 0.6, 1));
  pointer-events: none;
}

/* Letterbox: the buttons dissolve fully — the band takes their place. */
.nle-toolbar-shell[data-adaptive="letterbox"][data-receded]
  :deep(.editor-toolbar-modern) {
  opacity: 0;
}

/* Recede: the conservative variant — a whisper of the toolbar remains. */
.nle-toolbar-shell[data-adaptive="recede"][data-receded]
  :deep(.editor-toolbar-modern) {
  opacity: 0.16;
}

/* The ambient band: absolute over the toolbar's reserved space, inert until
   the chrome recedes. One shade deeper than the toolbar surface (the house
   lights going down); progressive enhancement via color-mix. */
.nle-letterbox {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
  background: var(--toolbar-bg, var(--color-surface));
  background: color-mix(
    in srgb,
    var(--toolbar-bg, var(--color-surface)) 88%,
    #000 12%
  );
  border-bottom: 1px solid var(--color-divider, var(--color-border));
  opacity: 0;
  pointer-events: none;
  cursor: pointer;
  transition: opacity var(--nle-motion-return, 160ms)
    var(--nle-ease-out, cubic-bezier(0.05, 0.7, 0.1, 1));
}

.nle-toolbar-shell[data-adaptive="letterbox"][data-receded] .nle-letterbox {
  opacity: 1;
  pointer-events: auto;
  transition: opacity var(--nle-motion-recede, 450ms)
    var(--nle-ease-gentle, cubic-bezier(0.4, 0, 0.6, 1));
}

/* Band ink: the band's surface is the toolbar bg deepened by 12%, so raw
   text-secondary lands at 3.2-4.5:1 in the light presets — below AA for
   12px text. Compensate by mixing the ink toward full text color; the
   plain-var fallback keeps non-color-mix engines readable. */
.nle-letterbox-format {
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--toolbar-text, var(--color-text));
  color: color-mix(
    in srgb,
    var(--toolbar-text-secondary, var(--color-text-secondary)) 45%,
    var(--toolbar-text, var(--color-text)) 55%
  );
  white-space: nowrap;
}

/* Bottom dock: the band's hairline must sit on the edge FACING the content
   (the top), mirroring the docked toolbar's own border flip. */
.nle-toolbar-shell[data-position="bottom"] .nle-letterbox {
  border-bottom: none;
  border-top: 1px solid var(--color-divider, var(--color-border));
}

/* The playhead: a 2px filament that fills as the caret moves through the
   document — the one detail that makes scrolling-while-writing meaningful. */
.nle-letterbox-filament {
  flex: 1;
  height: 2px;
  border-radius: 1px;
  background: var(--color-border);
  overflow: hidden;
}

.nle-letterbox-filament-fill {
  display: block;
  height: 100%;
  border-radius: 1px;
  background: var(--toolbar-text-secondary, var(--color-text-secondary));
  /* Motion token so prefers-reduced-motion collapses the slide; the fill is
     2px tall inside its own overflow:hidden track, so the width transition
     repaints a sliver — acceptable, and scaleX would blur the rounded tip. */
  transition: width var(--nle-motion-morph, 260ms)
    var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1));
}

/* Auto-save dot — the band's ONLY use of accent (accent-as-signal). */
.nle-letterbox-save {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--toolbar-text-secondary, var(--color-text-secondary));
  opacity: 0.35;
  transition: opacity var(--nle-motion-quick, 120ms) ease,
    background var(--nle-motion-quick, 120ms) ease;
}

.nle-letterbox-save.is-pulsing {
  background: var(--toolbar-accent, var(--color-primary));
  opacity: 1;
}

.nle-letterbox-count {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--toolbar-text, var(--color-text));
  color: color-mix(
    in srgb,
    var(--toolbar-text-secondary, var(--color-text-secondary)) 45%,
    var(--toolbar-text, var(--color-text)) 55%
  );
  white-space: nowrap;
}
</style>
