/** A catalog may override a single label or every grammatical plural form. */
export type EditorPluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
export type EditorMessage = string | EditorPluralMessage;
export type EditorMessages = Readonly<Record<string, EditorMessage>>;
export type EditorMessageParameters = Readonly<Record<string, string | number>>;
export type EditorUiDirection = 'ltr' | 'rtl' | 'auto';

export interface EditorLocaleFormatter {
  /** Canonical UI locale, falling back to English for malformed language tags. */
  language: () => string;
  /** Interpolate named parameters; numeric count selects the catalog's plural form. */
  t: (message: string | undefined, parameters?: EditorMessageParameters) => string;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  date: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  /** A display label only. Command registration continues to use canonical key names. */
  shortcut: (keys: string, platform?: 'mac' | 'other') => string;
  direction: () => 'ltr' | 'rtl';
}
