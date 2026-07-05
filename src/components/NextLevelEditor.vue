<template>
  <div
    :class="['next-level-editor', themeClass, { fullscreen: isFullScreen }]"
    :style="editorStyles"
  >
    <!-- Accessibility: Skip Links -->
    <SkipLinks />

    <!-- Accessibility: ARIA Live Regions -->
    <AriaLiveRegion />

    <!-- Editor Toolbar -->
    <EditorToolbar
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
      @remember-selection="rememberSelectionFromToolbar"
      @toggle-colors-dropdown="showColorsDropdown = !showColorsDropdown"
      @text-color-change="handleTextColor"
      @background-color-change="handleBackgroundColor"
      @undo="undo"
      @redo="redo"
      @view-mode-change="(mode) => (viewMode = mode)"
      @format-html="handleFormatHtml"
      @toggle-theme="toggleTheme"
      @toggle-fullscreen="toggleFullScreen"
    />

    <CommandMenu
      :show="showCommandMenu"
      :position="commandMenuPosition"
      :options="commandOptions"
      :selected-index="commandSelectedIndex"
      @select="handleCommandOption"
    />

    <!-- Editor and Preview Panels -->
    <EditorPanels
      ref="editorPanelsRef"
      :view-mode="viewMode"
      :placeholder="placeholder"
      :code-content="codeContent"
      :html-content="htmlContent"
      :split-right-mode="splitRightMode"
      @input="onInput"
      @blur="onBlur"
      @focus="onFocus"
      @mouseup="onMouseUp"
      @contextmenu="handleContextMenu"
      @code-input="onCodeInput"
      @code-blur="onCodeBlur"
      @split-right-mode-change="handleSplitRightModeChange"
      @split-editor-input="onSplitEditorInput"
    />

    <!-- Word Count Footer -->
    <EditorFooter :word-count="wordCount" :character-count="characterCount" />

    <!-- Floating Toolbar -->
    <FloatingToolbar :show="showFloatingToolbar" :actions="floatingActions" />

    <!-- Mobile bottom toolbar (self-hides on non-touch/desktop) -->
    <MobileToolbar
      :is-active="mobileIsActive"
      @action="handleMobileAction"
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
      :theme="themeClass"
      @close="closeContextMenu"
    />

    <!-- Modals Container -->
    <ModalsContainer
      :theme="themeClass"
      :show-table-modal="showTableModal"
      :show-find-replace-modal="showFindReplaceModal"
      :show-code-block-modal="showCodeBlockModal"
      :show-table-designer="showTableDesigner"
      :show-table-properties-modal="showTablePropertiesModal"
      :show-emoji-picker="showEmojiPicker"
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

    <!-- Toast Notifications Container -->
    <ToastContainer />

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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef, nextTick, onMounted, watch } from "vue";

import {
  applyTextAlignment,
  applyTextColor,
  applyBackgroundColor,
  applyFontSize,
} from "../utils/commands";
import { smoothScrollIntoView } from "../utils/scroll";
import { useTheme } from "../composables/useTheme";
import { useAutoSave } from "../composables/useAutoSave";
import { useSmartToolbar } from "../composables/useSmartToolbar";
import { useEditorContent } from "../composables/useEditorContent";
import { useKeyboardShortcuts } from "../composables/useKeyboardShortcuts";
import { useAccessibility } from "../composables/useAccessibility";
import { useEditorSetup } from "../composables/useEditorSetup";
import { useToolbarItems } from "../composables/useToolbarItems";
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
import ToastContainer from "./ToastContainer.vue";
import SkipLinks from "./SkipLinks.vue";
import AriaLiveRegion from "./AriaLiveRegion.vue";
import WritingStatsPanel from "./WritingStatsPanel.vue";
import CommentsSidebar from "./CommentsSidebar.vue";
import CommentModal from "./CommentModal.vue";
import VariableAutocomplete from "./VariableAutocomplete.vue";
import { useWritingAssistant } from "../composables/useWritingAssistant";
import { useComments } from "../composables/useComments";
import type { MentionSuggestion } from "../composables/useComments";
import { useVariables } from "../composables/useVariables";
import { useSmartAutocomplete } from "../composables/useSmartAutocomplete";

interface Props {
  modelValue?: string;
  placeholder?: string;
  width?: string;
  height?: string;
  showWritingStats?: boolean;
  enableComments?: boolean;
  enableVariables?: boolean;
  /**
   * Host-supplied @mention provider for comments: given the text typed after
   * "@", return the users to suggest. Without it the mention dropdown stays
   * empty. [#4]
   */
  mentionSearch?: (
    query: string
  ) => Promise<MentionSuggestion[]> | MentionSuggestion[];
}

interface Emits {
  (e: "update:modelValue", value: string): void;
  (e: "focus"): void;
  (e: "blur"): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "Start typing...",
  width: undefined,
  height: undefined,
  showWritingStats: false,
  enableComments: false,
  mentionSearch: undefined,
});

