/* What a package carries beside the command and what a consumer's style plugins add to it: the names
 * of the sheets the command writes, the catalogue, the icon list and the component map read from
 * beside it, and the plugin sheet's layer. Nothing here reads a source tree, so sources.ts, host.ts
 * and steps.ts may all stand on it and it stands on none of them. */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  DEFAULT_PLUGIN, PLUGIN_TOKENS, pluginName, pluginValue, readPlugin,
} from './theme-css.ts';
import type { ArenaConfig, ResolvedPlugins, TokenCatalogue } from './theme-css.ts';
import type { ComponentMap } from './components.ts';
import type { ShippedIcons } from './icon-css.ts';

export const THEME_SHEET = 'arena.generated.css';
export const ICONS_SHEET = 'icons.generated.css';
export const PLUGIN_SHEET = 'plugin.generated.css';
export const PLUGIN_CSS = 'plugin.css';
export const PLUGIN_LAYER = 'arena-plugin';
export const PLUGIN_LAYER_ORDER = '@layer properties;\n@layer theme, base, components, utilities, arena-plugin;\n';
export const COMPONENT_MAP = 'components.json';
export const ICON_MANIFEST = 'icons.json';

export const SHEET_IMPORT = /@import\s+'\.\/([^']+)';/g;

export const CATALOGUE_FILE = 'arena.tokens.json';

export const REFERENCE_DECLARATION = /^--[\w-]+:\s*var\(--color-[\w-]+\)$/;

export function packageCatalogue(root: string): TokenCatalogue | null {
  try {
    return JSON.parse(readFileSync(join(root, CATALOGUE_FILE), 'utf8')) as TokenCatalogue;
  } catch {
    return null;
  }
}

export function roleReferencesIn(catalogue: TokenCatalogue | null): string[] {
  if (!catalogue) return [];
  return Object.entries(catalogue.tokens ?? {})
    .map(([name, value]) => `--${name}:${value};`)
    .filter((d) => REFERENCE_DECLARATION.test(d.replace(/;$/, '')));
}

const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;

export const SCOPE_CLASS = /\.arena-([a-z][a-z0-9]*(?:-[a-z0-9]+)*)/g;

export function scopesIn(css: string) {
  return [...css.replace(CSS_COMMENT, ' ').matchAll(SCOPE_CLASS)].map((m) => m[1] as string);
}

export function pluginCss(sheets: { name: string; css: string; root?: boolean }[]) {
  const carried = sheets.filter(({ css }) => css.trim() !== '');
  if (carried.length === 0) return null;
  const scoped = ({ name, css, root }: { name: string; css: string; root?: boolean }) =>
    (root ? css.trim() : `.arena-${name} {\n${css.trim()}\n}`);
  return `${PLUGIN_LAYER_ORDER}\n@layer ${PLUGIN_LAYER} {\n${carried.map(scoped).join('\n')}\n}\n`;
}

export function pluginSheets(config: ArenaConfig, from: string) {
  const declared = Array.isArray(config.stylePlugins) ? config.stylePlugins : [];
  const out: { name: string; css: string; root: boolean }[] = [];
  declared.forEach((entry, i) => {
    if (typeof entry !== 'string' || entry.trim() === DEFAULT_PLUGIN) return;
    const at = join(resolve(from, entry.trim()), PLUGIN_CSS);
    if (!existsSync(at)) return;
    out.push({ name: pluginName(entry), css: readFileSync(at, 'utf8'), root: i === 0 });
  });
  return out;
}

export function readPlugins(config: ArenaConfig, from: string) {
  const declared = Array.isArray(config.stylePlugins) ? config.stylePlugins : [];
  const plugins: ResolvedPlugins = [];
  const fatal: string[] = [];
  declared.forEach((entry, i) => {
    if (typeof entry !== 'string' || entry.trim() === DEFAULT_PLUGIN) { plugins.push(null); return; }
    const dir = resolve(from, entry.trim());
    const file = join(dir, PLUGIN_TOKENS);
    try {
      plugins.push(readPlugin(pluginName(entry), JSON.parse(readFileSync(file, 'utf8'))));
    } catch (error) {
      plugins.push(null);
      fatal.push(`stylePlugins[${i}]: cannot read ${file}: ${(error as Error).message}. An entry is `
        + `the word "${DEFAULT_PLUGIN}" or a directory of your own holding ${PLUGIN_TOKENS}`);
    }
  });
  return { plugins, fatal };
}

export function iconManifest(root: string): ShippedIcons | null {
  try {
    const manifest = JSON.parse(readFileSync(join(root, ICON_MANIFEST), 'utf8'));
    return manifest && typeof manifest === 'object' && manifest.pairs ? manifest : null;
  } catch {
    return null;
  }
}

export function componentMap(root: string): ComponentMap | null {
  try {
    const map = JSON.parse(readFileSync(join(root, COMPONENT_MAP), 'utf8'));
    return map.match && map.draws ? map : null;
  } catch {
    return null;
  }
}

export function pluginTokenMaps(dirs: string[], catalogue: TokenCatalogue | null) {
  const out = new Map<string, Map<string, string>>();
  const answersOf = (dir: string) => {
    try {
      return readPlugin(pluginName(dir), JSON.parse(readFileSync(join(dir, PLUGIN_TOKENS), 'utf8'))).tokens;
    } catch {
      return {} as Record<string, unknown>;
    }
  };
  const root = new Map<string, string>(Object.entries(catalogue?.tokens ?? {}));
  dirs.forEach((dir, i) => {
    const at = new Map(i === 0 ? root : out.get(dirs[0] ?? '') ?? root);
    for (const [key, raw] of Object.entries(answersOf(dir))) {
      const value = pluginValue(raw, catalogue);
      if (value !== null) at.set(key, value);
    }
    out.set(dir, at);
  });
  return out;
}
