import type { MentionSuggestion } from "../composables/useComments";

/**
 * Public prop contract for {@link NextLevelEditor}.
 *
 * Kept in its own module (rather than inline in `<script setup>`, which cannot
 * `export`) so the generated `.d.ts` can reference it by name instead of a
 * private local type — this is what lets `vue-tsc` emit the component's
 * declaration cleanly, and gives consumers an importable prop type.
 */
export interface NextLevelEditorProps {
  /** The editor's HTML content (v-model). */
  modelValue?: string;
  placeholder?: string;
  /** Editor width (any CSS length). */
  width?: string;
  /** Editor height (any CSS length). */
  height?: string;
  /** Enable the live writing-stats panel. */
  showWritingStats?: boolean;
  /** Enable inline comment threads and @mentions. */
  enableComments?: boolean;
  /** Enable `{{ variable }}` template tokens. */
  enableVariables?: boolean;
  /**
   * Whole-editor theme preset: "classic" | "minimal" | "midnight" | "warm"
   * (or "default"). Skins the toolbar, menus, panels and editing surface via
   * token overrides, and composes with the light/dark toggle.
   */
  themePreset?: string;
  /**
   * Toolbar density/layout: "comfortable" (default, labelled two-row) or
   * "compact" (a mini formatting-essentials row with an expand toggle that
   * reveals the full toolbar). An independent axis from `themePreset`.
   */
  toolbarLayout?: "comfortable" | "compact";
  /**
   * Read-only / viewer mode. The content is displayed and selectable but not
   * editable: the main, selection and mobile toolbars are hidden, slash and
   * paste handling are inert, and `v-model` still reflects the (unchanging)
   * HTML. Use it to render saved documents. Default `false`.
   */
  readonly?: boolean;
  /**
   * Show the main toolbar (the persistent bar at the top of the editor).
   * Set `false` for a headless editor driven entirely by your own UI,
   * keyboard shortcuts and the selection toolbar. Default `true`.
   */
  showToolbar?: boolean;
  /**
   * Which view the editor opens in: "editor" (WYSIWYG, default), "code" (raw
   * HTML), "split" (both) or "preview" (rendered, read-only).
   */
  defaultViewMode?: "editor" | "code" | "split" | "preview";
  /**
   * Focus the editing surface on mount so the user can type immediately.
   * Ignored in `readonly` mode. Default `false`.
   */
  autofocus?: boolean;
  /**
   * Host-supplied @mention provider for comments: given the text typed after
   * "@", return the users to suggest. Without it the mention dropdown stays
   * empty. [#4]
   */
  mentionSearch?: (
    query: string
  ) => Promise<MentionSuggestion[]> | MentionSuggestion[];
}
