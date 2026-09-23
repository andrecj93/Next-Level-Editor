import { App } from "vue";
import NextLevelEditor from "./components/NextLevelEditor.vue";

// `globalThis` is referenced throughout the editor but only exists in
// Safari/iOS 12.1+, while the build's browserslist targets Safari/iOS >= 12.
// Close that 12.0-12.1 sliver from the library entry so the bare `globalThis`
// identifier resolves everywhere (guarded typeof never throws on the missing
// global; the editor is browser-only, so `window` is always present here).
// ES module imports are hoisted, so this still runs before any editor code that
// reads globalThis at call time.
if (typeof globalThis === "undefined" && typeof window !== "undefined") {
  (window as unknown as { globalThis: unknown }).globalThis = window;
}

// Export utility functions
export {
  formatHtml,
  htmlToMarkdown,
  exportAsHtml,
  exportAsMarkdown,
} from "./utils/export";
export {
  copyFormat,
  pasteFormat,
  hasFormatCopied,
  clearCopiedFormat,
} from "./utils/formatPainter";
export {
  getTemplates,
  getTemplatesByCategory,
  getTemplateById,
  type Template,
} from "./utils/templates";
export {
  insertPageBreak,
  insertTableOfContents,
  generateTableOfContents,
} from "./utils/pageManagement";
export {
  toggleSpellCheck,
  enableSpellCheck,
  disableSpellCheck,
  getSuggestion,
} from "./utils/spellChecker";

// Export accessibility composables and components
export { useAccessibility } from "./composables/useAccessibility";
export type {
  AriaLive,
  FocusTrapOptions,
  AnnouncementOptions,
  NavigationDirection,
} from "./composables/useAccessibility";
export { default as AriaLiveRegion } from "./components/AriaLiveRegion.vue";
export { default as SkipLinks } from "./components/SkipLinks.vue";
export { default as LandmarkRegion } from "./components/LandmarkRegion.vue";

// Editor theme presets (whole-editor token skins)
export {
  useEditorThemes,
  AVAILABLE_THEMES,
  editorThemeClass,
} from "./composables/useEditorThemes";
export type {
  EditorThemeMeta,
  EditorThemePreset,
} from "./composables/useEditorThemes";

// Export mobile/touch composables
export { useMobileGestures } from "./composables/useMobileGestures";
export { useDeviceDetection } from "./composables/useDeviceDetection";
export { default as MobileToolbar } from "./components/MobileToolbar.vue";

// Export smart autocomplete
export { useSmartAutocomplete } from "./composables/useSmartAutocomplete";
export { default as AutocompleteDropdown } from "./components/AutocompleteDropdown.vue";

// Export writing assistant
export { useWritingAssistant } from "./composables/useWritingAssistant";
export type {
  TextStats,
  ReadabilityScores,
  SentenceAnalysis,
  WordAnalysis,
  WritingIssues,
  SEOAnalysis,
  WritingAssistantOptions,
} from "./composables/useWritingAssistant";
export { default as WritingStatsPanel } from "./components/WritingStatsPanel.vue";

// Export comments system
export { useComments } from "./composables/useComments";
export type {
  CommentThread,
  Comment,
  CommentAuthor,
  SerializedRange,
  MentionSuggestion,
  UseCommentsOptions,
} from "./composables/useComments";
export { default as CommentsSidebar } from "./components/CommentsSidebar.vue";
export { default as CommentThreadCard } from "./components/CommentThreadCard.vue";
export { default as CommentReplyForm } from "./components/CommentReplyForm.vue";
export { default as CommentModal } from "./components/CommentModal.vue";

// Export variables system
export { usePlugin, createPlugin } from "./composables/usePlugin";
export type {
  EditorPlugin,
  PluginContext,
  ToolbarButton,
  EditorCommand,
  SlashCommand,
} from "./types/plugin";
export { useVariables } from "./composables/useVariables";
export type {
  Variable,
  VariableCategory,
  UseVariablesOptions,
} from "./composables/useVariables";
export { default as VariableAutocomplete } from "./components/VariableAutocomplete.vue";

export { NextLevelEditor };
export type {
  NextLevelEditorProps,
  NextLevelEditorEmits,
} from "./components/NextLevelEditor.types";

export default {
  install: (app: App) => {
    app.component("NextLevelEditor", NextLevelEditor);
  },
};

export type * from './types/document';
export type * from './types/collaboration';
export { defaultDocumentMetadata, defaultPageSettings } from './types/document';
export { createIndexedDbVersionStore, createMemoryVersionStore, RevisionConflictError } from './utils/versionStore';
export { createMemoryCollaborationProvider } from './utils/memoryCollaboration';
export { createWebSocketCollaborationProvider } from './utils/webSocketCollaboration';
export { createSemanticPdf } from './utils/semanticPdf';
export { importDocx } from './utils/docxImport';
export { renderDocumentTemplate } from './utils/documentTemplates';
export { portugueseMessages } from './composables/useEditorLocale';
export { loadCitationFormatter } from './utils/citationFormatter';
