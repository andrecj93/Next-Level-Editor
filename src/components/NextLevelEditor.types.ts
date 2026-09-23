import type { MentionSuggestion } from "../composables/useComments";
import type { Variable } from "../composables/useVariables";
import type { EditorPlugin } from "../types/plugin";

/**
 * Public prop contract for {@link NextLevelEditor}.
 *
 * Kept in its own module (rather than inline in `<script setup>`, which cannot
 * `export`) so the generated `.d.ts` can reference it by name instead of a
 * private local type — this is what lets `vue-tsc` emit the component's
 * declaration cleanly, and gives consumers an importable prop type.
 */
export interface NextLevelEditorProps {
  /** Durable document tools, optional adapters and document identity. */
  documentOptions?: import('../types/document').DocumentOptions;
  documentTools?: boolean;
  locale?: import('../types/document').EditorLocale;
  messages?: Record<string, string>;
  contentLanguage?: string;
  contentDirection?: 'ltr' | 'rtl' | 'auto';
  /** Structured coauthoring is opt-in. The provider must authorize document access. */
  collaboration?: import('../types/collaboration').CollaborationOptions;
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
   * The variable set the editor offers, for `enableVariables`. Supplying it
   * REPLACES the built-in demo fixtures (a real app must not ship "John Doe" in
   * its picker); the panel, the `{{` autocomplete and value substitution all
   * use it. Reactive — updating the array, or a value inside it, flows through
   * to the editor. Omit it to keep the built-in demo set.
   *
   * ```ts
   * const variables = ref<Variable[]>([
   *   { id: "user.name", name: "userName", label: "User Name", value: "Jane Smith" },
   * ]);
   * ```
   */
  variables?: Variable[];
  /**
   * Editor plugins. Each is installed with a live {@link PluginContext} (read
   * and write the document, run commands, listen to editor events), and its
   * `slashCommands` join the `/` menu while its `toolbarButtons` join the
   * toolbar's Tools menu.
   *
   * ```ts
   * import { createPlugin } from "next-level-editor";
   *
   * const wordCount = createPlugin({
   *   name: "word-count",
   *   install(ctx) { console.log(ctx.getContent().length); },
   *   slashCommands: [
   *     { id: "wc", trigger: "words", label: "Count words", execute: () => {} },
   *   ],
   * });
   * ```
   */
  plugins?: EditorPlugin[];
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

  /** Manuscript typography, a focused toolbar, chapter outline and private English writing notes. */
  writingMode?: boolean;
  /**
   * Cinematic adaptive chrome — what the main toolbar does while you WRITE.
   *
   * - `"off"` (default): a rock-solid static toolbar — it never moves,
   *   dissolves or reshuffles while you type or scroll.
   * - `"letterbox"`: after ~1s of sustained typing the toolbar's buttons
   *   dissolve into a quiet ambient band — current block format, a
   *   document-position filament, an auto-save pulse and the word count.
   *   Any pointer movement, mouse selection, `Escape` or toolbar focus
   *   brings the full toolbar back instantly.
   * - `"recede"`: the conservative variant — the toolbar simply fades to a
   *   whisper while typing (no ambient band) and returns on the same cues.
   *
   * Desktop-only: automatically disabled below 640px (phones have their own
   * toolbar) and honors `prefers-reduced-motion` (movement becomes plain
   * crossfades). Never returns on a mere typing pause — only on intent.
   */
  adaptiveChrome?: "letterbox" | "recede" | "off";
  /**
   * Where the main toolbar lives.
   *
   * - `"top"` (default): the docked masthead bar above the page.
   * - `"left"`: a slim vertical rail in the left margin — writing essentials
   *   stacked in the margin, everything else behind the rail's expand toggle.
   * - `"bottom"`: the bar docks under the page and its menus open upward —
   *   chrome leaves the reading line entirely.
   * - `"zen"`: no persistent toolbar at all — the ambient letterbox band is
   *   the only chrome; pointer intent or Escape "peeks" the full toolbar,
   *   which tucks itself away again a moment later. Pair with the selection
   *   bubble and the `/` menu for a fully focused writing surface.
   *
   * Desktop-only: every value falls back to `"top"` below 640px, where the
   * mobile toolbar owns the screen.
   */
  toolbarPosition?: "top" | "left" | "bottom" | "zen";
  /**
   * The toolbar's overall FORM.
   *
   * - `"bar"` (default): the docked masthead bar (in whatever
   *   `toolbarPosition` arrangement).
   * - `"pill"`: Playhead — one floating glass capsule replaces both the
   *   docked toolbar and the selection bubble. It contracts to an ambient
   *   lozenge (save dot + word count) while you write, expands to the
   *   writing essentials on intent, and travels to your selection to become
   *   the formatting bubble. Desktop-only: falls back to `"bar"` below
   *   640px. While active, `toolbarPosition` and `adaptiveChrome` are
   *   inert — the pill carries its own state grammar.
   */
  toolbarMode?: "bar" | "pill";
  /**
   * Make the auto-save "Saved" signal assert REAL persistence. When provided,
   * each auto-save tick awaits this handler with the current HTML; resolve
   * `false` (or throw) to surface a failed save instead of a false "Saved"
   * pulse. Saves are serialized and intermediate queued edits are coalesced.
   * Without it, the signal reads "Updated" for a `v-model` handoff; the host
   * owns persistence. A failed save exposes a Retry action using the latest HTML.
   */
  saveHandler?: (content: string) => boolean | Promise<boolean>;
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

/**
 * The events emitted by `NextLevelEditor`. Exported so consumers wiring the
 * component up in their own render functions or wrappers can type its listeners
 * (the props type, `NextLevelEditorProps`, is exported alongside it).
 */
export interface NextLevelEditorEmits {
  /** Persist this snapshot alongside HTML to retain references, review and page settings. */
  (e: 'document-change', value: import('../types/document').DocumentSnapshot): void;
  /** Fired on every content change; the payload is the sanitized HTML string. */
  (e: "update:modelValue", value: string): void;
  /** The editing surface gained focus. */
  (e: "focus"): void;
  /** The editing surface lost focus. */
  (e: "blur"): void;
}
