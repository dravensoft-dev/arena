/* Every module under scripts/ a script reaches, so editing a shared library invalidates what
 * imports it. The scan is text, not resolution: importing a script to read its imports runs it,
 * which is the thing the graph is careful never to do outside collection. A specifier inside a
 * string literal is one a generator is WRITING, and an interpolated one names no file at all, so
 * both are dropped rather than resolved; check/arena/script-imports.test.ts reads the same
 * specifiers to prove they resolve, and takes them from here so the pattern is written once. */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { literalRanges, insideLiteral } from '../lib/arena/comments.ts';
import { relPosix } from '../utils/posix-path.ts';

const SPECIFIER = /(?:from|import)\s*\(?\s*['"](\.[^'"]*)['"]/g;

export const isInterpolated = (specifier: string) => specifier.includes('${');

export function relativeSpecifiers(source: string) {
  const literals = literalRanges(source);
  const found = [];
  for (const m of source.matchAll(SPECIFIER)) {
    const spec = m[1] ?? '';
    if (isInterpolated(spec)) continue;
    if (insideLiteral(literals, m.index)) continue;
    found.push(spec);
  }
  return found;
}

export function scriptClosure(entry: string, root: string) {
  const scripts = join(root, 'scripts') + sep;
  const seen = new Set<string>();
  const walk = (path: string) => {
    if (seen.has(path)) return;
    seen.add(path);
    let source;
    try {
      source = readFileSync(path, 'utf8');
    } catch {
      return;
    }
    for (const spec of relativeSpecifiers(source)) {
      const next = join(dirname(path), spec);
      if (!next.startsWith(scripts) || !existsSync(next)) continue;
      walk(next);
    }
  };
  walk(entry);
  return [...seen].map((path) => relPosix(root, path)).sort();
}
