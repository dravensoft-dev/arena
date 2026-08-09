/* One spelling of a path that LEAVES this process -- an import specifier, a citation, a key in a
 * stamp file, a name in a problem line -- and one of whether a path is under another. Nineteen
 * sites wrote `toPosix` and three spelled it differently. A path handed back to node needs none
 * of it, since node reads a forward slash everywhere, so a call says the result goes somewhere a
 * backslash would be wrong rather than merely different. `relPosix` is the repo-relative case,
 * spelled once because `relative` answers in the host separator and two calls let a caller drop
 * the second: that is how a manifest key reached five readers that split it on '/'. `isInside`
 * asks through `relative` and never a string prefix, the two spellings it replaced being wrong in
 * opposite directions -- one had no separator boundary and let /repo-evil pass as /repo, the
 * other hardcoded '/' and refused every nested path on Windows. All three take the path module. */

import nodePath from 'node:path';

export type PathModule = Pick<typeof nodePath, 'relative' | 'isAbsolute' | 'resolve' | 'join' | 'sep'>;

export function toPosix(path: string, on: PathModule = nodePath) {
  return path.split(on.sep).join('/');
}

export function relPosix(base: string, target: string, on: PathModule = nodePath) {
  return toPosix(on.relative(base, target), on);
}

export function isInside(base: string, candidate: string, on: PathModule = nodePath) {
  const rel = on.relative(base, candidate);
  if (rel === '') return true;
  if (on.isAbsolute(rel)) return false;
  return !(rel === '..' || rel.startsWith(`..${on.sep}`));
}
