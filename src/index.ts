import { App } from "vue";
import NextLevelEditor from "./components/NextLevelEditor.vue";

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

// Export variables system
export { useVariables } from "./composables/useVariables";
export type { Variable, VariableCategory } from "./composables/useVariables";
export { default as VariableAutocomplete } from "./components/VariableAutocomplete.vue";

export { NextLevelEditor };

export default {
  install: (app: App) => {
    app.component("NextLevelEditor", NextLevelEditor);
  },
};
