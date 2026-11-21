/* Where the command is running: the package around it, the sheets, catalogue, component map and
 * vocabulary that package carries, and the one Phosphor install the command reads: phosphorRoot is
 * @phosphor-icons/core, whose assets/ the sprite is written from. hostPackage answers a path rather
 * than a name because the two steps want different things out of it. resolveEnvironment is the one
 * place an override a caller hands in wins over what the install would answer. A family's sheets per
 * component are listed after the sheets of the components each one needs, so a block that rebinds a
 * drawn part comes after that part's own block, as in the whole sheet. */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, basename, join } from 'node:path';
import { loadVocabulary } from './audit.ts';
import { packageRoot } from './package-root.ts';
import { tailwindRoot } from './dead-utilities.ts';
import type { FontToolRoots } from './font-files.ts';
import type { VocabularyIndex } from './audit.ts';
import { inlineHues, levelDefaults, levelsIn, washesIn } from './levels.ts';
import { SHEET_IMPORT, componentMap, packageCatalogue, aliasesIn, roleReferencesIn, scopesIn } from './sheets.ts';
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

class MissingSheet extends Error {}

const required = (root: string, name: string) => {
  const at = join(root, 'css', name);
  if (!existsSync(at)) {
    throw new MissingSheet(`${root} ships no css/${name}, so a style plugin written beside it would lose the `
      + 'widths and the hero fit that sheet computes on :root. Reinstall the package.');
  }
  return readFileSync(at, 'utf8');
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
    const parts = Object.fromEntries(layers.filter((layer) => /^css\/vocabulary\/[\w-]+\.css$/.test(layer)).flatMap((layer) => {
      const dir = join(root, ...layer.replace(/\.css$/, '').split('/'));
      if (!existsSync(dir)) return [];
      return [[layer, afterNeeds(readdirSync(dir).filter((name) => name.endsWith('.css')).map((name) => basename(name, '.css')).sort(), needsOf(root))]];
    }));
    const levels = [...sheets, ...families].flatMap((css) => levelsIn(css, defaults));
    const washes = [...sheets, ...families].flatMap((css) => washesIn(css, defaults));
    const layerCss = layers.map((layer) => read(join(root, ...layer.split('/'))));
    return {
      layers,
      components,
      ...(Object.keys(parts).length ? { parts } : {}),
      levels,
      washes,
      scopes: [...new Set([...layerCss, ...sheets].flatMap(scopesIn))].sort(),
      roleReferences: roleReferencesIn(catalogue),
      aliases: aliasesIn(catalogue),
      rootOnly: {
        contrast: required(root, 'contrast.css'),
        environment: required(root, 'environment.css'),
      },
      catalogue: catalogue ?? undefined,
    };
  } catch (error) {
    if (error instanceof MissingSheet) throw error;
    return null;
  }
}

function needsOf(root: string): Record<string, string[]> {
  try {
    const map = JSON.parse(readFileSync(join(root, 'components.json'), 'utf8')) as { needs?: Record<string, string[]> };
    return map.needs ?? {};
  } catch {
    return {};
  }
}

export function afterNeeds(names: string[], needs: Record<string, string[]>): string[] {
  const out: string[] = [];
  const place = (name: string, path: string[]) => {
    if (out.includes(name) || path.includes(name)) return;
    for (const need of needs[name] ?? []) if (names.includes(need)) place(need, [...path, name]);
    out.push(name);
  };
  for (const name of names) place(name, []);
  return out;
}

export function phosphorRoot(from = process.cwd(), fallback = here) {
  return packageRoot(['@phosphor-icons', 'core'], from, fallback);
}

export function fontToolRoots(from = process.cwd(), fallback = here) {
  return { harfbuzz: packageRoot(['harfbuzzjs'], from, fallback), wawoff2: packageRoot(['wawoff2'], from, fallback) };
}

export type HostEnvironment = {
  packageName?: string;
  arena?: string | null;
  phosphor?: string | null;
  fontTools?: FontToolRoots;
  sheets?: PackageSheets;
  map?: ComponentMap | null;
  vocabulary?: VocabularyIndex | null;
  tailwind?: string | null;
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
  const fontTools = environment.fontTools ?? fontToolRoots();
  const tailwind = ('tailwind' in environment ? environment.tailwind : tailwindRoot(process.cwd())) ?? null;
  return { arena, packageName, sheets, map, vocabulary, phosphor, fontTools, tailwind };
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
