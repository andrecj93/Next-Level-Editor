import type { EditorLocaleFormatter, EditorMessageDescriptor } from '../types/locale';

export function localizedMessage(locale: Pick<EditorLocaleFormatter, 't' | 'shortcut'>, fallback: string, message?: EditorMessageDescriptor): string {
  if (!message) return locale.t(fallback);
  const parameters = { ...message.parameters };
  for (const key of message.translatedParameters ?? []) {
    if (typeof parameters[key] === 'string') parameters[key] = locale.t(parameters[key]);
  }
  for (const key of message.shortcutParameters ?? []) {
    if (typeof parameters[key] === 'string') parameters[key] = locale.shortcut(parameters[key]);
  }
  return locale.t(message.key, parameters);
}
