import { describe, expect, it } from 'vitest';
import { createEditorLocaleFormatter } from '../editorLocale';
import { englishMessages } from '../../locales/en';
import { portugueseMessages } from '../../locales/pt-PT';
import type { EditorMessages } from '../../types/locale';

describe('public locale formatting contract', () => {
  it('updates plural grammar, numeric parameters and dates when the locale changes', () => {
    let locale = 'en';
    const f = createEditorLocaleFormatter(() => locale, undefined, () => locale === 'pt-PT' ? portugueseMessages : englishMessages);
    expect(f.t('{count} words', { count: 1 })).toBe('1 word');
    expect(f.t('{count} words', { count: 12345 })).toBe('12,345 words');
    locale = 'pt-PT';
    expect(f.t('{count} words', { count: 1 })).toBe('1 palavra');
    expect(f.t('{count} words', { count: 0 })).toBe('0 palavras');
    expect(f.t('{count} characters', { count: 2 })).toBe('2 caracteres');
    expect(f.t('{count} words', { count: 12345 })).toBe(`${new Intl.NumberFormat('pt-PT').format(12345)} palavras`);
    const options: Intl.DateTimeFormatOptions = { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' };
    expect(f.date('2026-09-23T12:00:00Z', options)).toBe('23 de setembro de 2026');
    expect(f.date('invalid')).toBe('Data desconhecida');
  });

  it('honors all six host-provided Arabic forms instead of an English singular/plural switch', () => {
    const f = createEditorLocaleFormatter(() => 'ar-EG-u-nu-arab', () => ({ count: { zero: 'صفر', one: 'واحد', two: 'اثنان', few: 'قليل {count}', many: 'كثير {count}', other: 'آخر {count}' } }));
    expect([0, 1, 2, 3, 11, 100].map(count => f.t('count', { count }))).toEqual(['صفر', 'واحد', 'اثنان', 'قليل ٣', 'كثير ١١', 'آخر ١٠٠']);
  });

  it('isolates instances, preserves unknown keys and treats interpolation as text', () => {
    const f = createEditorLocaleFormatter(() => 'en', () => ({ Hello: 'Hello {name}', '{count} words': { one: 'one token', other: '{count} tokens' } }), () => englishMessages);
    const other = createEditorLocaleFormatter(() => 'pt-PT', undefined, () => portugueseMessages);
    expect(f.t('Hello', { name: '<img src=x onerror=alert(1)>' })).toBe('Hello <img src=x onerror=alert(1)>');
    expect(f.t('Hello')).toBe('Hello {name}');
    expect(f.t('{count} words', { count: 1 })).toBe('one token');
    expect(other.t('{count} words', { count: 1 })).toBe('1 palavra');
    expect(f.t('Host-specific label')).toBe('Host-specific label');
    expect(f.t(undefined)).toBe('');
    expect(f.t('toString')).toBe('toString');
  });

  it('does not throw for invalid locale IDs or malformed host messages', () => {
    const f = createEditorLocaleFormatter(() => 'not a locale', () => ({ broken: {} } as unknown as EditorMessages), () => englishMessages);
    expect(f.number(12345)).toBe('12,345');
    expect(f.t('broken')).toBe('broken');
    expect(f.direction()).toBe('ltr');
  });

  it.each([['ar', 'rtl'], ['he-IL', 'rtl'], ['pt-PT', 'ltr'], ['ar-Latn', 'ltr'], ['az-Arab', 'rtl']])('resolves %s UI direction independently from document text', (language, direction) => {
    const f = createEditorLocaleFormatter(() => language);
    expect(f.direction()).toBe(direction);
    expect(createEditorLocaleFormatter(() => language, undefined, undefined, () => 'ltr').direction()).toBe('ltr');
  });

  it('localizes shortcut hints while preserving platform modifier conventions', () => {
    const f = createEditorLocaleFormatter(() => 'pt-PT', undefined, () => portugueseMessages);
    expect(f.shortcut('Mod+Shift+ArrowRight', 'other')).toBe('Ctrl+Maiús+→');
    expect(f.shortcut('Mod+Shift+ArrowRight', 'mac')).toBe('⌘⇧→');
    expect(f.shortcut('Space', 'other')).toBe('Espaço');
  });

  it('keeps the existing English/Portuguese runtime usable when legacy Intl lacks plural rules', () => {
    const original = Object.getOwnPropertyDescriptor(Intl, 'PluralRules')!;
    try {
      Object.defineProperty(Intl, 'PluralRules', { value: undefined, configurable: true });
      const f = createEditorLocaleFormatter(() => 'pt-PT', undefined, () => portugueseMessages);
      expect(f.t('{count} words', { count: 1 })).toBe('1 palavra');
      expect(f.t('{count} words', { count: 2 })).toBe('2 palavras');
    } finally { Object.defineProperty(Intl, 'PluralRules', original); }
  });
});
