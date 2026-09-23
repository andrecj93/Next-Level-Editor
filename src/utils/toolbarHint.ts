import type { EditorLocaleFormatter } from '../types/locale';

/** Keep shortcut tokens separate from translated prose and host labels. */
export function toolbarHint(
  locale: Pick<EditorLocaleFormatter, 't' | 'shortcut'>,
  label: string | undefined,
  keys?: string,
  available = true,
): string {
  let hint = locale.t(label);
  if (keys) hint = locale.t('{label} ({shortcut})', { label: hint, shortcut: locale.shortcut(keys) });
  return available ? hint : locale.t('{label} (not available for current selection)', { label: hint });
}
