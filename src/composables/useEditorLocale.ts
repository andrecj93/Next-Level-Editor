import { computed, inject, onScopeDispose, provide, watch, type ComputedRef, type InjectionKey } from 'vue';
import { portugueseMessages } from '../locales/pt-PT';
import { englishMessages } from '../locales/en';
import { createEditorLocaleFormatter } from '../utils/editorLocale';
import type { EditorLocaleFormatter, EditorMessages, EditorUiDirection } from '../types/locale';
import type { DocumentOptions } from '../types/document';
import { diagnostic } from '../utils/documentDiagnostics';
export interface LocaleContext extends Omit<EditorLocaleFormatter, 'direction'> {
  locale: ComputedRef<string>;
  direction: ComputedRef<'ltr' | 'rtl'>;
}
const key: InjectionKey<LocaleContext> = Symbol('nle-locale');
export function provideEditorLocale(
  locale: () => string,
  messages: () => EditorMessages = () => ({}),
  direction: () => EditorUiDirection = () => 'auto',
  options: () => Pick<DocumentOptions, 'id' | 'onDiagnostic'> | undefined = () => undefined,
): LocaleContext {
  const selected = computed(locale);
  const formatter = createEditorLocaleFormatter(
    () => selected.value, messages,
    () => formatter.language().toLowerCase().startsWith('pt') ? portugueseMessages : englishMessages,
    direction,
  );
  const missing = new Set<string>();
  let capped = false;
  let pending = false;
  let active = true;
  let generation = 0;
  function report(event: string, reason?: string) {
    const config = options();
    diagnostic(config?.onDiagnostic, event, config?.id, {
      locale: formatter.language().split(/-x-/i)[0].slice(0, 64),
      direction: formatter.direction(),
      customMessages: Object.keys(messages()).length,
      missingKeys: missing.size,
      missingKeysCapped: capped,
      ...(reason ? { reason } : {}),
    });
  }
  function trackMissing(message: string | undefined) {
    const language = formatter.language().toLowerCase();
    if (!message || language.startsWith('en')) return;
    const defaults = language.startsWith('pt') ? portugueseMessages : englishMessages;
    if (Object.prototype.hasOwnProperty.call(messages(), message) || Object.prototype.hasOwnProperty.call(defaults, message) || missing.has(message)) return;
    // Never retain unbounded host text or include a message/key in diagnostics.
    if (missing.size >= 256 || message.length > 512) { if (capped) return; capped = true; }
    else missing.add(message);
    if (pending) return;
    pending = true;
    const current = generation;
    queueMicrotask(() => {
      if (!active || current !== generation) return;
      pending = false;
      report('locale.failed', 'missing_messages');
    });
  }
  const context: LocaleContext = {
    ...formatter,
    t(message, parameters) { trackMissing(message); return formatter.t(message, parameters); },
    locale: computed(formatter.language),
    direction: computed(formatter.direction),
  };
  provide(key, context);
  onScopeDispose(() => { active = false; });
  watch(selected, value => {
    generation++;
    missing.clear();
    capped = false;
    pending = false;
    let valid = true;
    try { Intl.getCanonicalLocales(value); } catch { valid = false; }
    report(valid ? 'locale.loaded' : 'locale.failed', valid ? undefined : 'invalid_locale');
  }, { immediate: true });
  return context;
}
export function useEditorLocale(): LocaleContext {
  const fallback = createEditorLocaleFormatter(() => 'en', undefined, () => englishMessages);
  return inject(key, {
    ...fallback,
    locale: computed(() => 'en'),
    direction: computed(fallback.direction),
  });
}
export { portugueseMessages } from '../locales/pt-PT';
