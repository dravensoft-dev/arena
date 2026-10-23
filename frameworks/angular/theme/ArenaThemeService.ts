import { Injectable, InjectionToken, Provider, signal, effect, inject, DOCUMENT } from '@angular/core';

export type ArenaTheme = string;

export interface ArenaPalette {
  name: string;
  polarity: 'dark' | 'light';
}

export interface ArenaThemeConfig {
  palettes: ArenaPalette[];
  default?: string;
}

export const ARENA_DEFAULT_THEMES: ArenaThemeConfig = {
  palettes: [{ name: 'dark', polarity: 'dark' }, { name: 'light', polarity: 'light' }],
  default: 'dark',
};

export const ARENA_THEMES = new InjectionToken<ArenaThemeConfig>('ARENA_THEMES', {
  providedIn: 'root',
  factory: () => ARENA_DEFAULT_THEMES,
});

export function provideArenaThemes(config: ArenaThemeConfig): Provider {
  return { provide: ARENA_THEMES, useValue: config };
}

export interface ArenaRuntimePalette {
  name: string;
  polarity: 'dark' | 'light';
  properties: Record<string, string>;
}

export const arenaThemeClass = (name: string): string => `arena-${name}`;
export const arenaPolarityClass = (polarity: string): string => `arena-polarity-${polarity}`;

const STORAGE_KEY = 'arena-theme';
export const RUNTIME_CACHE_KEY = 'arena-runtime-palette';
const RUNTIME_MARKER = '--arena-runtime-palettes';
const POLARITIES = ['dark', 'light'] as const;

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function runtimeProblem(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return 'palette: not an object';
  const { name, polarity, properties } = value as Record<string, unknown>;
  if (typeof name !== 'string' || name === '') return 'palette: name is not a string';
  if (polarity !== 'dark' && polarity !== 'light') return `polarity "${String(polarity)}" is neither dark nor light`;
  if (!KEBAB.test(name)) return `${JSON.stringify(name)} is not a kebab-case name`;
  if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) return 'palette: properties is not an object';
  for (const [key, entry] of Object.entries(properties)) {
    if (typeof entry !== 'string') return `${key} is not a string`;
    if (key === '--arena-palette') {
      if (entry !== name) return `--arena-palette is "${entry}" and the palette is named "${name}"`;
    } else if (/^--color-[a-z0-9-]+$/.test(key)) {
      if (!/^#[0-9a-f]{6}$/.test(entry)) return `${key} is "${entry}", not a #rrggbb colour`;
    } else if (/^--level-[a-z0-9-]+$/.test(key)) {
      if (!/^\d{1,3}%$/.test(entry)) return `${key} is "${entry}", not a percentage such as 40%`;
    } else {
      return `"${key}" is not a property a palette carries; only --color-*, --level-* and --arena-palette are`;
    }
  }
  if ((properties as Record<string, unknown>)['--arena-palette'] === undefined) return '--arena-palette is missing; a runtime palette carries its own name';
  return null;
}

