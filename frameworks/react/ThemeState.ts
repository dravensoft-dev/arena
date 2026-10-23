import { useSyncExternalStore } from 'react';
import type { ArenaPolarity, ArenaPalette, ArenaRuntimePalette, ArenaThemeConfig } from './Theme.ts';

export const DEFAULT_THEMES: ArenaThemeConfig = {
  palettes: [{ name: 'dark', polarity: 'dark' }, { name: 'light', polarity: 'light' }],
  default: 'dark',
};

export const fallback = (): string => state.config.default ?? state.config.palettes[0]?.name ?? 'dark';

export const POLARITIES: ArenaPolarity[] = ['dark', 'light'];
export const polarityClass = (polarity: ArenaPolarity): string => `arena-polarity-${polarity}`;

export const state = {
  config: DEFAULT_THEMES,
  current: null as string | null,
  initialised: false,
  registered: new Map<string, ArenaRuntimePalette>(),
  all: null as ArenaPalette[] | null,
  held: [] as string[],
  listeners: new Set<(name: string) => void>(),
};

export function subscribe(listener: () => void): () => void {
  state.listeners.add(listener);
  return () => { state.listeners.delete(listener); };
}

export function unknownPalette(name: string): string {
  const added = [...state.registered.keys()];
  const declared = state.config.palettes.map((p) => p.name).join(', ');
  return `no palette named "${name}"; the declared palettes are ${declared}${added.length > 0 ? `; the registered palettes are ${added.join(', ')}` : ''}`;
}

export function useRegisteredArenaPalette(name: string): ArenaRuntimePalette | undefined {
  return useSyncExternalStore(subscribe, () => state.registered.get(name), () => undefined);
}

export function useArenaThemeReady(): boolean {
  return useSyncExternalStore(subscribe, () => state.initialised, () => false);
}

export function resetArenaTheme(): void {
  const element = typeof document === 'undefined' ? null : document.documentElement;
  if (element) {
    for (const key of state.held) element.style.removeProperty(key);
    for (const polarity of POLARITIES) element.classList.remove(polarityClass(polarity));
  }
  state.held = [];
  state.config = DEFAULT_THEMES;
  state.current = null;
  state.initialised = false;
  state.registered.clear();
  state.all = null;
  for (const listener of state.listeners) listener(fallback());
}
