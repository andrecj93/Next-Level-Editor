import type { EditorLocaleFormatter, EditorMessage, EditorMessages, EditorMessageParameters, EditorUiDirection } from '../types/locale';

const owns = (object: object, property: string) => Object.prototype.hasOwnProperty.call(object, property);
const rtlLanguages = new Set(['ar', 'arc', 'ckb', 'dv', 'fa', 'he', 'iw', 'ks', 'ku', 'nqo', 'ps', 'sd', 'syr', 'ug', 'ur', 'yi']);
const rtlScripts = new Set(['Arab', 'Hebr', 'Thaa', 'Nkoo', 'Syrc', 'Adlm', 'Rohg']);

/** Does not depend on Vue, DOM APIs, browser globals or the editor bundle. */
export function createEditorLocaleFormatter(
  locale: () => string,
  messages: () => EditorMessages = () => ({}),
  fallback: () => EditorMessages = () => ({}),
  uiDirection: () => EditorUiDirection = () => 'auto',
): EditorLocaleFormatter {
  let requested: string | undefined;
  let language = 'en';
  let numbers = new Intl.NumberFormat(language);
  const pluralRules = () => typeof Intl.PluralRules === 'function' ? new Intl.PluralRules(language) : undefined;
  let plurals = pluralRules();
  function resolve() {
    const next = locale();
    if (next !== requested) {
      requested = next;
      try {
        language = Intl.getCanonicalLocales(next)[0] || 'en';
        numbers = new Intl.NumberFormat(language);
        plurals = pluralRules();
      } catch {
        language = 'en';
        numbers = new Intl.NumberFormat(language);
        plurals = pluralRules();
      }
    }
    return language;
  }
  function message(key: string): EditorMessage {
    const custom = messages();
    const defaults = fallback();
    const value = owns(custom, key) ? custom[key] : owns(defaults, key) ? defaults[key] : key;
    return typeof value === 'string' || (value && typeof value.other === 'string') ? value : key;
  }
  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => {
    resolve();
    return options ? new Intl.NumberFormat(language, options).format(value) : numbers.format(value);
  };
  const t = (key: string | undefined, parameters: EditorMessageParameters = {}) => {
    resolve();
    const translation = message(key ?? '');
    const count = parameters.count;
    const category = typeof count === 'number' && Number.isFinite(count) ? plurals?.select(count) ?? (count === 1 ? 'one' : 'other') : 'other';
    const template = typeof translation === 'string' ? translation : translation[category] ?? translation.other;
    return template.replace(/\{([A-Za-z][\w]*)\}/g, (token, name: string) => {
      if (!owns(parameters, name)) return token;
      const value = parameters[name];
      return typeof value === 'number' ? formatNumber(value) : value;
    });
  };
  return {
    language: resolve,
    t,
    number: formatNumber,
    date(value, options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) {
      const date = value instanceof Date ? value : new Date(value);
      if (!Number.isFinite(date.getTime())) return t('Unknown date');
      return new Intl.DateTimeFormat(resolve(), options).format(date);
    },
    direction() {
      const explicit = uiDirection();
      if (explicit !== 'auto') return explicit;
      const parts = resolve().split('-');
      const script = parts.find(part => /^[A-Z][a-z]{3}$/.test(part));
      // An explicit script overrides the language (for example ar-Latn).
      return (script ? rtlScripts.has(script) : rtlLanguages.has(parts[0])) ? 'rtl' : 'ltr';
    },
    shortcut(keys, platform) {
      const mac = platform === 'mac' || (!platform && typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform));
      // Legacy registry bindings use Ctrl as the platform modifier; Control
      // remains available when a host means the physical Control key on macOS.
      const labels: Record<string, string> = { mod: mac ? '⌘' : 'Ctrl', controlormeta: mac ? '⌘' : 'Ctrl', ctrl: mac ? '⌘' : 'Ctrl', meta: '⌘', cmd: '⌘', command: '⌘', control: 'Ctrl', alt: mac ? '⌥' : 'Alt', shift: mac ? '⇧' : 'Shift', enter: 'Enter', escape: 'Esc', esc: 'Esc', tab: 'Tab', space: 'Space', backspace: 'Backspace', delete: 'Delete', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→' };
      Object.assign(labels, { home: 'Home', end: 'End', pageup: 'PageUp', pagedown: 'PageDown' });
      const parts = keys.split('+');
      if (keys.endsWith('++')) parts.splice(-2, 2, '+');
      return parts.map(part => {
        const key = part.trim();
        return t(labels[key.toLowerCase()] ?? (/^[a-z]$/i.test(key) ? key.toUpperCase() : key));
      }).join(mac ? '' : '+');
    },
  };
}
