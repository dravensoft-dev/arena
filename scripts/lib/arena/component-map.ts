/* What a consumer writes, and the component sheets it costs. Each package carries one of these so
 * `arena-to-prod` can resolve `"components": "auto"` without guessing: the name in a template is
 * not the name of a sheet, since 43 sheets dress 55 components and a row, an item and a tab wear
 * their parent's. Both layers declare the link the same way, through the manifest a component's
 * styles read, whether it names it directly or reaches it through the sibling that does, so a
 * sheet is derived rather than conventional and a component with neither draws no classes at all,
 * which is what a chart is. `needs` is the other half, closed here where the sources are, so the
 * command only unions: Arena draws components a consumer never names, and a subset missing one is
 * a render with no border and no colour. Each layer gets its own map because they differ in fact:
 * React's confirm dialog renders an ArenaButton, Angular's draws one out of its own manifest. */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo-root.ts';
import { kebab } from '../../utils/case.ts';
import { captured } from '../../utils/captures.ts';
import { byKey } from '../../utils/compare.ts';

export const MAP_FILE = 'components.json';

export const SKIPPED_SOURCE = /\.(test|spec|demo|entry|prompt|card)\.|\.generated\.|\.variants\./;

export const MANIFEST_IMPORT = /import manifest from '[^']*?([A-Za-z0-9]+)\.classes\.generated[^']*'/;
export const VARIANTS_IMPORT = /from '(\.[^']*\.variants)'/;
export const SELECTOR = /selector: '[a-z]*\[?(arena-[a-z0-9-]+)\]?'/g;
export const DECORATOR_IMPORTS = /imports: \[([^\]]*)\]/g;
export const EXPORTED = /export (?:function|const) ([A-Za-z0-9_]+)/g;
export const COMPONENT_NAME = /^[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*$/;
export const LAYER_IMPORT = /from '\.\.\/\.\.\/[a-z-]+\/[a-z-]+\/([A-Z][A-Za-z0-9]*)\.tsx?'/g;
export const QUERIED_MARKER = /contentChild\((Arena[A-Za-z0-9]*)\)/g;
export const MARKERS_FILE = 'frameworks/angular/ProjectionMarkers.ts';

export const DECLARED_MARKER = /@Directive\(\{\s*selector:\s*'\[([A-Za-z][\w-]*)\]'[^}]*\}\)\s*export class (Arena[A-Za-z0-9]*)/g;

export function markerAttributes(root = repoRoot) {
  const source = readFileSync(join(root, MARKERS_FILE), 'utf8');
  const pairs = [...source.matchAll(DECLARED_MARKER)]
    .map((one) => [one[2] ?? '', one[1] ?? ''] as [string, string]);
  if (pairs.length === 0) {
    throw new Error(`component-map: ${MARKERS_FILE} declares no projection marker, so every slot `
      + 'gated on one would go unmapped and the report that catches a missing import would be '
      + 'silent over the whole library');
  }
  return new Map(pairs);
}

export function componentFiles(layer: string, extension: string, root = repoRoot) {
  const base = join(root, 'frameworks', layer, 'components');
  const found: { at: string; file: string; symbol: string }[] = [];
  if (!existsSync(base)) return found;
  const byName = byKey((entry: { name: string }) => entry.name);
  for (const category of readdirSync(base, { withFileTypes: true }).sort(byName)) {
    if (!category.isDirectory()) continue;
    for (const directory of readdirSync(join(base, category.name), { withFileTypes: true }).sort(byName)) {
      if (!directory.isDirectory()) continue;
      const at = join(base, category.name, directory.name);
      for (const name of readdirSync(at).sort()) {
        if (!name.endsWith(extension) || SKIPPED_SOURCE.test(name) || name === `index${extension}`) continue;
        found.push({ at, file: join(at, name), symbol: name.slice(0, -extension.length) });
      }
    }
  }
  return found;
}

