<template>
  <div
    :class="['next-level-editor', themeClass, { fullscreen: isFullScreen }]"
    :style="editorStyles"
  >
    <!-- Accessibility: Skip Links -->
    <SkipLinks />

    <!-- Accessibility: ARIA Live Regions -->
    <AriaLiveRegion />

    <!-- Context Hints (Smart Toolbar Feature) -->
    <div
      v-if="getContextHints().length > 0"
      class="context-hints"
    >
      <span
        v-for="(hint, index) in getContextHints()"
        :key="index"
        class="context-hint"
      >
        💡 {{ hint }}
      </span>
    </div>

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
      @input="onInput"
      @blur="onBlur"
      @focus="onFocus"
      @mouseup="onMouseUp"
      @contextmenu="handleContextMenu"
      @code-input="onCodeInput"
      @code-blur="onCodeBlur"
    />

    <!-- Word Count Footer -->
    <EditorFooter
      :word-count="wordCount"
      :character-count="characterCount"
    />

    <!-- Floating Toolbar -->
    <FloatingToolbar
      :show="showFloatingToolbar"
      :actions="floatingActions"
    />

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
      v-if="showWritingStats && writingAssistant"
      :stats="writingAssistant.stats.value"
      :readability="writingAssistant.readability.value"
      :sentence-analysis="writingAssistant.sentenceAnalysis.value"
      :word-analysis="writingAssistant.wordAnalysis.value"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef } from "vue";

import {
  applyTextAlignment,
  applyTextColor,
  applyBackgroundColor,
  applyFontSize,
} from "../utils/commands";
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

// Writing Assistant (opt-in feature)
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
  : null;

// Comments UI state
const showCommentsSidebar = ref(props.enableComments ?? false);

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
  getContextHints,
} = useSmartToolbar();

// View mode management using composable
const { viewMode } = useViewMode({
  editorContent,
  htmlContent,
  codeContent,
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
  onCodeInput,
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
};

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
  const thread = comments.threads.value.find((t) => t.id === threadId);
  if (thread?.highlightElement) {
    thread.highlightElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
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
  comments.addReply(threadId, content, mentions);
}

function handleCreateComment() {
  if (!comments) return;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    showToastNotification("Please select text to comment on", "error");
    return;
  }

  const content = prompt("Enter your comment:");
  if (content) {
    comments.addThread(content, []);
    showToastNotification("Comment added", "success");
  }
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
