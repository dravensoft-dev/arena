/* The glyphs a layer's own components draw, computed here and shipped beside the component map so
 * a consumer's build reads them instead of searching the installed package for text. A text search
 * cannot tell a render from a sentence about one: `ArenaIconButton.icon` documents itself with
 * `'ph-bold ph-plus'`, that doc ships, and every project drawing no plus was sent a plus rule.
 * Comments come out through the compiler rather than a regex, because a sentence is exactly what
 * has to go. The subject is what the assembly copies out of a component directory, so a file that
 * stops shipping stops counting, and anything outside one is not a render however many glyph names
 * it holds: a role table is a reference a consumer reads, not a thing Arena draws. */

import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { scan } from '../../generate/core/arena-cli/icon-css.ts';
import type { IconScan, ShippedIcons, ShippedIconMap } from '../../generate/core/arena-cli/icon-css.ts';
import { ICON_MANIFEST as MANIFEST_FILE } from '../../generate/core/arena-cli/sheets.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { keysByDirectory } from './component-map.ts';
import { collectFiles } from './package-assembly.ts';
import { repoRoot } from './repo-root.ts';

export const SCANNED_EXTENSIONS = ['.ts', '.tsx'];

export { MANIFEST_FILE };

export function withoutComments(source: string, path: string) {
  return transpileModule(source, {
    fileName: path,
    reportDiagnostics: false,
    compilerOptions: { removeComments: true, target: ScriptTarget.Latest, module: ModuleKind.ESNext },
  }).outputText;
}

export function componentsDir(layer: string, root = repoRoot) {
  return join(root, 'frameworks', layer, 'components');
}

export function renderFiles(layer: string, root = repoRoot) {
  return collectFiles(componentsDir(layer, root),
    (path) => SCANNED_EXTENSIONS.some((ext) => path.endsWith(ext)));
}

export function serialise(found: IconScan): ShippedIcons {
  const pairs: Record<string, string[]> = {};
  for (const [weight, glyphs] of [...found.pairs].sort()) pairs[weight] = [...glyphs].sort();
  return { pairs, loose: [...found.loose].sort() };
}

const SWAPS = /\barenaActiveWeight\b/;

export function iconManifest(layer: string, root = repoRoot): ShippedIconMap {
  const base = componentsDir(layer, root);
  const keys = new Map([...keysByDirectory(layer, root)].map(([at, named]) => [relPosix(base, at), named]));
  const found = new Map<string, IconScan>();
  const swaps = new Set<string>();
  for (const path of renderFiles(layer, root)) {
    const parts = relPosix(base, path).split('/');
    if (parts.length < 3) continue;
    const at = parts.slice(0, 2).join('/');
    const source = withoutComments(readFileSync(path, 'utf8'), basename(path));
    found.set(at, scan(source, found.get(at) ?? { pairs: new Map(), loose: new Set() }));
    if (SWAPS.test(source)) swaps.add(at);
  }
  const components: Record<string, ShippedIcons> = {};
  const fills = new Set<string>();
  for (const [at, scanned] of [...found].sort()) {
    const named = keys.get(at);
    const icons = serialise(scanned);
    const names = icons.loose.length > 0 || Object.keys(icons.pairs).length > 0;
    if (!named && names) {
      throw new Error(`icon-manifest: ${layer}/components/${at} names glyphs and holds no component, so no build `
        + 'could tell which screen draws them');
    }
    for (const key of named ?? []) {
      if (names) components[key] = icons;
      if (swaps.has(at)) fills.add(key);
    }
  }
  return {
    components: Object.fromEntries(Object.entries(components).sort(([a], [b]) => (a < b ? -1 : 1))),
    fills: [...fills].sort(),
  };
}