export function sheetOf(file: string, source: string) {
  const direct = MANIFEST_IMPORT.exec(source);
  if (direct) return kebab(captured(direct));
  const variants = VARIANTS_IMPORT.exec(source);
  if (!variants) return null;
  for (const extension of ['.ts', '.tsx']) {
    const named = join(file, '..', `${variants[1]}${extension}`);
    if (!existsSync(named)) continue;
    const manifest = MANIFEST_IMPORT.exec(readFileSync(named, 'utf8'));
    return manifest ? kebab(captured(manifest)) : null;
  }
  return null;
}

export function close(needs: ComponentSheetMap['needs']): ComponentSheetMap['needs'] {
  const closed: ComponentSheetMap['needs'] = {};
  for (const sheet of Object.keys(needs)) {
    const reached = new Set<string>();
    const pending = [...(needs[sheet] ?? [])];
    while (pending.length) {
      const one = pending.pop();
      if (one === undefined || one === sheet || reached.has(one)) continue;
      reached.add(one);
      pending.push(...(needs[one] ?? []));
    }
    if (reached.size) closed[sheet] = [...reached].sort();
  }
  return closed;
}

function mapFrom(
  entries: { symbol: string; keys: string[]; sheet: string | null; uses: string[]; markers?: string[] }[],
  edges: string,
) {
  const draws: ComponentSheetMap['draws'] = {};
  const needs: ComponentSheetMap['needs'] = {};
  const markers: ComponentSheetMap['markers'] = {};
  for (const { keys, sheet } of entries) {
    for (const key of keys) draws[key] = sheet;
  }
  for (const { keys, markers: queried } of entries) {
    if (!queried?.length) continue;
    for (const key of keys) markers[key] = [...queried].sort();
  }
  for (const { symbol, sheet, uses } of entries) {
    if (!sheet) continue;
    const bySymbol = new Map(entries.map((e) => [e.symbol, e.sheet]));
    const pulled = uses
      .map((name: string) => bySymbol.get(name))
      .filter((s): s is string => Boolean(s) && s !== sheet);
    if (pulled.length) needs[sheet] = [...new Set([...(needs[sheet] ?? []), ...pulled])].sort();
  }
  return { match: edges, draws, needs: close(needs), markers };
}

export function angularComponentMap(root = repoRoot) {
  const attributes = markerAttributes(root);
  const entries = componentFiles('angular', '.ts', root).map(({ file, symbol }) => {
    const source = readFileSync(file, 'utf8');
    return {
      symbol,
      keys: [...source.matchAll(SELECTOR)].map((m) => captured(m)),
      sheet: sheetOf(file, source),
      uses: [...source.matchAll(DECORATOR_IMPORTS)]
        .flatMap((m) => captured(m).split(',').map((name) => name.trim()))
        .filter((name) => /^[A-Z][A-Za-z0-9]*$/.test(name)),
      markers: [...new Set([...source.matchAll(QUERIED_MARKER)]
        .map((m) => attributes.get(captured(m)))
        .filter((attribute): attribute is string => Boolean(attribute)))],
    };
  });
  const map = mapFrom(entries.filter((e) => e.keys.length), 'selector');
  return { ...map, markerDirectives: Object.fromEntries([...attributes].map(([c, a]) => [a, c])) };
}

export function reactComponentMap(root = repoRoot) {
  const entries = componentFiles('react', '.tsx', root).map(({ file, symbol }) => {
    const source = readFileSync(file, 'utf8');
    return {
      symbol,
      keys: [...source.matchAll(EXPORTED)].map((m) => captured(m)).filter((name) => COMPONENT_NAME.test(name)),
      sheet: sheetOf(file, source),
      uses: [...source.matchAll(LAYER_IMPORT)].map((m) => captured(m)),
    };
  });
  return mapFrom(entries.filter((e) => e.keys.length), 'symbol');
}

export type ComponentSheetMap = {
  match: string;
  draws: Record<string, string | null>;
  needs: Record<string, string[]>;
  markers: Record<string, string[]>;
  markerDirectives?: Record<string, string>;
};

export function componentMap(layer: string, root = repoRoot): ComponentSheetMap {
  if (layer === 'angular') return angularComponentMap(root);
  if (layer === 'react') return reactComponentMap(root);
  throw new Error(`component-map: no map is derived for a layer called "${layer}"`);
}