@Injectable({ providedIn: 'root' })
export class ArenaThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly config = inject(ARENA_THEMES);

  readonly palettes = this.config.palettes;
  readonly fallback = this.config.default ?? this.config.palettes[0].name;
  private readonly registered = signal<ArenaRuntimePalette[]>([]);
  readonly runtimePalettes = this.registered.asReadonly();
  readonly theme = signal<ArenaTheme>(this.initial());
  private painted: string[] = [];

  constructor() {
    effect(() => {
      const current = this.theme();
      const runtime = this.runtimePalette(current);
      const root = this.doc.documentElement;
      for (const palette of this.palettes) {
        root.classList.toggle(arenaThemeClass(palette.name), !runtime && palette.name === current && current !== this.fallback);
      }
      for (const polarity of POLARITIES) root.classList.toggle(arenaPolarityClass(polarity), runtime?.polarity === polarity);
      for (const property of this.painted) root.style.removeProperty(property);
      this.painted = [];
      for (const [property, value] of Object.entries(runtime?.properties ?? {})) {
        root.style.setProperty(property, value);
        this.painted.push(property);
      }
    });
  }

  register(palette: ArenaRuntimePalette): void {
    const name = (palette as { name?: unknown } | null)?.name;
    if (typeof name === 'string' && this.declares(name)) {
      throw new Error(`ArenaThemeService.register: no palette named "${name}" can be registered, because the theme config declares it; the declared palettes are ${this.declaredNames().join(', ')}`);
    }
    const window = this.doc.defaultView;
    if (window && window.getComputedStyle(this.doc.documentElement).getPropertyValue(RUNTIME_MARKER).trim() !== '1') {
      throw new Error('ArenaThemeService.register: this page\'s stylesheet was built without "runtimePalettes": true in arena.config.json, so no runtime palette can paint here');
    }
    const problem = runtimeProblem(palette);
    if (problem) throw new Error(`ArenaThemeService.register: ${problem}`);
    this.store(palette);
    if (this.theme() === palette.name) this.remember(palette);
  }

  runtimePalette(name: string): ArenaRuntimePalette | null {
    return this.registered().find((p) => p.name === name) ?? null;
  }

  set(theme: ArenaTheme): void {
    if (!this.declares(theme) && !this.runtimePalette(theme)) {
      const runtime = this.registered().map((p) => p.name);
      const registered = runtime.length ? `; the registered palettes are ${runtime.join(', ')}` : '';
      throw new Error(`ArenaThemeService: no palette named "${theme}"; the declared palettes are ${this.declaredNames().join(', ')}${registered}`);
    }
    this.choose(theme);
  }

  toggle(): void {
    const names = this.names();
    const at = names.indexOf(this.theme());
    this.choose(names[(at + 1) % names.length]);
  }

  polarityOf(theme: ArenaTheme): 'dark' | 'light' | null {
    return this.palettes.find((p) => p.name === theme)?.polarity ?? this.runtimePalette(theme)?.polarity ?? null;
  }

  private choose(theme: ArenaTheme): void {
    this.theme.set(theme);
    const storage = this.doc.defaultView?.localStorage;
    storage?.setItem(STORAGE_KEY, theme);
    const runtime = this.runtimePalette(theme);
    if (runtime) this.remember(runtime);
    else storage?.removeItem(RUNTIME_CACHE_KEY);
  }

  private store(palette: ArenaRuntimePalette): void {
    const copy = { name: palette.name, polarity: palette.polarity, properties: { ...palette.properties } };
    this.registered.update((all) => (all.some((p) => p.name === copy.name)
      ? all.map((p) => (p.name === copy.name ? copy : p))
      : [...all, copy]));
  }

  private remember(palette: ArenaRuntimePalette): void {
    this.doc.defaultView?.localStorage?.setItem(RUNTIME_CACHE_KEY, JSON.stringify(this.runtimePalette(palette.name)));
  }

  private declaredNames(): string[] {
    return this.palettes.map((p) => p.name);
  }

  private names(): string[] {
    return [...this.declaredNames(), ...this.registered().map((p) => p.name)];
  }

  private declares(theme: ArenaTheme): boolean {
    return this.declaredNames().includes(theme);
  }

  private restored(name: string): boolean {
    let cached: unknown;
    try {
      cached = JSON.parse(this.doc.defaultView?.localStorage?.getItem(RUNTIME_CACHE_KEY) ?? 'null');
    } catch {
      return false;
    }
    if (runtimeProblem(cached) !== null || (cached as ArenaRuntimePalette).name !== name) return false;
    this.store(cached as ArenaRuntimePalette);
    return true;
  }

  private initial(): ArenaTheme {
    const stored = this.doc.defaultView?.localStorage?.getItem(STORAGE_KEY);
    if (stored && (this.declares(stored) || this.restored(stored))) return stored;
    const prefersLight = this.doc.defaultView?.matchMedia('(prefers-color-scheme: light)').matches;
    const preferred = this.palettes.find((p) => p.polarity === (prefersLight ? 'light' : 'dark'));
    return preferred?.name ?? this.fallback;
  }
}
