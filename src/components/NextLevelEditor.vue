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
      :view-mode="viewMode"
      :theme="theme"
      @remember-selection="rememberSelection"
      @toggle-colors-dropdown="showColorsDropdown = !showColorsDropdown"
      @text-color-change="handleTextColor"
      @background-color-change="handleBackgroundColor"
      @undo="undo"
      @redo="redo"
      @view-mode-change="(mode) => (viewMode = mode)"
      @format-html="handleFormatHtml"
      @toggle-theme="toggleTheme"
    />

    <CommandMenu
      :show="showCommandMenu"
      :position="commandMenuPosition"
      :options="commandOptions"
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

    <!-- Context Menu -->
    <ContextMenu
      :show="showContextMenu"
      :position="contextMenuPosition"
      :items="contextMenuItems"
      @close="closeContextMenu"
    />

    <!-- Modals Container -->
    <ModalsContainer
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
      @close="showWritingStatsPanel = false"
    />

    <!-- Comments Sidebar (opt-in feature) -->
    <CommentsSidebar
      v-if="enableComments && comments"
      :threads="comments.threads.value"
      :active-thread-id="comments.activeThread.value?.id ?? null"
      :is-open="showCommentsSidebar"
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
import { ref, computed, toRef, nextTick } from "vue";

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
import { useImageResize } from "../composables/useImageResize";
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
import { useVariables } from "../composables/useVariables";

interface Props {
  modelValue?: string;
  placeholder?: string;
  width?: string;
  height?: string;
  showWritingStats?: boolean;
  enableComments?: boolean;
  enableVariables?: boolean;
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
});

const emit = defineEmits<Emits>();

const editorPanelsRef = ref<InstanceType<typeof EditorPanels> | null>(null);
const editorContent = computed(() => editorPanelsRef.value?.editorRef || null);

// Selection management using composable
const { rememberSelection: rememberSelectionBase, performWithSelection } =
  useSelection(editorContent);

// Extend rememberSelection to hide floating toolbar
const rememberSelection = () => {
  rememberSelectionBase();
  // Hide floating toolbar when interacting with main toolbar to prevent pointer event interference
  showFloatingToolbar.value = false;
};

// Theme and UI state using composable
const { theme, toggleTheme: toggleThemeComposable } = useTheme();

// Accessibility (WCAG AAA)
useAccessibility();

// Writing Assistant (opt-in feature) - local state for toggle
const showWritingStatsPanel = ref(false);
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
    console.log("Auto-saved at:", new Date().toLocaleTimeString());
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
} = useEditorContent({
  editorContent,
  modelValue: toRef(props, "modelValue"),
  onUpdate: (value) => emit("update:modelValue", value),
  triggerAutoSave,
});

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

// View mode management using composable
const { viewMode } = useViewMode({
  editorContent,
  htmlContent,
  codeContent,
});

// Split view right panel mode
const splitRightMode = ref<"preview" | "editor">("preview");

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
  applyFontSize
);

// Image resize composable
const { setupImageResizing, cleanup: cleanupImageResize } = useImageResize(
  editorContent,
  captureSnapshot
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
const { handleFind, handleReplace } = useFindReplace({
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
  toggleFullScreen,
  handleToggleSpellCheck,
  handleExportHtml,
  handleExportMarkdown,
  handleExportPdf,
  handleExportWord,
  handleCopyFormat,
  handlePasteFormat,
  hasFormatCopied,
  isFullScreen,
  spellCheckEnabled,
  captureSnapshot,
});

// Command Palette Commands using composable
const { commands: commandPaletteCommands } = useCommandPaletteCommands({
  editorContent,
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

// Command menu (Slash commands) - Using useSlashCommands composable
const {
  showCommandMenu,
  commandMenuPosition,
  commandOptions,
  openCommandMenu,
  handleCommandOption,
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
  onFocus,
  onBlur,
  onMouseUp,
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

// Wrap onInput to include variable detection and wrapping
const onInput = () => {
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

  // If split view is active with editor mode on right, sync the split editor
  if (viewMode.value === "split" && splitRightMode.value === "editor") {
    nextTick(() => {
      if (editorPanelsRef.value?.splitEditorRef && editorContent.value) {
        editorPanelsRef.value.splitEditorRef.innerHTML =
          editorContent.value.innerHTML;
      }
    });
  }
};

// Handle split view right panel mode change
function handleSplitRightModeChange(mode: "preview" | "editor") {
  splitRightMode.value = mode;
  // Sync content when switching to editor mode
  if (mode === "editor") {
    nextTick(() => {
      if (editorPanelsRef.value?.splitEditorRef && editorContent.value) {
        editorPanelsRef.value.splitEditorRef.innerHTML =
          editorContent.value.innerHTML;
      }
    });
  }
}

// Handle split editor input - sync back to main code editor
function onSplitEditorInput(event: Event) {
  const target = event.target as HTMLElement;
  if (target && codeContent.value !== target.innerHTML) {
    const newContent = target.innerHTML;
    // Update code content from split editor
    codeContent.value = formatHtml(newContent);
    // Update the main editor content
    if (editorContent.value) {
      editorContent.value.innerHTML = newContent;
      htmlContent.value = newContent;
    }
    // Capture snapshot for undo/redo
    captureSnapshot();
    // Emit the change
    emit("update:modelValue", newContent);
    triggerAutoSave(newContent);
  }
}

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
  setupImageResizing,
  cleanupImageResize,
  handleDocumentClick,
  handleEscape,
  onSelectionChange,
});
</script>

<style src="../styles/NextLevelEditor.css"></style>
<style src="../styles/editor-variables.css"></style>
<style src="../styles/gap-fallback.css"></style>

<style scoped>
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

/* Comments Toggle FAB */
.comments-toggle-fab {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 64px;
  height: 64px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 9998;
}

.comments-toggle-fab:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 16px 48px rgba(59, 130, 246, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.15) inset;
}

.comments-toggle-fab:active {
  transform: translateY(-2px) scale(0.98);
}

/* Writing Stats Toggle FAB */
.writing-stats-toggle-fab {
  position: fixed;
  bottom: 110px;
  right: 32px;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 40px rgba(16, 185, 129, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 9998;
}

.writing-stats-toggle-fab:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 16px 48px rgba(16, 185, 129, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.15) inset;
}

.writing-stats-toggle-fab:active {
  transform: translateY(-2px) scale(0.98);
}

.comments-toggle-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  background: #ef4444;
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4),
    0 0 0 3px var(--editor-bg, #ffffff);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
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