const emit = defineEmits<Emits>();

const editorPanelsRef = ref<InstanceType<typeof EditorPanels> | null>(null);

// View-mode state is declared early so the active-editable computed below can
// close over it (the refs are passed into useViewMode further down).
const viewMode = ref<"editor" | "code" | "split" | "preview">("editor");
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

// Accessibility (WCAG AAA)
useAccessibility();

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
const showVariableAutocomplete = ref(false);
const variableAutocompleteQuery = ref("");
const variableAutocompletePosition = ref({ top: 0, left: 0 });

// Auto-save
const { isSaving, lastSaved, triggerAutoSave } = useAutoSave(
  async (content: string, version: number) => {
    // Emit the content for parent to save
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
    width: props.width,
    height: props.height,
    modelValue: props.modelValue,
    editorContent,
    htmlContent,
    isApplyingHistory,
    applySanitizedContent,
    captureSnapshot,
    triggerAutoSave,
  });

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
  insertImage,
  handleInsertImage,
  handleInsertEmbed,
  handleInsertFile,
  handleInsertEmoji,
  handleInsertPageBreak,
  handleInsertTOC,
  handleInsertHR,
  handleInsertTable,
  handleInsertCodeBlock,
} = useInsertActions({
  editorContent,
  performWithSelection,
  captureSnapshot,
  showToast: showToastNotification,
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

// Export actions using composable
const {
  handleExportHtml,
  handleExportMarkdown,
  handleFormatHtml,
  handleExportPdf,
  handleExportWord,
} = useExportActions({
  editorContent,
  htmlContent,
  codeContent,
  showToast: showToastNotification,
  updateCodeContent: (content: string) => {
    codeContent.value = content;
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
      // checklist / export / settings / shortcuts have no handler yet.
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
  showToast: showToastNotification,
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

// Wrap onInput to include variable detection and wrapping
const onInput = () => {
  // Smart autocomplete (markdown shortcuts, URL/email auto-link, curly quotes,
  // "--"/"..." punctuation) — only on WYSIWYG surfaces, never in code view.
  // Runs BEFORE onInputBase so the converted DOM is what gets synced to
  // v-model. Re-entrancy is handled inside the composable (isApplying guard).
  if (viewMode.value === "editor" || viewMode.value === "split") {
    handleSmartAutocomplete();
  }

  onInputBase();

  // Detect variable syntax for autocomplete
  if (props.enableVariables) {
    detectVariableSyntax();
  }

  // Wrap variables in content
  if (variablesComposable && editorContent.value) {
    variablesComposable.wrapVariablesInContent(editorContent.value);
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

      variableAutocompletePosition.value = {
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
      };

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
  handleKeydown,
  enableSpellCheck,
  handleDocumentClick: handleGlobalDocumentClick,
  handleEscape: handleGlobalEscape,
  onSelectionChange,
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
  z-index: 9998;
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

/* Comments / Stats FABs — refined surface controls, one shared material
   (no gradient blobs). Sized as a matched pair; the icon is currentColor. */
.comments-toggle-fab,
.writing-stats-toggle-fab {
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
    border-color 0.2s ease;
  z-index: 9998;
}

.theme-dark .comments-toggle-fab,
.theme-dark .writing-stats-toggle-fab {
  box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

/* Comments = the primary action: accent icon + a quiet accent ring. */
.comments-toggle-fab {
  bottom: 28px;
  width: 56px;
  height: 56px;
  color: var(--toolbar-accent);
  border-color: var(--toolbar-accent);
}

/* Stats = secondary: a calm neutral icon until hovered. */
.writing-stats-toggle-fab {
  bottom: 96px;
  width: 52px;
  height: 52px;
  color: var(--color-text-secondary);
}

.comments-toggle-fab:hover,
.writing-stats-toggle-fab:hover {
  transform: translateY(-3px);
  background: var(--color-surface-overlay);
  color: var(--toolbar-accent);
  border-color: var(--toolbar-accent);
  box-shadow: 0 14px 34px -10px rgba(15, 23, 42, 0.26),
    0 2px 6px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.theme-dark .comments-toggle-fab:hover,
.theme-dark .writing-stats-toggle-fab:hover {
  box-shadow: 0 14px 34px -10px rgba(0, 0, 0, 0.6),
    0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.comments-toggle-fab:active,
.writing-stats-toggle-fab:active {
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
  .writing-stats-toggle-fab {
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }
  .comments-toggle-fab:hover,
  .writing-stats-toggle-fab:hover,
  .comments-toggle-fab:active,
  .writing-stats-toggle-fab:active {
    transform: none;
  }
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
    bottom: 20px;
    right: 20px;
    width: 56px;
    height: 56px;
  }
}
</style>
