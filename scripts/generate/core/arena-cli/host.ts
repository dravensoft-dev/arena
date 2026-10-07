/* Where the command is running: the package around it, the sheets, catalogue, component map and
 * vocabulary that package carries, and the Phosphor install a project holds. hostPackage answers a
 * path rather than a name because the two steps want different things out of it. resolveEnvironment
 * is the one place an override a caller hands in wins over what the install would answer. */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, basename, join, resolve } from 'node:path';
import { loadVocabulary } from './audit.ts';
import type { VocabularyIndex } from './audit.ts';
import { inlineHues, levelDefaults, levelsIn, washesIn } from './levels.ts';
import { SHEET_IMPORT, componentMap, packageCatalogue, roleReferencesIn, scopesIn } from './sheets.ts';
import type { PackageSheets } from './theme-css.ts';
import type { ComponentMap } from './components.ts';

const here = dirname(fileURLToPath(import.meta.url));

export function hostPackage(dir = here) {
  try {
    const root = join(dir, '..');
    return /^@dravensoft\/arena-/.test(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name) ? root : null;
  } catch {
    return null;
  }
}

export function hostPackageName(root: string) {
  try {
    return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name;
  } catch {
    return null;
  }
}

const read = (at: string) => {
  try { return readFileSync(at, 'utf8'); } catch { return ''; }
};

export function packageSheets(root: string): PackageSheets {
  try {
    const layers = [...readFileSync(join(root, 'arena.css'), 'utf8').matchAll(SHEET_IMPORT)]
      .map((m) => m[1] ?? '');
    const components = readdirSync(join(root, 'css', 'components'))
      .filter((name) => name.endsWith('.css'))
      .map((name) => basename(name, '.css'))
      .sort();
    if (!layers.length || !components.length) return null;
    const catalogue = packageCatalogue(root);
    const defaults = levelDefaults(read(join(root, 'css', 'colors.css')));
    const roles = new Map<string, string>();
    for (const [, name, value] of read(join(root, 'css', 'style-plugin-default.css'))
      .matchAll(/--(hue-[\w-]+)\s*:\s*([^;]+);/g)) if (!roles.has(name as string)) roles.set(name as string, (value as string).trim());
    const held = Object.fromEntries(Object.entries(defaults).map(([name, percent]) => [name, `${percent}%`]));
    const sheets = components.map((name) => inlineHues(
      readFileSync(join(root, 'css', 'components', `${name}.css`), 'utf8'),
      read(join(root, 'css', 'hues', `${name}.css`)), roles, held));
    const familyDir = join(root, 'css', 'vocabulary');
    const families = existsSync(familyDir)
      ? readdirSync(familyDir).filter((name) => name.endsWith('.css')).sort().map((name) => read(join(familyDir, name)))
      : [];
    const levels = [...sheets, ...families].flatMap((css) => levelsIn(css, defaults));
    const washes = [...sheets, ...families].flatMap((css) => washesIn(css, defaults));
    const layerCss = layers.map((layer) => read(join(root, ...layer.split('/'))));
    return {
      layers,
      components,
      levels,
      washes,
      scopes: [...new Set([...layerCss, ...sheets].flatMap(scopesIn))].sort(),
      roleReferences: roleReferencesIn(catalogue),
      catalogue: catalogue ?? undefined,
    };
  } catch {
    return null;
  }
}

export function phosphorRoot(from = process.cwd(), fallback = here) {
  for (const start of [from, fallback]) {
    let at = resolve(start);
    for (;;) {
      const candidate = join(at, 'node_modules', '@phosphor-icons', 'web');
      if (existsSync(join(candidate, 'package.json'))) return candidate;
      const up = dirname(at);
      if (up === at) break;
      at = up;
    }
  }
  return null;
}

export type HostEnvironment = {
  packageName?: string;
  arena?: string | null;
  phosphor?: string | null;
  sheets?: PackageSheets;
  map?: ComponentMap | null;
  vocabulary?: VocabularyIndex | null;
};

export function resolveEnvironment(environment: HostEnvironment = {}) {
  const arena = ('arena' in environment ? environment.arena : hostPackage()) ?? null;

  const packageName = environment.packageName
    ?? (arena ? hostPackageName(arena) : null)
    ?? '@dravensoft/arena-react';
  const sheets = ('sheets' in environment ? environment.sheets : (arena ? packageSheets(arena) : null)) ?? null;
  const map = ('map' in environment ? environment.map : (arena ? componentMap(arena) : null)) ?? null;
  const vocabulary: VocabularyIndex | null = environment.vocabulary !== undefined
    ? environment.vocabulary : (arena ? loadVocabulary(arena) : null);
  const phosphor = ('phosphor' in environment ? environment.phosphor : phosphorRoot()) ?? null;
  return { arena, packageName, sheets, map, vocabulary, phosphor };
}

export function hostManifest(root: string | null): { name: string; version: string; engines?: { node?: string } } | null {
  if (!root) return null;
  try {
    const { name, version, engines } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    if (typeof name !== 'string' || typeof version !== 'string') return null;
    return engines && typeof engines === 'object' ? { name, version, engines } : { name, version };
  } catch {
    return null;
  }
}
