import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react';
import type { ArenaLocale } from './Api.generated';
import { ARENA_DEFAULT_LOCALE } from './LocaleDefaults.generated.ts';

export { ARENA_DEFAULT_LOCALE };

export function arenaMergeLocale(base: ArenaLocale, value: Partial<ArenaLocale>): ArenaLocale {
  const merged: Record<string, string> = { ...base };
  for (const [key, text] of Object.entries(value)) {
    if (typeof text === 'string') merged[key] = text;
  }
  return merged as unknown as ArenaLocale;
}

const ArenaLocaleContext = createContext<ArenaLocale>(ARENA_DEFAULT_LOCALE);

export interface ArenaLocaleProviderProps {
  value: Partial<ArenaLocale>;
  children?: ReactNode;
}

export function ArenaLocaleProvider({ value, children }: ArenaLocaleProviderProps) {
  const merged = useMemo(() => arenaMergeLocale(ARENA_DEFAULT_LOCALE, value), [value]);
  return createElement(ArenaLocaleContext.Provider, { value: merged }, children);
}

export function useArenaLocale(): ArenaLocale {
  return useContext(ArenaLocaleContext);
}
