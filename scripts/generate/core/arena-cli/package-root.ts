/* Where an installed package sits: the nearest node_modules/<name> above a start directory that
 * holds a package.json, tried from the command's own directory first and from the project second,
 * so a project's copy of a dependency never shadows the version the command was written against.
 * host.ts finds @phosphor-icons/core with it, and font-files.ts finds harfbuzzjs and wawoff2.
 * Imports only node built-ins, because the CLI ships as bin/*.mjs and carries nothing from outside. */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export function packageRoot(segments: string[], from: string, fallback: string) {
  for (const start of [fallback, from]) {
    let at = resolve(start);
    for (;;) {
      const candidate = join(at, 'node_modules', ...segments);
      if (existsSync(join(candidate, 'package.json'))) return candidate;
      const up = dirname(at);
      if (up === at) break;
      at = up;
    }
  }
  return null;
}
