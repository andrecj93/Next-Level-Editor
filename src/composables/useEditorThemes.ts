/**
 * Built-in whole-editor theme presets.
 *
 * A theme is a pure set of design-token overrides living in one file under
 * `src/styles/themes/`. It applies to the toolbar, menus, panels, FABs and the
 * editing surface, and composes with the light/dark toggle — every theme ships
 * BOTH modes.
 *
 * To add a theme: copy `src/styles/themes/_TEMPLATE.css`, retint it, `@import`
 * it from `NextLevelEditor.css`, then add one entry to {@link AVAILABLE_THEMES}
 * below. Select it with `<NextLevelEditor theme-preset="your-id" />`.
 */

export interface EditorThemeMeta {
  /** kebab-case id; matches the `.nle-theme-<id>` class and the css filename. */
  id: string;
  /** Short label for pickers. */
  label: string;
  /** One-line description of the mood. */
  description: string;
}

export const AVAILABLE_THEMES: readonly EditorThemeMeta[] = [
  {
    id: "default",
    label: "Default",
    description: "The signature neutral blue.",
  },
  {
    id: "classic",
    label: "Classic",
    description: "Microsoft Word — professional, confident blue.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Google Docs — airy and understated.",
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Premium dark, electric azure.",
  },
  {
    id: "warm",
    label: "Warm",
    description: "Editorial sepia, terracotta accent.",
  },
] as const;

export type EditorThemePreset = (typeof AVAILABLE_THEMES)[number]["id"] | string;

/**
 * Resolve a preset id to the root class the editor should carry. "default"
 * (or an unknown/empty value) yields no class, so the base tokens apply.
 */
export function editorThemeClass(preset?: string): string {
  if (!preset || preset === "default") return "";
  return `nle-theme-${preset}`;
}

export function useEditorThemes() {
  return { themes: AVAILABLE_THEMES, editorThemeClass };
}
