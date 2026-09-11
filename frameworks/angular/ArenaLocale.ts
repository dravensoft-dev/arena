import { InjectionToken, type Provider } from '@angular/core';
import type { ArenaLocale } from './Api.generated';
import { ARENA_DEFAULT_LOCALE } from './LocaleDefaults.generated';

export { ARENA_DEFAULT_LOCALE };

export function arenaMergeLocale(base: ArenaLocale, value: Partial<ArenaLocale>): ArenaLocale {
  const merged: Record<string, string> = { ...base };
  for (const [key, text] of Object.entries(value)) {
    if (typeof text === 'string') merged[key] = text;
  }
  return merged as unknown as ArenaLocale;
}

export const ARENA_LOCALE = new InjectionToken<ArenaLocale>('ARENA_LOCALE', {
  providedIn: 'root',
  factory: () => ARENA_DEFAULT_LOCALE,
});

export function provideArenaLocale(locale: Partial<ArenaLocale>): Provider {
  return { provide: ARENA_LOCALE, useValue: arenaMergeLocale(ARENA_DEFAULT_LOCALE, locale) };
}
