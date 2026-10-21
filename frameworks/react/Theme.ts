import { useEffect, useState } from 'react';

export type ArenaPolarity = 'dark' | 'light';

export interface ArenaPalette {
  name: string;
  polarity: ArenaPolarity;
}

export interface ArenaThemeConfig {
  palettes: ArenaPalette[];
  default?: string;
}

export const ARENA_DEFAULT_THEMES: ArenaThemeConfig = {
  palettes: [{ name: 'dark', polarity: 'dark' }, { name: 'light', polarity: 'light' }],
  default: 'dark',
};

export const arenaThemeClass = (name: string): string => `arena-${name}`;

const STORAGE_KEY = 'arena-theme';

let config: ArenaThemeConfig = ARENA_DEFAULT_THEMES;
const listeners = new Set<(name: string) => void>();
let current: string | null = null;

const names = (): string[] => config.palettes.map((p) => p.name);
const fallback = (): string => config.default ?? config.palettes[0]?.name ?? 'dark';
const declares = (name: string | null): name is string => name !== null && names().includes(name);

const root = () => (typeof document === 'undefined' ? null : document.documentElement);

function stored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function remember(name: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    return;
  }
}

function preferred(): string {
  const light = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: light)').matches;
  const match = config.palettes.find((p) => p.polarity === (light ? 'light' : 'dark'));
  return match?.name ?? fallback();
}

function apply(name: string): void {
  const element = root();
  if (!element) return;
  for (const palette of config.palettes) {
    element.classList.toggle(arenaThemeClass(palette.name), palette.name === name && name !== fallback());
  }
}

export function getArenaTheme(): string {
  if (current === null) {
    const saved = stored();
    current = declares(saved) ? saved : preferred();
  }
  return current;
}

export function setArenaTheme(name: string): string {
  if (!declares(name)) {
    throw new Error(`setArenaTheme: no palette named "${name}"; the declared palettes are ${names().join(', ')}`);
  }
  current = name;
  apply(name);
  remember(name);
  for (const listener of listeners) listener(name);
  return name;
}

export function initArenaTheme(themes: ArenaThemeConfig = ARENA_DEFAULT_THEMES): string {
  config = themes;
  current = null;
  const name = getArenaTheme();
  apply(name);
  for (const listener of listeners) listener(name);
  return name;
}

export function arenaPalettes(): ArenaPalette[] {
  return config.palettes;
}

export function toggleArenaTheme(): string {
  const all = names();
  const next = all[(all.indexOf(getArenaTheme()) + 1) % all.length];
  if (next === undefined) throw new Error('toggleArenaTheme: no palette is declared');
  return setArenaTheme(next);
}

export function useArenaTheme(): [string, (name: string) => string] {
  const [theme, setTheme] = useState(getArenaTheme);
  useEffect(() => {
    listeners.add(setTheme);
    setTheme(getArenaTheme());
    return () => { listeners.delete(setTheme); };
  }, []);
  return [theme, setArenaTheme];
}
