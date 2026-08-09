/* One spelling of a path a document, a stylesheet or a manifest has to hold, and one of
 * whether a path is under another. Nineteen sites wrote `toPosix` and three spelled it
 * differently. The conversion is for a path that LEAVES this process: an import specifier,
 * a citation, a key in a stamp file, a name in a problem line. A path handed back to node
 * needs none of it, since node takes a forward slash everywhere, so a call is a statement
 * that the result is going somewhere a backslash would be wrong rather than merely
 * different. `isInside` asks through `relative` and never a string prefix, because the two
 * prefix spellings it replaced were each wrong in their own direction: one had no separator
 * boundary and let /repo-evil pass as /repo, the other hardcoded '/' and so refused every
 * nested path on Windows. Both take the path module, so win32 is testable from anywhere. */

import nodePath, { sep } from 'node:path';

export type PathModule = Pick<typeof nodePath, 'relative' | 'isAbsolute' | 'resolve' | 'join' | 'sep'>;

export function toPosix(path: string) {
  return path.split(sep).join('/');
}

export function isInside(base: string, candidate: string, on: PathModule = nodePath) {
  const rel = on.relative(base, candidate);
  if (rel === '') return true;
  if (on.isAbsolute(rel)) return false;
  return !(rel === '..' || rel.startsWith(`..${on.sep}`));
}
