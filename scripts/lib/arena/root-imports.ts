/* Which root-level modules of a layer import a component. A root module that imports a component pulls
 * it into whatever chunk the root lands in, so the components could not chunk apart from the root. The
 * row window is the one exception: only the table imports it, so it never joins two components. */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { captured } from '../../utils/captures.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot } from './repo-root.ts';

const SPECIFIER = /(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g;
const SOURCE = /\.(tsx?|jsx?|mjs)$/;
const SKIPPED = /\.(generated|test|spec)\.|\.d\.ts$/;

const ROW_WINDOW = "the row window measures the table's own geometry, and only the table imports it, so it never pulls another component into a shared chunk";

export const ALLOWED_ROOT_IMPORTS: Record<string, string> = {
  'UseArenaRowWindow.ts': ROW_WINDOW,
  'RowWindow.ts': ROW_WINDOW,
};

export function rootComponentImports(layer: 'react' | 'angular', root: string = repoRoot): { file: string; specifier: string }[] {
  const base = join(root, 'frameworks', layer);
  if (!existsSync(base)) return [];
  const prefix = `frameworks/${layer}/components/`;
  const found: { file: string; specifier: string }[] = [];
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isFile() || !SOURCE.test(entry.name) || SKIPPED.test(entry.name)) continue;
    const path = join(base, entry.name);
    for (const m of readFileSync(path, 'utf8').matchAll(SPECIFIER)) {
      const specifier = captured(m);
      if (relPosix(root, resolve(dirname(path), specifier)).startsWith(prefix)) found.push({ file: entry.name, specifier });
    }
  }
  return found;
}
