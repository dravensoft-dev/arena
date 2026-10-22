import { useSyncExternalStore } from 'react';

export type ArenaPolarity = 'dark' | 'light';

export interface ArenaPalette {
  name: string;
  polarity: ArenaPolarity;
}

export interface ArenaRuntimePalette {
  name: string;
  polarity: ArenaPolarity;
  properties: Record<string, string>;
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
export const RUNTIME_CACHE_KEY = 'arena-runtime-palette';
const RUNTIME_MARKER = '--arena-runtime-palettes';
const POLARITIES: ArenaPolarity[] = ['dark', 'light'];

let config: ArenaThemeConfig = ARENA_DEFAULT_THEMES;
const listeners = new Set<(name: string) => void>();
let current: string | null = null;
let initialised = false;
const registered = new Map<string, ArenaRuntimePalette>();
let all: ArenaPalette[] | null = null;
let held: string[] = [];

const names = (): string[] => config.palettes.map((p) => p.name);
const fallback = (): string => config.default ?? config.palettes[0]?.name ?? 'dark';
const declares = (name: string | null): name is string => name !== null && names().includes(name);
const knows = (name: string | null): name is string => declares(name) || (name !== null && registered.has(name));
const polarityClass = (polarity: ArenaPolarity): string => `arena-polarity-${polarity}`;

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

function cache(palette: ArenaRuntimePalette | undefined): void {
  try {
    if (palette) window.localStorage.setItem(RUNTIME_CACHE_KEY, JSON.stringify(palette));
    else window.localStorage.removeItem(RUNTIME_CACHE_KEY);
  } catch {
    return;
  }
}

function shapeProblem(palette: ArenaRuntimePalette): string | null {
  if (!POLARITIES.includes(palette.polarity)) return `polarity "${String(palette.polarity)}" is neither dark nor light`;
  for (const [key, value] of Object.entries(palette.properties)) {
    if (key === '--arena-palette') {
      if (value !== palette.name) return `${key} is "${String(value)}" and the palette is named "${palette.name}"`;
    } else if (!/^--(color|level)-[a-z0-9-]+$/.test(key)) {
      return `"${key}" is not a property a palette carries; only --color-*, --level-* and --arena-palette are`;
    } else if (key.startsWith('--color-') && !/^#[0-9a-f]{6}$/.test(String(value))) {
      return `${key} is "${String(value)}", not a #rrggbb colour`;
    } else if (key.startsWith('--level-') && !/^\d{1,3}%$/.test(String(value))) {
      return `${key} is "${String(value)}", not a percentage such as 40%`;
    }
  }
  return null;
}

const isCache = (v: unknown): v is ArenaRuntimePalette => {
  if (v === null || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const p = o.properties;
  return typeof o.name === 'string' && typeof o.polarity === 'string'
    && p !== null && typeof p === 'object' && !Array.isArray(p);
};

function restored(name: string): ArenaRuntimePalette | null {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RUNTIME_CACHE_KEY) ?? 'null');
    if (!isCache(parsed) || parsed.name !== name || shapeProblem(parsed) !== null) return null;
    return parsed;
  } catch {
    return null;
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
  for (const key of held) element.style.removeProperty(key);
  held = [];
  const runtime = registered.get(name);
  for (const palette of config.palettes) {
    element.classList.toggle(arenaThemeClass(palette.name), !runtime && palette.name === name && name !== fallback());
  }
  for (const polarity of POLARITIES) {
    element.classList.toggle(polarityClass(polarity), runtime?.polarity === polarity);
  }
  if (!runtime) return;
  for (const [key, value] of Object.entries(runtime.properties)) {
    element.style.setProperty(key, value);
    held.push(key);
  }
}

export function getArenaTheme(): string {
  if (current === null) {
    const saved = stored();
    if (saved !== null && !knows(saved)) {
      const palette = restored(saved);
      if (palette !== null) {
        registered.set(saved, palette);
        all = null;
      }
    }
    current = knows(saved) ? saved : preferred();
  }
  return current;
}

export function setArenaTheme(name: string): string {
  if (!knows(name)) {
    throw new Error(`setArenaTheme: no palette named "${name}"; the declared palettes are ${names().join(', ')}`);
  }
  current = name;
  apply(name);
  remember(name);
  cache(registered.get(name));
  for (const listener of listeners) listener(name);
  return name;
}

export function registerArenaPalette(palette: ArenaRuntimePalette): string {
  const { name } = palette;
  if (declares(name)) {
    throw new Error(`registerArenaPalette: no palette named "${name}" can be registered, because the theme config declares it; the declared palettes are ${names().join(', ')}`);
  }
  const element = root();
  if (element && getComputedStyle(element).getPropertyValue(RUNTIME_MARKER).trim() !== '1') {
    throw new Error('registerArenaPalette: this page\'s stylesheet was built without "runtimePalettes": true in arena.config.json, so no runtime palette can paint here');
  }
  const problem = shapeProblem(palette);
  if (problem !== null) throw new Error(`registerArenaPalette: ${problem}`);
  registered.set(name, { name, polarity: palette.polarity, properties: { ...palette.properties } });
  all = null;
  if (current === name) {
    apply(name);
    cache(registered.get(name));
  }
  for (const listener of listeners) listener(getArenaTheme());
  return name;
}

export function initArenaTheme(themes: ArenaThemeConfig = ARENA_DEFAULT_THEMES): string {
  config = themes;
  current = null;
  initialised = true;
  for (const name of registered.keys()) if (declares(name)) registered.delete(name);
  all = null;
  const name = getArenaTheme();
  apply(name);
  for (const listener of listeners) listener(name);
  return name;
}

export function resetArenaTheme(): void {
  const element = root();
  if (element) {
    for (const key of held) element.style.removeProperty(key);
    for (const polarity of POLARITIES) element.classList.remove(polarityClass(polarity));
  }
  held = [];
  config = ARENA_DEFAULT_THEMES;
  current = null;
  initialised = false;
  registered.clear();
  all = null;
  for (const listener of listeners) listener(fallback());
}

export function arenaPalettes(): ArenaPalette[] {
  all ??= [
    ...config.palettes,
    ...[...registered.values()].map((p): ArenaPalette => ({ name: p.name, polarity: p.polarity })),
  ];
  return all;
}

export function registeredArenaPalette(name: string): ArenaRuntimePalette | undefined {
  return registered.get(name);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useArenaPalettes(): ArenaPalette[] {
  return useSyncExternalStore(subscribe, arenaPalettes, arenaPalettes);
}

export function toggleArenaTheme(): string {
  const declared = names();
  const next = declared[(declared.indexOf(getArenaTheme()) + 1) % declared.length];
  if (next === undefined) throw new Error('toggleArenaTheme: no palette is declared');
  return setArenaTheme(next);
}

export function useArenaThemeReady(): boolean {
  return useSyncExternalStore(subscribe, () => initialised, () => initialised);
}

export function useArenaTheme(): [string, (name: string) => string] {
  const theme = useSyncExternalStore(subscribe, getArenaTheme, fallback);
  return [theme, setArenaTheme];
}
