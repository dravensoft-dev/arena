/* A directory walk, and nothing about Arena. Thirty-three copies under scripts/ wrote the same
 * three lines: recurse, collect the files, decide what to descend into. `skip` is asked about
 * every entry, a file and a directory alike, because that is the shape twenty of those copies
 * already had, and it is what lets one predicate carry a dotfile rule, a name list and an
 * anchored path at once. Each level is read in sorted order, by code unit rather than by
 * locale, so a walk is the same on every machine and a comparison against one is not reading
 * the filesystem's hash order. A missing root throws, as readdirSync does: whether an absent
 * tree is a legitimate state or a typo is the caller's knowledge, and a walk answering [] of
 * its own accord turns the second into a clean-looking pass over nothing. */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { byKey } from './compare.ts';

export type WalkOptions = { skip?: (name: string, path: string) => boolean };

export function walkFiles(dir: string, options: WalkOptions = {}): string[] {
  const found: string[] = [];
  const walk = (at: string) => {
    const entries = readdirSync(at, { withFileTypes: true }).sort(byKey((entry) => entry.name));
    for (const entry of entries) {
      const path = join(at, entry.name);
      if (options.skip?.(entry.name, path)) continue;
      if (entry.isDirectory()) walk(path);
      else found.push(path);
    }
  };
  walk(dir);
  return found;
}
