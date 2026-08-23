/* The host separator and the order two names sort in, written down once for this tree. It ships
 * whole into a package of its own, so it reaches no helper in this repository, and a conversion
 * copied beside every caller is how one of them ends up comparing a native path to a posix one.
 * Ordering is by code unit rather than by locale, because a resource list a client reads back has
 * to be the same list on every machine and localeCompare puts a before B on one host and after it
 * on another. */

import { relative, sep } from 'node:path';

export function toPosix(path: string) {
  return path.split(sep).join('/');
}

export function relPosix(base: string, path: string) {
  return toPosix(relative(base, path));
}

export function byCodeUnit(a: string, b: string) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
