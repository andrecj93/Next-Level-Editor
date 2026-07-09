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
   *
   * Responsive: whenever the editor is narrower than 640px (phones, narrow
   * embeds), "comfortable" automatically behaves as "compact" so the writing
   * surface stays dominant. The prop chooses the layout at comfortable
   * widths; it does not pin the wide layout on small screens.
   */
  toolbarLayout?: "comfortable" | "compact";
  /**
   * Cinematic adaptive chrome — what the main toolbar does while you WRITE.
   *
   * - `"letterbox"` (default): after ~1s of sustained typing the toolbar's
   *   buttons dissolve into a quiet ambient band — current block format, a
   *   document-position filament, an auto-save pulse and the word count.
   *   Any pointer movement, mouse selection, `Escape` or toolbar focus
   *   brings the full toolbar back instantly.
   * - `"recede"`: the conservative variant — the toolbar simply fades to a
   *   whisper while typing (no ambient band) and returns on the same cues.
   * - `"off"`: the toolbar never changes while typing.
   *
   * Desktop-only: automatically disabled below 640px (phones have their own
   * toolbar) and honors `prefers-reduced-motion` (movement becomes plain
   * crossfades). Never returns on a mere typing pause — only on intent.
   */
  adaptiveChrome?: "letterbox" | "recede" | "off";
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
