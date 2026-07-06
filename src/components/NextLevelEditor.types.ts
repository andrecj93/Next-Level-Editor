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
   * "compact" (a single dense icon-first row; labels move to tooltips). An
   * independent axis from `themePreset`.
   */
  toolbarLayout?: "comfortable" | "compact";
  /**
   * Host-supplied @mention provider for comments: given the text typed after
   * "@", return the users to suggest. Without it the mention dropdown stays
   * empty. [#4]
   */
  mentionSearch?: (
    query: string
  ) => Promise<MentionSuggestion[]> | MentionSuggestion[];
}
