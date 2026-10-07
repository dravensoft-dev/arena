/* The host separator, written down once for the CLI tree. Everything under this directory is
 * copied whole into bin/, so it cannot import the repository's own posix helper without climbing
 * out of a package, and a second copy of the conversion beside every caller is how one of them
 * ends up comparing a native path to a posix one. A repo-relative path is posix everywhere it is
 * read back, so a conversion lives here and the callers ask for the answer. */

import { relative, sep } from 'node:path';

export function toPosix(path: string, separator = sep) {
  return path.split(separator).join('/');
}

export function relativeFrom(outDir: string, target: string) {
  const path = toPosix(relative(outDir, target));
  return path.startsWith('.') ? path : `./${path}`;
}

export function relPosix(from: string, to: string) {
  const out = toPosix(relative(from, to));
  return out === '' ? '.' : out;
}
